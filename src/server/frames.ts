import {Frame, GroupId, Money, FrameIndex, Category} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';
import {DEFAULT_CATEGORIES} from './categories';
import * as util from '../shared/util';
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
            return getCategories(gid, index, t).then(cs => {
                frame.categories = cs;
                return frame as Frame;
            });
        } else {
            console.log("creating new frame");
            const frame = {gid, index, balance: "0", income: "0", categories: [] as Category[]};
            return getPreviousFrame(gid, index, t).then(prevFrame => {
                if (prevFrame) {
                    frame.balance = prevFrame.balance + prevFrame.income;
                    frame.income = prevFrame.income;
                    return getCategories(gid, prevFrame.index, t).then(cs => {
                        frame.categories = cs.map(old_category => {
                            return {...old_category, frame: frame.index, balance: old_category.budget};
                        })
                    });
                } else {
                    console.log("no previous frame");
                    let i = -1;
                    frame.categories = DEFAULT_CATEGORIES.map(c => {
                        i += 1;
                        return {
                            name: c,
                            gid: gid,
                            frame: index,
                            alive: true,
                            id: util.randomId(),
                            ordering: i,
                            budget: "0",
                            balance: "0",
                        }
                    });
                }
            }).then(() => {
                // Save the new frame and categories
                return t.none("insert into frames (gid, index, balance, income) values ($1, $2, $3, $4)", [
                    frame.gid, frame.index, frame.balance, frame.income,
                ]).then(() => {
                    return Promise.all(frame.categories.map(c => {
                        return t.none("insert into categories (id, gid, frame, name, ordering, budget, balance) values ($1, $2, $3, $4, $5, $6, $7)", [
                            c.id, c.gid, c.frame, c.name, c.ordering, c.budget, c.balance,
                        ]);
                    })).then(() => {
                        return frame;
                    });
                });

                
            });
        }
    });
}

function getCategories(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Category[]> {
    return t.manyOrNone("select * from categories where gid = $1 and frame = $2 and alive order by ordering asc", [gid, frame]).then(rows => {
        return rows || [];
    });
}

function getPreviousFrame(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Frame | null> {
    return t.oneOrNone("select * from frames where gid = $1 and index < $2 order by index desc limit 1", [gid, index]);
}