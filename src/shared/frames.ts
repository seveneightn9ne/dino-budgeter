import {Frame, FrameIndex, Money} from './types';
import * as util from './util';
import * as categories from './categories';

export function index(month: number, year: number): FrameIndex {
    return (year - 1970) * 12 + month;
}

export function month(frame: Frame): number {
    return frame.index % 12;
}

export function year(frame: Frame): number {
    return Math.floor(frame.index / 12) + 1970;
}

export function updateBalanceWithIncome(balance: Money, income: Money, newIncome: Money): Money {
return balance.minus(income).plus(newIncome);
}

/** Works with a DB row or a JSON parsed object */
export function fromSerialized(row: any): Frame {
    if (!row) {
        return null;
    }
    const frame: Frame = {...row};
    if (row.income) {
        frame.income = new Money(row.income);
    }
    if (row.balance) {
        frame.balance = new Money(row.balance);
    }
    if (row.categories) {
        frame.categories = row.categories.map(categories.fromSerialized);
    }
    return frame;
}