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





function sNumber(): SchemaField<number> {
    return (key: string, val: any): number => {
        if (typeof val === "number") {
            return val;
        }
        throw Error("Field " + key + " must be a number");
    }
}

function sString(opts: {nonEmpty?: boolean} = {}): SchemaField<string> {
    const {nonEmpty} = opts;
    return (key: string, val: any): string => {
        if (typeof val === "string") {
            if (nonEmpty && val.length == 0) {
                throw Error("Field " + key + " cannot be an empty string");
            }
            return val;
        }
        throw Error("Field " + key + " must be a string");
    }
}

function sBoolean(): SchemaField<boolean> {
    const f: SchemaBase<boolean> = (key: string, val: any): boolean => {
        if (typeof val === "boolean") {
            return val;
        }
        throw Error("Field " + key + " must be a boolean");
    }
    return f as SchemaField<boolean>;
}

function sDate(): SchemaField<Date> {
    return (key: string, val: any): Date => {
        const date = new Date(val);
        if (_.isNaN(date.valueOf())) {
            throw Error("Field " + key + " must be a date");
        }
        return date;
    }
}

function sMoney(opts: {nonNegative?: boolean} = {}): SchemaField<Money> {
    const {nonNegative} = opts;
    return (key: string, val: any): Money => {
        const money = new Money(val);
        if (money.isValid(!nonNegative)) {
            return money;
        }
        throw Error("Field " + key + " must be a Money");
    }
}

function sShare(opts: {nonNegative?: boolean} = {}): SchemaField<Share> {
    const {nonNegative} = opts;
    return (key: string, val: any): Share => {
        const share = new Share(val);
        if (share.isValid(!nonNegative)) {
            return share;
        }
        throw Error("Field " + key + " must be a Share");
    }
}

function sOptional<T extends RequestField>(schema: SchemaField<T>): SchemaBase<T> {
    return (key: string, val: any): T | undefined => {
        if (val === undefined) {
            return undefined;
        }
        return validateSchemaField(schema, key, val);
    }
}

/*
function sObject<Schema extends SchemaType>(body: Schema): SchemaField<RequestType<Schema> | any> {
    const ret: {[k: string]: any} = (key: string, obj: any): RequestType<Schema> => {
        if (!_.isPlainObject(obj)) {
            throw Error("Field " + key + " must be an object");
        }
        validateObject(body, obj);
        return obj;
    }};
    _.forOwn(body, (field, key) => {
        ret[key] = field;
    });
    return ret;
}*/

// TODO UN EXPORT THIS ITS UNUSED FOR NOW
export function sArray<T extends RequestBaseType>(innerType: SchemaBase<T>): SchemaBase<T[]> {
    return (key: string, val: any): T[] => {
        if (!_.isArray(val)) {
            throw Error("Field " + key + " must be an array");
        }
        // TODO what if innerType is an object?
        return _.map(val, (innerVal) => innerType(key, innerVal) as T) as T[];
    };
}

/**
 * schema: {
 *      foo: sString(),
 *      bar: {
 *          barBaz: sArray(sNumber()),
 *      }
 * }
 */

export class API<Request, Response = null> {
    constructor(
        public path: string,
        public requestRevivers: {[k in keyof Request]?: Revivable<Request[k]>} = {},
        public responseRevivers: {[k in keyof Response]?: Revivable<Response[k]>} = {},
        public method: "POST" | "PUT" | "DELETE" = "POST",
    ) {}
    public requestReviver = (key: string, value: any) => {
        return API.reviver(key, value, this.requestRevivers);
    }
    public responseReviver = (key: string, value: any) => {
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
type RequestBaseType = string | number | boolean | Date | Money | Share;
//type RequestBaseType = RequestBaseBaseType | RequestBaseBaseType[]; // only allows 1 level nesting array >:(
//type RequestBaseType = RequestBaseBaseType | RequestBaseBaseType[];
type RequestBase = RequestBaseType | RequestBaseType[];
type RequestField = RequestBase | object;
export type RequestType = {
    [key: string]: RequestField;
}
type SchemaBase<T> = (k: string, v: any) => T;
type SchemaField<T> = T extends object ? (SchemaType<T> | SchemaBase<T>) : SchemaBase<T>;
//type SchemaField<T extends RequestField> = SchemaBase<T> | SchemaType;
//type SchemaType = {
//    [key: string]: SchemaField<any>;
//}

//type ReturnType<T extends SchemaBase<any>> = T extends (key: string, val: any) => infer R ? R : any;

//type SchemaFieldType<T, S extends SchemaField<T>> = S extends SchemaType ? RequestType<S> : S extends SchemaBase<T> ? ReturnType<S> : never;
//type RequestFromSchema<Schema extends SchemaType<any>> = Schema extends SchemaType<infer R> ? R : any;
export type SchemaType<R extends object> = {
    [P in keyof R]?: SchemaField<R[P]>;
}
/*function isSchemaBase_<T extends RequestBaseType | RequestType, S extends SchemaField<T>>(s: S): T extends RequestBaseType ? true : false {
    if (_.isFunction(s)) {
        return true as T extends RequestBaseType ? true : false;
    }
    return false as T extends RequestBaseType ? true : false;
}*/
function maybeGetSchemaType<T extends RequestField>(s: SchemaField<T>): T extends RequestType ? SchemaType<T> : undefined {
    if (_.isPlainObject(s)) {
        return s as unknown as T extends RequestType ? SchemaType<T> : undefined;
    }
    return undefined;
}
/*function isSchemaType<T extends RequestBaseType | RequestType>(s: SchemaField<T>): T extends RequestBaseType ? false : true {
    const schemaBase = maybeGetSchemaBase<T>(s);
    if (schemaBase !== undefined) {
        return false as T extends RequestBaseType ? false : true;
    }
    return true as T extends RequestBaseType ? false : true;
}*/

function validateSchemaField<T extends RequestField>(schema: SchemaField<T>, key: string, val: any): T {
    if (_.isFunction(schema)) {
        return schema(key, val);
    }
    const schemaType = maybeGetSchemaType(schema);
    if (schemaType !== undefined) {
        return validateSchema(schemaType, val, key) as T;
    }
    throw Error("impossible for schema to be neither");
}
// validates the object recursively
function validateSchema<Request extends object>(schema: SchemaType<Request>, obj: any, key: string = ""): Request {
    if (!_.isPlainObject(obj)) {
        throw Error("Object " + key + " must be an object");
    }
    _.forOwn(obj, (_, key) => {
        if (!(key in schema)) {
            throw Error("Extraneous field " + key);
        }
    });
    return _.mapValues(schema, (s, f) => validateSchemaField(s, f, obj[f])) as Request;
}
export class API2<Request extends object, R2 extends object> {
    constructor(
        public path: string,
        public requestSchema: SchemaType<Request>,
        public responseSchema: SchemaType<R2>,
        //public requestRevivers: {[k in keyof Request]?: Revivable<Request[k]>} = {},
        //public responseRevivers: {[k in keyof Response]?: Revivable<Response[k]>} = {},
        public method: "POST" | "PUT" | "DELETE" = "POST",
    ) {}

    /**
     * Throws an error when the request does not match the schema.
     */
    public reviveRequest(request: string): Request {
        return validateSchema(this.requestSchema, JSON.parse(request));
    }

    public reviveResponse(response: string): R2 {
        return validateSchema(this.responseSchema, JSON.parse(response));
    }
}

export type ApiRequest<A extends API2<any, any>> = A extends API2<infer R, any> ? R : any;
export type ApiResponse<A extends API2<any, any>> = A extends API2<any, infer R> ? R : any;

export const EmptyResponseValue = {};
export type EmptyResponse = typeof EmptyResponseValue;

export type PaymentRequest = {
    amount: Money;
    email: string;
    youPay: boolean;
    isPayment: boolean;
    memo: string;
    frame: FrameIndex;
};
export const Payment = new API<PaymentRequest, EmptyResponse>('/api/payment', {
    'amount': reviveMoney,
});

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
/*export const AddTransactionRequestSchema: SchemaType = {
    frame: sNumber(),
    amount: sMoney(),
    description: sString(),
    category: sNumber(),
}*/
const transactionSchema: SchemaType<Transaction> = {
    id: sString(),
    gid: sString(),
    frame: sNumber(),
    amount: sMoney(),
    description: sString(),
    date: sDate(),
    category: sString(),
    alive: sBoolean(),
    split: sOptional({
        id: sString(),
        with: {
            uid: sString(),
            gid: sString(),
            email: sString(),
            name: sString(),
        } as SchemaType<Friend>,
        payer: sString(),
        settled: sBoolean(),
        myShare: sShare(),
        theirShare: sShare(),
        otherAmount: sMoney(),
    }),
}
export type AddTransactionRequest2 = {
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
    }
}
const req: SchemaType<AddTransactionRequest2> = {
    frame: sNumber(),
    amount: sMoney(),
    description: sString(),
    date: sDate(),
    category: sString(),
    split: sOptional({
        with: sString(),
        myShare: sShare(),
        theirShare: sShare(),
        otherAmount: sMoney(),
        iPaid: sBoolean(),
    }),
}
export const AddTransaction = new API2('/api/transaction', req, transactionSchema);

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
