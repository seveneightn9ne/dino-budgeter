import Money from './Money';

export type UserId = string;
export type GroupId = string;
export type CategoryId = string;
export type FrameIndex = number;
export type TransactionId = string;

// Corresponds to `users` db table
export interface User {
    uid: UserId;
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

// Corresponds to `transactions` db table
export interface Transaction {
    id: TransactionId;
    gid: GroupId;
    frame: FrameIndex;
    category: CategoryId | null;
    amount: Money;
    description: string;
    alive: boolean;
    date: Date;
}

export interface Friend {
    email: string;
    pending?: boolean;
}