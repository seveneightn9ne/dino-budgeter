import BigNumber from "bignumber.js";

export default class Money {
    public num: BigNumber; // really it's private. Don't touch.
    constructor(value: BigNumber.Value) {
        this.num = new BigNumber(value);
    }
    static Zero = new Money(0);
    static sum(ms: Money[]): Money {
        return ms.reduce((a: Money, b: Money) => a.plus(b), Money.Zero);
    }
    string(): string {
        return this.num.toFixed(2);
    }
    toJSON(): string {
        return this.string();
    }
    formatted(): string {
        const money = this.string();
        let dollars = money;
        let cents = "00";
        if (money.indexOf(".") > -1) {
            [dollars, cents] = money.split(".");
        }
        if (cents.length < 2) {
            cents = cents + "0";
        }
        return "$" + dollars + "." + cents;
    }
    plus(other: Money): Money {
        return new Money(this.num.plus(other.num));
    }
    minus(other: Money): Money {
        return new Money(this.num.minus(other.num));
    }
    cmp(other: Money): number {
        return this.num.comparedTo(other.num);
    }
    negate(): Money {
        return new Money(this.num.times(-1));
    }

    times(s: Money): Money {
        return new Money(this.num.times(s.num));
    }
    dividedBy(s: Money): Money {
        return new Money(this.num.dividedBy(s.num));
    }

    isValid(allowNegative: boolean = true): boolean {
        if (!this.num.isFinite()) {
            return false;
        }
        if (!allowNegative && this.num.isNegative()) {
            return false;
        }
        return true;
    }
}