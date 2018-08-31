import {Money} from '../shared/types';
export * from '../shared/util';

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatMoney(money: Money): string {
    let dollars: string = money;
    let cents = "00";
    if (money.indexOf(".") > -1) {
        [dollars, cents] = money.split(".");
    }
    if (cents.length < 2) {
        cents = cents + "0";
    }
    return "$" + dollars + "." + cents;
}