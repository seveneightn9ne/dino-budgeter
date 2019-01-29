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

export type PaymentRequest = {
    amount: Money;
    email: string;
    youPay: boolean;
    isPayment: boolean;
};
export const Payment = new API<PaymentRequest, EmptyResponse>('/api/payment');

export type AddTransactionRequest = {
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
};
export const AddTransaction = new API<AddTransactionRequest, Transaction>('/api/transaction', {
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

export type DeleteTransactionRequest = {id: TransactionId};
export const DeleteTransaction = new API<DeleteTransactionRequest, EmptyResponse>('/api/transaction', {}, {}, 'DELETE');

export type TransactionSplitRequest = {
    tid: TransactionId,
    sid: SplitId,
    total: Money,
    myShare: Share,
    theirShare: Share,
    iPaid: boolean,
};
export const TransactionSplit = new API<TransactionSplitRequest, EmptyResponse>('/api/transaction/split', {
    "total": reviveMoney,
    "myShare": reviveMoney,
    "theirShare": reviveMoney
});

export type TransactionDescriptionRequest = {
    description: string,
    id: TransactionId,
};
export const TransactionDescription = new API<TransactionDescriptionRequest, EmptyResponse>('/api/transaction/description');

export type TransactionDateRequest = {
    date: Date,
    id: TransactionId,
};
export const TransactionDate = new API<TransactionDateRequest, EmptyResponse>('/api/transaction/date', {"date": Date});

export type TransactionCategoryRequest = {
    category: CategoryId,
    id: TransactionId,
};
export const TransactionCategory = new API<TransactionCategoryRequest, EmptyResponse>('/api/transaction/category');

export type TransactionAmountRequest = {
    amount: Money,
    id: TransactionId,
};
export const TransactionAmount = new API<TransactionAmountRequest, EmptyResponse>('/api/transaction/amount', {'amount': reviveMoney})

export type InitializeRequest = {
    index: FrameIndex,
    fields: (keyof InitState)[],
}
// TODO parameterize response based on request
export type InitializeResponse = Partial<InitState>;
export const Initialize = new API<InitializeRequest, InitializeResponse>('/api/init', {}, {
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

export type AddCategoryRequest = {
    frame: FrameIndex,
    name: string,
};
export const AddCategory = new API<AddCategoryRequest, Category>('/api/category', {}, {
    balance: reviveMoney,
    budget: reviveMoney,
});

export type DeleteCategoryRequest = {
    id: CategoryId,
    frame: FrameIndex,
};
export const DeleteCategory = new API<DeleteCategoryRequest, EmptyResponse>('/api/category', {}, {}, 'DELETE')

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

export type BudgetingMoveRequest = {
    to: CategoryId,
    from: CategoryId,
    amount: Money,
    frame: FrameIndex,
}
export const BudgetingMove = new API<BudgetingMoveRequest, EmptyResponse>('/api/budgeting/move', {
    amount: reviveMoney,
});

export type IncomeRequest = {
    frame: FrameIndex,
    income: Money
};
export const Income = new API<IncomeRequest, EmptyResponse>('/api/income', {
    income: reviveMoney,
});

export type NameRequest = {name: string};
export const Name = new API<NameRequest, EmptyResponse>('/api/name');
export type FriendRequest = {email: string};
export const AcceptFriend = new API<FriendRequest, Friend>('/api/friend');
export const RejectFriend = new API<FriendRequest, EmptyResponse>('/api/friend/reject');
export const DeleteFriend = new API<FriendRequest, EmptyResponse>('/api/friend', {}, {}, 'DELETE');

console.log("test reviving")
console.log(AddTransaction.requestReviver('split', {
    'myShare': '0.0',
    'theirShare': '1.5',
    'otherAmount': '10.0',
    iPaid: true,
    with: 'foo@foo.com'
}));