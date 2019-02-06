import Money from "./Money";

export type UserId = string;
export type GroupId = string;
export type CategoryId = string;
export type FrameIndex = number;
export type TransactionId = string;
export type SplitId = string;

// Corresponds to `users` db table
export interface User {
    uid: UserId;
    name: string;
    email: string;
    password_hash: string;
}

// Corresponds to `categories` db table, plus `balance`
export interface Category {
    id: CategoryId;
    gid: GroupId;
    frame: FrameIndex;
    alive: boolean;
    name: string;
    ordering: number;
    budget: Money;
    balance?: Money;
}

// Corresponds to `frames` db table joined on `categories`, plus `balance` and `spending`
export interface Frame {
    gid: GroupId;
    index: FrameIndex;
    income: Money;
    categories?: Category[];
    balance?: Money;
    spending?: Money;
}

// Corresponds to `transactions` db table plus shared_transaction data
export interface Transaction {
    id: TransactionId;
    gid: GroupId;
    frame: FrameIndex;
    category: CategoryId | null;
    amount: Money;
    description: string;
    alive: boolean;
    date: Date;
    split?: {
        id: SplitId;
        with: Friend;
        payer: UserId;
        settled: boolean;
        myShare: Share;
        theirShare: Share;
        otherAmount: Money;
    };
}

export interface Friend {
    uid: UserId;
    gid: GroupId;
    email: string;
    name: string;
}

export interface InitState {
    frame?: Frame;
    categories?: Category[];
    friends?: Friend[];
    pendingFriends?: Friend[];
    invites?: Friend[];
    transactions?: Transaction[];
    debts?: {[email: string]: {
        balance: Money,
        payments: (Payment | Charge)[],
    }};
    me?: Friend;
}

export interface Payment {
    type: 'payment',
    payer: UserId,
    payee: UserId,
    amount: Money,
    date: Date,
    memo: string,
    paymentFrame: FrameIndex,
}

export interface Charge {
    type: 'charge',
    debtor: UserId,
    debtee: UserId,
    amount: Money,
    date: Date,
    memo: string,
    paymentFrame: FrameIndex,
}

export class Share extends Money {
    static normalize(...shares: Share[]): NormalizedShare[] {
        const total = shares.reduce((a, b) => a.plus(b), Share.Zero);
        return shares.map(s => new NormalizedShare(s.dividedBy(total).num));
    }
    asNumber(): Number {
        return this.num.toNumber();
    }
    static fromMoney(m: Money) {
        return new Share(m.num);
    }
    string(): string {
        return this.num.toString();
    }
    toJSON(): string {
        return this.string();
    }
    formatted() {
        return this.string();
    }
}
export class NormalizedShare extends Share {
    of(money: Money): Money {
        return new Money(this.num.times(money.num));
    }
}