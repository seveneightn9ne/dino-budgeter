import {Frame, GroupId, Money, FrameIndex, CategoryId} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';
import {randomId} from '../shared/util';
export * from '../shared/categories';

export const DEFAULT_CATEGORIES = [
    "Rent",
    "Gas",
    "Electric",
    "Internet",
    "Cell Phone",
    "Transportation",
    "Debt Payments",
    "Groceries",
    "Clothing",
    "Charity",
    "Gifts",
    "Vacation & Travel",
    "Shopping",
    "Restaurants",
    "Stuff I Forgot To Budget For",
];

export function getNextOrdinal(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<number> {
    return t.oneOrNone("select ordering from categories where gid = $1 and frame = $2 order by ordering asc limit 1",
        [gid, frame]).then(row => row ? row.ordering + 1 : 0);
}

export function getBalance(id: CategoryId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.one("select balance from categories where id = $1 and frame = $2", [id, frame]).then(row => {
        return row.balance;
    });
}

export function getBudget(id: CategoryId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.one("select budget from categories where id = $1 and frame = $2", [id, frame]).then(row => {
        return row.budget;
    });
}