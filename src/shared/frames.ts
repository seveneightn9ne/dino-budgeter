import {Frame, FrameIndex, Money} from './types';
import * as util from './util';

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
return util.add(util.subtract(balance, income), newIncome);
}