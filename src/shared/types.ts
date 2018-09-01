import BigNumber from 'bignumber.js';

export type UserId = string;
export type GroupId = string;
export type CategoryId = string;
export type FrameIndex = number;

// Corresponds to `users` db table
export interface User {
    uid: UserId;
    email: string;
    password_hash: string;
}

export class Money {
    private num: BigNumber;
    constructor(value: BigNumber.Value) {
        this.num = new BigNumber(value);
    }
    static Zero = new Money(0);
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

export interface Category {
    id: CategoryId;
    gid: GroupId;
    frame: FrameIndex;
    alive: boolean;
    name: string;
    ordering: number;
    budget: Money;
    balance: Money;
}

// Corresponds to `frames` db table joined on `categories`
export interface Frame {
    gid: GroupId;
    index: FrameIndex;
    balance: Money;
    income: Money;
    categories?: Category[];
}