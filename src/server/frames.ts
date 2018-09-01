import {Frame, GroupId, Money, FrameIndex, Category} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';
import * as categories from './categories';
import * as util from '../shared/util';
export * from '../shared/frames';
import * as shared from '../shared/frames';

export function getOrCreateFrame(gid: GroupId, index: FrameIndex, t?: pgPromise.ITask<{}>): Promise<Frame> {
    return t ? getOrCreateFrameInner(gid, index, t) : db.tx(t => getOrCreateFrameInner(gid, index, t));
}

async function getOrCreateFrameInner(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Frame> {
    console.log("getorcreateframeinner");
    const row = await t.oneOrNone("select * from frames where gid = $1 and index = $2", [gid, index]);
    if (row) {
        console.log("frame exists");
        const frame = shared.fromSerialized(row);
        frame.categories = await getCategories(gid, index, t);
        return frame;
    }
    console.log("creating new frame");
    const frame: Frame = {gid, index, balance: Money.Zero, income: Money.Zero};
    const prevFrame = await getPreviousFrame(gid, index, t);
    if (prevFrame) {
        frame.balance = prevFrame.balance.plus(prevFrame.income);
        frame.income = prevFrame.income;
        const cs = await getCategories(gid, prevFrame.index, t);
        frame.categories = cs.map(old_category => {
            return {...old_category, frame: frame.index, balance: old_category.budget};
        });
    } else {
        console.log("no previous frame");
        let i = -1;
        frame.categories = categories.DEFAULT_CATEGORIES.map(c => {
            i += 1;
            return {
                name: c,
                gid: gid,
                frame: index,
                alive: true,
                id: util.randomId(),
                ordering: i,
                budget: Money.Zero,
                balance: Money.Zero,
            }
        });
    }
    // Save the new frame and categories
    await t.none("insert into frames (gid, index, balance, income) values ($1, $2, $3, $4)", [
        frame.gid, frame.index, frame.balance, frame.income]);
    await t.batch(frame.categories.map(c => 
            t.none("insert into categories (id, gid, frame, name, ordering, budget, balance) values ($1, $2, $3, $4, $5, $6, $7)", [
                c.id, c.gid, c.frame, c.name, c.ordering, c.budget, c.balance])));
    return frame;
}

export function getIncome(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.oneOrNone("select income from frames where gid = $1 and index = $2", [gid, index]).then(row => {
        return row ? new Money(row.income) : Money.Zero;
    });
}

export function getBalance(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.oneOrNone("select balance from frames where gid = $1 and index = $2", [gid, index]).then(row => {
        return row ? new Money(row.balance) : Money.Zero;
    });
}

function getCategories(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Category[]> {
    return t.manyOrNone("select * from categories where gid = $1 and frame = $2 and alive order by ordering asc", [gid, frame]).then(rows => {
        return rows.map(categories.fromSerialized) || [];
    });
}

async function getPreviousFrame(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Frame | null> {
    const row = await t.oneOrNone("select * from frames where gid = $1 and index < $2 order by index desc limit 1", [gid, index]);
    return shared.fromSerialized(row);
}
