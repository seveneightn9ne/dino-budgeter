import {Money, TransactionId, Transaction} from '../shared/types';
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
