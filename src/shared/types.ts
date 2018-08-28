
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

export type Money = string;

export interface Category {
    id: CategoryId;
    gid: GroupId;
    frame: FrameIndex;
    alive: boolean;
    name: string;
    ordering: number;
}

// Corresponds to `frames` db table joined on `categories`
export interface Frame {
    gid: GroupId;
    index: FrameIndex;
    income: Money;
    categories: Category[];
}