import {Frame, GroupId, Money, FrameIndex, Category} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';
import {DEFAULT_CATEGORIES} from './categories';
import * as util from './util';
export {index, year, month} from '../shared/frames';

export function getOrCreateFrame(gid: GroupId, index: FrameIndex, t?: pgPromise.ITask<{}>): Promise<Frame> {
    return t ? getOrCreateFrameInner(gid, index, t) : db.tx(t => getOrCreateFrameInner(gid, index, t));
}

function getOrCreateFrameInner(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Frame> {
    console.log("getorcreateframeinner");
    return t.oneOrNone("select * from frames where gid = $1 and index = $2", [gid, index]).then(row => {
        if (row) {
            console.log("frame exists");
            const frame = {...row};
            return t.manyOrNone("select * from categories where gid = $1 and frame = $2", [gid, index]).then(rows => {
                frame.categories = rows || [];
                return frame as Frame;
            });
        } else {
            console.log("creating new frame");
            const income: Money = "0";
            return t.none("insert into frames values ($1, $2, $3)", [
                 gid, index, income,
            ]).then(() => {
                const frame = {gid, index, income, categories: [] as Category[]};
                return getPreviousFrame(gid, index, t).then(prevFrame => {
                    if (!prevFrame) {
                        console.log("no previous frame");
                        return createDefaultCategories(gid, frame.index, t);
                    } else {
                        console.log("copying categories from previous frame");
                        return copyCategories(gid, frame.index, prevFrame.index, t);
                    }
                }).then((cs: Category[]) => {
                    frame.categories = cs;
                    return frame;
                });
            });
        }
    });
}

function createDefaultCategories(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Category[]> {
    const cs: Category[] = [];
    let i = 0;
    return Promise.all(DEFAULT_CATEGORIES.map(c => {
        const id = util.randomId();
        const this_i = i;
        i++;
        return t.none("insert into categories (id, gid, frame, name, ordering) values ($1, $2, $3, $4, $5)", [
            id, gid, frame, c, this_i,
        ]).then(() => {
            cs.push({
                id, gid, frame,
                alive: true,
                name: c,
                ordering: this_i,
            });
        });
    })).then(() => {
        return cs;
    });
}

function copyCategories(gid: GroupId, frame: FrameIndex, copyFrom: FrameIndex, t: pgPromise.ITask<{}>): Promise<Category[]> {
    return t.manyOrNone("insert into categories (id, gid, frame, name, ordering) " +
    "select id, $1, $2, name, ordering from categories where gid = $1 and frame = $3 returning *", [
        gid, frame, copyFrom,
    ]).then(rows => {
        return rows || [];
    });
}

function getPreviousFrame(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Frame | null> {
    return t.oneOrNone("select * from frames where gid = $1 and index < $2 order by index desc limit 1", [gid, index]);
}