import Money from "./Money";
import _ from "lodash";
import { TransactionId, SplitId, Share, CategoryId, FrameIndex, Transaction, InitState, Category, Friend } from "./types";

//type JSONval = number | string | boolean | number[] | string[] | boolean[];
interface ReviverFunc {
    (value: any): any;
}
type Revivable<T> = ReviverFunc | {
    [k in keyof T]?: ReviverFunc | {
        [j in keyof T[k]]?: ReviverFunc;
    };
};
function reviveArray(f: ReviverFunc) {
    return (v: any) => v.map(f);
}
function reviveValues(f: ReviverFunc) {
    return (obj: any) => _.mapValues(obj, f);
}
function reviveMoney(v: any): any {
    return new Money(v);
}
function reviveShare(v: any): any {
    return new Share(v);
}
function reviveDate(v: any): any {
    return new Date(v);
}

export class API<Request, Response = null> {
    constructor(
        public path: string,
        public requestRevivers: {[k in keyof Request]?: Revivable<Request[k]>} = {},
        public responseRevivers: {[k in keyof Response]?: Revivable<Response[k]>} = {},
        public method: "POST" | "PUT" | "DELETE" = "POST",
    ) {}
    public requestReviver(key: string, value: any): any {
        return API.reviver(key, value, this.requestRevivers);
    }
    public responseReviver(key: string, value: any): any {
        return API.reviver(key, value, this.responseRevivers);
    }
    static isNestedRevivable<R>(r: Revivable<R>): r is {[k in keyof R]?: ReviverFunc} {
        return _.isPlainObject(r);
    }
    static reviver<R>(key: string, value: any, types: {[k: string]: Revivable<R>}): any {
        if (!(key in types)) {
            return value;
        }
        const reviver: Revivable<R> = types[key];
        if (API.isNestedRevivable(reviver)) {
            return _.mapValues(value, (val, key) => {
                return API.reviver(key, val, reviver);
            })
        }
        return (reviver as ReviverFunc)(value);
    }
}
export const EmptyResponseValue = {};
export type EmptyResponse = typeof EmptyResponseValue;

export const Payment = new API<{
    amount: Money;
    email: string;
    youPay: boolean;
    isPayment: boolean;
}, EmptyResponse>('/api/payment');

export const DeleteTransaction = new API<{
    id: TransactionId,
}, EmptyResponse>('/api/transaction', {}, {}, 'DELETE');

export const TransactionSplit = new API<{
    tid: TransactionId,
    sid: SplitId,
    total: Money,
    myShare: Share,
    theirShare: Share,
    iPaid: boolean,
}, EmptyResponse>('/api/transaction/split', {"total": reviveMoney, "myShare": reviveMoney, "theirShare": reviveMoney});

export const TransactionDescription = new API<{
    description: string,
    id: TransactionId,
}, EmptyResponse>('/api/transaction/description');

export const TransactionDate = new API<{
    date: Date,
    id: TransactionId,
}, EmptyResponse>('/api/transaction/date', {"date": Date});

export const TransactionCategory = new API<{
    category: CategoryId,
    id: TransactionId,
}, EmptyResponse>('/api/transaction/category');

export const TransactionAmount = new API<{
    amount: Money,
    id: TransactionId,
}, EmptyResponse>('/api/transaction/amount', {'amount': reviveMoney})

export const AddTransaction = new API<{
    frame: FrameIndex,
    amount: Money,
    description: string,
    date: Date,
    category: CategoryId,
    split?: {
        with: string,
        myShare: Share,
        theirShare: Share,
        otherAmount: Money,
        iPaid: boolean,
    },
}, Transaction>('/api/transaction', {
    'amount': reviveMoney,
    'date': reviveDate,
    split: {
        'myShare': reviveShare,
        'theirShare': reviveShare,
        'otherAmount': reviveMoney
    }
}, {
    amount: reviveMoney,
    date: reviveDate,
    split: {
        theirShare: reviveShare,
        myShare: reviveShare,
        otherAmount: reviveMoney,
    }
});

export const Initialize = new API<{
    index: FrameIndex,
    fields: (keyof InitState)[],
 }, Partial<InitState>>('/api/init', {}, {
    frame: {
        income: reviveMoney,
        balance: reviveMoney,
        spending: reviveMoney,
    },
    transactions: reviveArray((tn: Transaction) =>
        API.reviver('transactions', tn, {
            transactions: {
                amount: reviveMoney,
                date: reviveDate,
                split: {
                    theirShare: reviveShare,
                    myShare: reviveShare,
                    otherAmount: reviveMoney,
                }
            }
        })
    ),
    debts: reviveValues(v => new Money(v)),
    categories: reviveArray((cat: Category) => 
        API.reviver('categories', cat, {
            categories: {
                balance: reviveMoney,
                budget: reviveMoney,
            }
        })
    )
});

export const AddCategory = new API<{
    frame: FrameIndex,
    name: string,
}, Category>('/api/category', {}, {
    balance: reviveMoney,
    budget: reviveMoney,
});

export const DeleteCategory = new API<{
    id: CategoryId,
    frame: FrameIndex,
}, EmptyResponse>('/api/category', {}, {}, 'DELETE')

export type CategoryBudgetRequest = {
    id: CategoryId,
    frame: FrameIndex,
    amount: Money,
};
export const CategoryBudget = new API<CategoryBudgetRequest, EmptyResponse>('/api/category/budget', {
    amount: reviveMoney,
});

export type CategoryNameRequest = {
    id: CategoryId,
    frame: FrameIndex,
    name: string,
};
export const CategoryName = new API<CategoryNameRequest, EmptyResponse>('/api/category/name');

export const BudgetingMove = new API<{
    to: CategoryId,
    from: CategoryId,
    amount: Money,
    frame: FrameIndex,
}, EmptyResponse>('/api/budgeting/move', {
    amount: reviveMoney,
});

export type IncomeRequest = {
    frame: FrameIndex,
    income: Money
};
export const Income = new API<IncomeRequest, EmptyResponse>('/api/income', {
    income: reviveMoney,
});

export const Name = new API<{name: string}, EmptyResponse>('/api/name');
export const AcceptFriend = new API<{email: string}, Friend>('/api/friend');
export const RejectFriend = new API<{email: string}, EmptyResponse>('/api/friend/reject');
export const DeleteFriend = new API<{email: string}, EmptyResponse>('/api/friend', {}, {}, 'DELETE');

console.log("test reviving")
console.log(AddTransaction.requestReviver('split', {
    'myShare': '0.0',
    'theirShare': '1.5',
    'otherAmount': '10.0',
    iPaid: true,
    with: 'foo@foo.com'
}));