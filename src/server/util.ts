
import randomstring from 'randomstring';
import BigNumber from 'bignumber.js';

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
