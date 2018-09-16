import {Transaction} from '../shared/types';
import Money from '../shared/Money';
export function fromSerialized(row: any): Transaction {
    if (!row) {
        return null;
    }
    const transaction: Transaction = {...row};
    if (row.amount) {
        transaction.amount = new Money(row.amount);
    }
    if (row.date) {
        transaction.date = new Date(row.date);
    }
    return transaction;
}