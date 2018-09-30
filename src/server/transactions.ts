import {TransactionId, Transaction, FrameIndex, SplitId, GroupId, Share, UserId} from '../shared/types';
import Money from '../shared/Money';
import pgPromise from 'pg-promise';
export * from '../shared/transactions';

async function getTransactionsInner(where: {id: TransactionId} | {frame: FrameIndex, gid: GroupId}, t: pgPromise.ITask<{}>): Promise<Transaction[]> {
    const whereClause = 'id' in where ? "T.id = $1" : "T.gid = $1 and T.frame = $2";
    const vars = 'id' in where ? [where.id] : [where.gid, where.frame];
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
            U2.email as other_email from transactions T
        left join transaction_splits TS on T.id = TS.tid
        left join shared_transactions S on TS.sid = S.id
        left join transaction_splits TS2 on TS2.sid = TS.sid and TS2.tid != TS.tid
        left join transactions T2 on T2.id = TS2.tid and T2.id != T.id
        left join membership M2 on M2.gid = T2.gid
        left join users U2 on U2.uid = M2.uid
        where ${whereClause};`, vars);
    return rows.map(row => {
        const split = row.sid ? {
            id: row.sid,
            with: {
                uid: row.other_uid,
                gid: row.other_gid,
                email: row.other_email,
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
    return getTransactionsInner({frame, gid}, t);
}

export async function getOtherTid(tid: TransactionId, sid: SplitId, t: pgPromise.ITask<{}>): Promise<Transaction> {
    const row = await t.one("select tid from transaction_splits where sid = $1 and tid != $2", [sid, tid]);
    return row.tid;
}

export async function canUserEdit(tid: TransactionId, uid: UserId, t: pgPromise.ITask<{}>): Promise<boolean> {
    const row = await t.one(`select count(*) > 0 as exists
        from membership left join transactions
            on membership.gid = transactions.gid
        where transactions.id = $1 and membership.uid = $2`, [tid, uid]);
    return row.exists;
}

export async function deleteTransaction(tid: TransactionId, t: pgPromise.ITask<{}>): Promise<void> {
    const linkedTxnRow = await t.oneOrNone(`select TS2.tid from transactions T
        left join transaction_splits TS
            on T.id = TS.tid
        left join transaction_splits TS2
            on TS2.sid = TS.sid
            and TS2.tid != TS.tid
        where T.id = $1`, [tid]);
    const deleteQuery = "update transactions set alive = false where id = $1";
    if (linkedTxnRow) {
        await t.none(deleteQuery, [linkedTxnRow.tid]);
    }
    await t.none(deleteQuery, [tid]);
}