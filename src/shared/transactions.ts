import {Transaction, Share, NormalizedShare} from '../shared/types';
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
    if (row.split) {
        if (row.split.myShare) {
            transaction.split.myShare = new Share(row.split.myShare);
        }
        if (row.split.theirShare) {
            transaction.split.theirShare = new Share(row.split.theirShare);
        }
        if (row.split.otherAmount) {
            transaction.split.otherAmount = new Money(row.split.otherAmount);
        }
    }
    return transaction;
}

export function distributeTotal(total: Money, s1: Share, s2: Share): [Money, Money] {
    const [newS1, _] = Share.normalize(s1, s2);
    const a1 = newS1.of(total)
    const a2 = total.minus(a1);
    return [a1, a2];
}

/* Never calculate an amount using shares if you don't have the total. */
/* Never calculate the total if you don't have both amounts. */
