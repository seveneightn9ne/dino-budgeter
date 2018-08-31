
import randomstring from 'randomstring';
import BigNumber from 'bignumber.js';
import { Money } from './types';

export function randomId() {
    return randomstring.generate({length: 32, capitalization: 'lowercase'});
}

export function validateAmount(amount: string, allowNegative?: boolean): string {
    var v = new BigNumber(amount);
    if (!v.isFinite()) {
        throw new Error(`invalid amount ${amount}`)
    }
    if (!allowNegative && v.isNegative()) {
        throw new Error(`unexpected negative amount ${amount}`)
    }
    return v.toFixed(2);
}

export function add(a: Money, b: Money): Money {
    const aNum = new BigNumber(a);
    const bNum = new BigNumber(b);
    return aNum.plus(bNum).toFixed(2);
}

export function subtract(a: Money, b: Money): Money {
    const aNum = new BigNumber(a);
    const bNum = new BigNumber(b);
    return aNum.minus(bNum).toFixed(2);
}