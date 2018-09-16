import {TransactionId, Transaction, FrameIndex, User, GroupId} from '../shared/types';
import Money from '../shared/Money';
import pgPromise from 'pg-promise';
export * from '../shared/transactions';

export function getTransaction(id: TransactionId, t: pgPromise.ITask<{}>): Promise<Transaction> {
    return t.one("select * from transactions where id = $1", [id]).then(row => {
        return {
            id: row.id,
            gid: row.gid,
            frame: row.frame,
            category: row.category,
            amount: new Money(row.amount),
            description: row.description,
            alive: row.alive,
            date: row.date,
        };
    });
}

export async function getTransactions(frame: FrameIndex, gid: GroupId, t: pgPromise.ITask<{}>): Promise<Transaction[]> {
    const rows = await t.manyOrNone("select id,category,amount,description,category,date \
    from transactions \
    where gid=$1 \
    and frame=$2 \
    and alive order by date asc", [gid, frame]);
    return rows || [];
}