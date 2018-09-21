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
        if (row.split.otherAmount) {
            transaction.split.otherAmount = new Money(row.split.otherAmount);
        }
    }
    return transaction;
}

export function sharesFromAmounts(a1: Money, a2: Money): NormalizedShare[] {
    return Share.normalize(a1.asShare(), a2.asShare());
}

export function distributeTotal(newTotal: Money, a1: Money, a2: Money): [Money, Money] {
    const ratio = newTotal.dividedBy(a1.plus(a2));
    const newA1 = a1.times(ratio);
    const newA2 = newTotal.minus(newA1);
    return [newA1, newA2];
}

export function shareFromAmounts(myAmount: Money, otherAmount: Money): NormalizedShare {
    return sharesFromAmounts(myAmount, otherAmount)[0];
}