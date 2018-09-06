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
        frame.balance = await getBalance(gid, index, t);
        frame.spending = await getSpending(gid, index, t);
        return frame;
    }
    console.log("creating new frame");
    const frame: Frame = {gid, index, balance: Money.Zero, income: Money.Zero};
    frame.spending = await getSpending(gid, index, t);
    frame.balance = await getBalance(gid, index, t);
    const prevFrame = await getPreviousFrame(gid, index, t);
    if (prevFrame) {
        frame.income = prevFrame.income;
        frame.categories = (await getCategories(gid, prevFrame.index, t)).map(c => ({
            ...c,
            frame: frame.index,
        }));
        frame.balance = frame.balance.plus(frame.income);
    } else {
        console.log("no previous frame");
        let i = -1;
        frame.categories = await t.batch(categories.DEFAULT_CATEGORIES.map(async c => {
            i += 1;
            const id = util.randomId();
            return {
                name: c,
                gid: gid,
                frame: index,
                alive: true,
                id: id,
                ordering: i,
                budget: Money.Zero,
                balance: Money.Zero.minus(await categories.getSpending(id, index, t)),
            };
        }));
    }
    // Save the new frame and categories
    await t.none("insert into frames (gid, index, income) values ($1, $2, $3)", [
        frame.gid, frame.index, frame.income.string()]);
    console.log("creating categories")
    await t.batch(frame.categories.map(c => 
            t.none("insert into categories (id, gid, frame, name, ordering, budget) values ($1, $2, $3, $4, $5, $6)", [
                c.id, c.gid, c.frame, c.name, c.ordering, c.budget.string()])));
    return frame;
}

export function getIncome(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.oneOrNone("select income from frames where gid = $1 and index = $2", [gid, index]).then(row => {
        return row ? new Money(row.income) : Money.Zero;
    });
}

export function getBalance(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.manyOrNone("select amount from transactions where gid = $1 and frame <= $2 and alive = true", [gid, index]).then(rows => {
        const totalSpent = rows ? Money.sum(rows.map(r => new Money(r.amount))): Money.Zero;
        return t.manyOrNone("select income from frames where gid = $1 and index <= $2", [gid, index]).then(rows => {
            const totalIncome = rows ? Money.sum(rows.map(r => new Money(r.income))): Money.Zero;
            return totalIncome.minus(totalSpent);
        })
    });
}

function getSpending(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.manyOrNone("select amount from transactions where gid = $1 and frame = $2 and alive = true", [gid, frame]).then(rows => {
        return rows ? Money.sum(rows.map(r => new Money(r.amount))): Money.Zero;
    });
}

function getCategories(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Category[]> {
    return t.manyOrNone("select * from categories where gid = $1 and frame = $2 and alive order by ordering asc", [gid, frame]).then(rows => {
        return t.batch(rows.map(async row => {
            const category = categories.fromSerialized(row);
            category.balance = category.budget.minus(await categories.getSpending(category.id, frame, t));
            return category;
        })) || Promise.resolve([]);
    });
}

async function getPreviousFrame(gid: GroupId, index: FrameIndex, t: pgPromise.ITask<{}>): Promise<Frame | null> {
    const row = await t.oneOrNone("select * from frames where gid = $1 and index < $2 order by index desc limit 1", [gid, index]);
    return shared.fromSerialized(row);
}
