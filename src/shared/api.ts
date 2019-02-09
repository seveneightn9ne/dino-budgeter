import Money from "./Money";
import _ from "lodash";
import { Payment as PaymentType, Charge, Frame, Share, CategoryId, FrameIndex, Transaction, InitState, Category, Friend } from "./types";

function sNumber(): SchemaField<number> {
    return (key: string, val: any): number => {
        if (typeof val === "number") {
            return val;
        }
        throw new Error("Field " + key + " must be a number");
    }
}

function sString(opts: {nonEmpty?: boolean} = {}): SchemaField<string> {
    const {nonEmpty} = opts;
    return (key: string, val: any): string => {
        if (typeof val === "string") {
            if (nonEmpty && val.length == 0) {
                throw new Error("Field " + key + " cannot be an empty string");
            }
            return val;
        }
        throw new Error("Field " + key + " must be a string");
    }
}

function sLiteral<S extends string>(literal: S): SchemaField<S> {
    const f: SchemaBase<S> = (key: string, val: any): S => {
        if (val !== literal) {
            throw new Error("Field " + key + " must be " + literal);
        }
        return literal;
    }
    return f as SchemaField<S>;

}

function sNull(): SchemaField<null> {
    return (key: string, val: any): null => {
        if (val !== null) {
            throw new Error("Field " + key + " must be null");
        }
        return null;
    }
}

function sBoolean(): SchemaField<boolean> {
    const f: SchemaBase<boolean> = (key: string, val: any): boolean => {
        if (typeof val === "boolean") {
            return val;
        }
        throw new Error("Field " + key + " must be a boolean");
    }
    return f as SchemaField<boolean>;
}

function sDate(): SchemaField<Date> {
    return (key: string, val: any): Date => {
        const date = new Date(val);
        if (_.isNaN(date.valueOf())) {
            throw new Error("Field " + key + " must be a date");
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
        throw new Error("Field " + key + " must be a Money");
    }
}

function sShare(opts: {nonNegative?: boolean} = {}): SchemaField<Share> {
    const {nonNegative} = opts;
    return (key: string, val: any): Share => {
        const share = new Share(val);
        if (share.isValid(!nonNegative)) {
            return share;
        }
        throw new Error("Field " + key + " must be a Share");
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

function sValues<T extends RequestField>(schema: SchemaField<T>): SchemaBase<{[k: string]: T}> {
    return (key: string, val: any): {[k: string]: T} => {
        if (!_.isPlainObject(val)) {
            throw new Error("Field " + key + " must be an object");
        }
        return _.mapValues(val, (innerVal, innerKey) => {
            return validateSchemaField(schema, keyConcat(key, innerKey), innerVal);
        });
    }
}

function sOr<A extends RequestField, B extends RequestField>(s1: SchemaField<A>, s2: SchemaField<B>): SchemaBase<A|B> {
    return (key: string, val: any): A|B => {
        try {
            return validateSchemaField(s1, key, val);
        } catch {
            return validateSchemaField(s2, key, val);
        }
    }
}

function sBaseArray<T>(innerType: SchemaBase<T>): SchemaBase<T[]> {
    return (key: string, val: any): T[] => {
        if (!_.isArray(val)) {
            throw Error("Field " + key + " must be an array");
        }
        return _.map(val, (innerVal) => validateSchemaField(innerType as SchemaField<T>, key, innerVal));
    };
}

function sArray<T>(innerType: SchemaField<T>): SchemaBase<T[]> {
    return (key: string, val: any): T[] => {
        if (!_.isArray(val)) {
            throw Error("Field " + key + " must be an array");
        }
        return _.map(val, (innerVal) => validateSchemaField(innerType, key, innerVal));
    };
}


type RequestBaseType = string | number | boolean | Date | Money | Share;
type RequestBase = RequestBaseType | RequestBaseType[];
type RequestField = RequestBase | object;
export type RequestType = {
    [key: string]: RequestField;
}

type SchemaBase<T> = (k: string, v: any) => T;
type SchemaField<T> = T extends object ? (SchemaType<T> | SchemaBase<T>) : SchemaBase<T>;
export type SchemaType<R extends object> = {
    [P in keyof R]: SchemaField<R[P]>;
}

function maybeGetSchemaType<T>(s: SchemaField<T>): T extends object ? SchemaType<T> : undefined {
    if (_.isPlainObject(s)) {
        return s as T extends object ? SchemaType<T> : undefined;
    }
    return undefined;
}
function keyConcat(k: string, f: string): string {
    if (!k) {
        return f;
    }
    return `${k}.${f}`;
}

function validateSchemaField<T>(schema: SchemaField<T>, key: string, val: any): T {
    if (_.isFunction(schema)) {
        return schema(key, val);
    }
    const schemaType = maybeGetSchemaType(schema);
    if (schemaType) {
        return validateSchema(schemaType, val, key) as unknown as T;
    }
    throw Error("impossible for schema to be neither");
}
// validates the object recursively
function validateSchema<Request extends (object|null)>(schema: SchemaType<Request>, obj: any, key: string = ""): Request {
    if (schema == null) {
        if (obj != null) {
            throw new Error("Object " + key + " must be null");
        }
        return null as Request;
    }
    if (!_.isPlainObject(obj)) {
        throw Error("Object " + key + " must be an object");
    }
    _.forOwn(obj, (_, key) => {
        if (!(key in schema)) {
            throw Error("Extraneous field " + key);
        }
    });
    return _.mapValues(schema, (s, f) => validateSchemaField(s, keyConcat(key, f), obj[f])) as Request;
}
export class API2<Request extends object, R2 extends object|null> {
    constructor(
        public path: string,
        public requestSchema: SchemaType<Request>,
        public responseSchema: SchemaType<R2>,
        public method: "POST" | "PUT" | "DELETE" = "POST",
    ) {}

    /**
     * Throws an error when the request does not match the schema.
     */
    public reviveRequest(request: string): Request {
        try {
            return validateSchema(this.requestSchema, JSON.parse(request));
        } catch (e) {
            console.error("Schema validation failed for request " + this.path);
            throw e;
        }
    }

    public reviveResponse(response: string): R2 {
        try {
            return validateSchema(this.responseSchema, JSON.parse(response));
        } catch (e) {
            console.error("Schema validation failed for response " + this.path);
            throw e;
        }
    }
}

export type ApiRequest<A extends API2<any, any>> = A extends API2<infer R, any> ? R : any;
export type ApiResponse<A extends API2<any, any>> = A extends API2<any, infer R> ? R : any;

export type EmptyResponse = null;
export const EmptyResponseValue: EmptyResponse = null;
export const emptySchema: SchemaType<null> = null;

/** Reusable Schemas */

const categorySchema: SchemaType<Category> = {
    id: sString(),
    gid: sString(),
    frame: sNumber(),
    alive: sBoolean(),
    name: sString(),
    ordering: sNumber(),
    budget: sMoney(),
    balance: sOptional(sMoney()),
    ctime: sOptional(sDate()),
}
const frameSchema: SchemaType<Frame> = {
    gid: sString(),
    index: sNumber(),
    income: sMoney(),
    categories: sOptional(sArray(categorySchema)),
    balance: sOptional(sMoney()),
    spending: sOptional(sMoney())
}
const paymentSchema: SchemaType<PaymentType> = {
    type: sLiteral('payment'),
    payer: sString(),
    payee: sString(),
    amount: sMoney(),
    date: sDate(),
    memo: sString(),
    frame: sNumber(),
}
const chargeSchema: SchemaType<Charge> = {
    type: sLiteral('charge'),
    debtor: sString(),
    debtee: sString(),
    amount: sMoney(),
    date: sDate(),
    memo: sString(),
    frame: sNumber(),
}
const friendSchema: SchemaType<Friend> = {
    uid: sString(),
    gid: sString(),
    email: sString(),
    name: sString(),
};
const transactionSchema: SchemaType<Transaction> = {
    id: sString(),
    gid: sString(),
    frame: sNumber(),
    amount: sMoney(),
    description: sString(),
    date: sDate(),
    category: sOr(sString(), sNull()),
    alive: sBoolean(),
    split: sOptional({
        id: sString(),
        with: friendSchema as SchemaType<Friend>,
        payer: sString(),
        settled: sBoolean(),
        myShare: sShare(),
        theirShare: sShare(),
        otherAmount: sMoney(),
    }),
}

/** API Endpoints */

export const Payment = new API2('/api/payment', {
    amount: sMoney(),
    email: sString(),
    youPay: sBoolean(),
    isPayment: sBoolean(),
    memo: sString(),
    frame: sNumber(),
}, emptySchema);

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
    amount: sMoney({nonNegative: true}),
    description: sString(),
    date: sDate(),
    category: sString(),
    split: sOptional({
        with: sString(),
        myShare: sShare({nonNegative: true}),
        theirShare: sShare({nonNegative: true}),
        otherAmount: sMoney({nonNegative: true}),
        iPaid: sBoolean(),
    }),
}
export const AddTransaction = new API2<AddTransactionRequest2, Transaction>('/api/transaction', req, transactionSchema);

export const DeleteTransaction = new API2('/api/transaction', {id: sString()}, emptySchema, 'DELETE');

export const TransactionSplit = new API2('/api/transaction/split', {
    tid: sString({nonEmpty: true}),
    sid: sString({nonEmpty: true}),
    total: sMoney({nonNegative: true}),
    myShare: sShare({nonNegative: true}),
    theirShare: sShare({nonNegative: true}),
    iPaid: sBoolean(),
}, emptySchema);

export const TransactionDescription = new API2('/api/transaction/description', {
    description: sString({nonEmpty: true}),
    id: sString(),
}, emptySchema);

export const TransactionDate = new API2('/api/transaction/date', {
    id: sString(),
    date: sDate(),
}, emptySchema);

export const TransactionCategory = new API2('/api/transaction/category', {
    id: sString(),
    category: sString(),
}, emptySchema);

export const TransactionAmount = new API2('/api/transaction/amount', {
    id: sString(),
    amount: sMoney(),
}, emptySchema);

export const Initialize = new API2('/api/init', {
    index: sNumber(),
    fields: sArray(sString()),
}, {
    frame: sOptional(frameSchema),
    transactions: sOptional(sArray(transactionSchema)),
    debts: sOptional(sValues({
        balance: sMoney(),
        payments: sBaseArray(sOr(paymentSchema, chargeSchema)),
    })),
    me: sOptional(friendSchema),
    categories: sOptional(sArray(categorySchema)),
    friends: sOptional(sArray(friendSchema)),
    pendingFriends: sOptional(sArray(friendSchema)),
    invites: sOptional(sArray(friendSchema)),
} as SchemaType<Partial<InitState>>);

export const AddCategory = new API2<{frame: number, name: string}, Category>('/api/category', {
    frame: sNumber(),
    name: sString({nonEmpty: true}),
}, categorySchema);

export const DeleteCategory = new API2('/api/category', {
    id: sString(),
    frame: sNumber(),
}, emptySchema, 'DELETE')

export const CategoryBudget = new API2('/api/category/budget', {
    id: sString(),
    frame: sNumber(),
    amount: sMoney({nonNegative: true})
}, emptySchema);

export const CategoryName = new API2('/api/category/name', {
    id: sString(),
    frame: sNumber(),
    name: sString({nonEmpty: true}),
}, emptySchema);

export const BudgetingMove = new API2('/api/budgeting/move', {
    to: sString(),
    from: sString(),
    amount: sMoney(),
    frame: sNumber(),
}, emptySchema);

export const Income = new API2('/api/income', {
    income: sMoney(),
    frame: sNumber(),
}, emptySchema);

export const Name = new API2('/api/name', {name: sString()}, emptySchema);
const friendRequest = {email: sString({nonEmpty: true})};
export type FriendRequest = {email: string};
export const AcceptFriend = new API2<FriendRequest, Friend>('/api/friend', friendRequest, friendSchema);
export const RejectFriend = new API2('/api/friend/reject', friendRequest, emptySchema);
export const DeleteFriend = new API2('/api/friend', friendRequest, emptySchema, 'DELETE');
