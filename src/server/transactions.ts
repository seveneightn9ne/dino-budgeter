import pgPromise from "pg-promise";
import Money from "../shared/Money";
import { FrameIndex, GroupId, Share, SplitId, Transaction, TransactionId, UserId } from "../shared/types";
import { addToBalance } from "./payments";
export * from "../shared/transactions";
import { getBalance } from "../shared/transactions";

type IDQuery = {id: TransactionId};
type FrameQuery = {
    frame: FrameIndex,
    gid: GroupId,
    alive: boolean,
};
type SettledQuery = {
    uid: UserId,
    settled: boolean,
    alive: boolean,
};
type Query = IDQuery | FrameQuery | SettledQuery;
function whereClause(query: Query) {
    return "id" in query ? "T.id = $1" :
        "frame" in query ? "T.gid = $1 and T.frame = $2 and T.alive = $3" :
        /* settled */ "U.uid = $1 and S.settled = $2 and T.alive = $3";
}
function vars(where: Query) {
    return "id" in where ? [where.id] :
        "frame" in where ? [where.gid, where.frame, where.alive] :
        /* settled */ [where.uid, where.settled, where.alive];
}
async function getTransactionsInner(where: Query, t: pgPromise.ITask<{}>): Promise<Transaction[]> {
    const rows = await t.any(`select
            T.*,
            TS.sid,
            TS.share,
            TS2.share as other_share,
            S.payer,
            S.settled,
            T2.gid as other_gid,
            T2.amount as other_amount,
            U2.uid as other_uid,
            U2.email as other_email,
            U2.name as other_name from transactions T
        left join membership M on M.gid = T.gid
        left join users U on U.uid = M.uid
        left join transaction_splits TS on T.id = TS.tid
        left join shared_transactions S on TS.sid = S.id
        left join transaction_splits TS2 on TS2.sid = TS.sid and TS2.tid != TS.tid
        left join transactions T2 on T2.id = TS2.tid and T2.id != T.id
        left join membership M2 on M2.gid = T2.gid
        left join users U2 on U2.uid = M2.uid
        where ${whereClause(where)};`, vars(where));
    return rows.map(row => {
        const split = row.sid ? {
            id: row.sid,
            with: {
                uid: row.other_uid,
                gid: row.other_gid,
                email: row.other_email,
                name: row.other_name,
            },
            myShare: new Share(row.share),
            theirShare: new Share(row.other_share),
            settled: row.settled,
            payer: row.payer,
            otherAmount: new Money(row.other_amount),
        } : undefined;
        return {
            id: row.id,
            gid: row.gid,
            frame: row.frame,
            category: row.category,
            amount: new Money(row.amount),
            description: row.description,
            alive: row.alive,
            date: row.date,
            split: split,
        };
    });
}

export async function getTransaction(id: TransactionId, t: pgPromise.ITask<{}>): Promise<Transaction> {
    return (await getTransactionsInner({id}, t))[0];
}

export async function getTransactions(frame: FrameIndex, gid: GroupId, t: pgPromise.ITask<{}>): Promise<Transaction[]> {
    return getTransactionsInner({frame, gid, alive: true}, t);
}

export async function getUnsettledTransactions(uid: UserId, t: pgPromise.ITask<{}>): Promise<Transaction[]> {
    return getTransactionsInner({uid, settled: false, alive: true}, t);
}

export async function getOtherTid(tid: TransactionId, sid: SplitId, t: pgPromise.ITask<{}>): Promise<TransactionId> {
    const row = await t.one("select tid from transaction_splits where sid = $1 and tid != $2", [sid, tid]);
    return row.tid;
}

export async function getUser(tid: TransactionId, t: pgPromise.ITask<{}>): Promise<UserId> {
    const row = await t.one("select M.uid from transactions T left join membership M on T.gid = M.gid where T.id = $1", [tid]);
    return row.uid;
}

export async function canUserEdit(tid: TransactionId, uid: UserId, t: pgPromise.ITask<{}>): Promise<boolean> {
    const row = await t.one(`select count(*) > 0 as exists
        from membership left join transactions
            on membership.gid = transactions.gid
        where transactions.id = $1 and membership.uid = $2`, [tid, uid]);
    return row.exists;
}

export async function deleteTransaction(tid: TransactionId, t: pgPromise.ITask<{}>): Promise<void> {
    const linkedTxnRow = await t.oneOrNone(`select TS2.tid, M.uid, M2.uid as other_uid from transactions T
        left join transaction_splits TS
            on T.id = TS.tid
        left join transaction_splits TS2
            on TS2.sid = TS.sid
            and TS2.tid != TS.tid
        left join membership M
            on T.gid = M.gid
        left join transactions T2
            on T2.id = TS2.tid
        left join membership M2
            on M2.gid = T2.gid
        where T.id = $1`, [tid]);
    const deleteQuery = "update transactions set alive = false where id = $1";
    if (linkedTxnRow && linkedTxnRow.tid) {
        const balance = await getBalanceFromDb(tid, t);
        await addToBalance(linkedTxnRow.uid, linkedTxnRow.other_uid, balance.negate(), t);
        await t.none(deleteQuery, [linkedTxnRow.tid]);
    }
    await t.none(deleteQuery, [tid]);
}

export async function getSid(tid: TransactionId, t: pgPromise.ITask<{}>): Promise<SplitId> {
    const row = await t.oneOrNone("select sid from transaction_splits where tid = $1", [tid]);
    return row ? row.sid : null;
}

export async function settle(sid: SplitId, t: pgPromise.ITask<{}>): Promise<void> {
    return await t.none("update shared_transactions set settled = true where id = $1", [sid]);
}

export async function getBalanceFromDb(tid: TransactionId, t: pgPromise.ITask<{}>): Promise<Money> {
    const row = await t.one(`select T.amount, M.uid, T2.amount as other_amount, M2.uid as other_uid, S.payer
        from transactions T
        left join membership M on M.gid = T.gid
        left join transaction_splits TS on T.id = TS.tid
        left join shared_transactions S on TS.sid = S.id
        left join transaction_splits TS2 on TS2.sid = TS.sid and TS2.tid != TS.tid
        left join transactions T2 on T2.id = TS2.tid and T2.id != T.id
        left join membership M2 on M2.gid = T2.gid
        where T.id = $1`, [tid]);
    return getBalance({
        user: row.uid,
        otherUser: row.other_uid,
        payer: row.payer,
        amount: new Money(row.amount),
        otherAmount: new Money(row.other_amount),
    });
}