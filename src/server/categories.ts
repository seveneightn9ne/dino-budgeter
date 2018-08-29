import {Frame, GroupId, Money, FrameIndex} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';
import {randomId} from './util';

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