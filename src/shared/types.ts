
export type UserId = string;
export type GroupId = string;
export type FrameId = string;

// Corresponds to `users` db table
export interface User {
    uid: UserId;
    email: string;
    password_hash: string;
}

export type Money = string;

// Corresponds to `frames` db table
export interface Frame {
    id: FrameId;
    gid: GroupId;
    month: number;
    year: number;
    income: Money;
}