import pgPromise from "pg-promise";
import { fromSerialized } from "../shared/categories";
import Money from "../shared/Money";
import { Category, CategoryId, FrameIndex, GroupId } from "../shared/types";
export * from "../shared/categories";

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
    return t.oneOrNone("select ordering from categories where gid = $1 and frame = $2 order by ordering desc limit 1",
        [gid, frame]).then(row => row ? row.ordering + 1 : 0);
}

export function getSpending(id: CategoryId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.manyOrNone("select amount from transactions where category = $1 and frame = $2 and alive = true", [id, frame]).then(rows => {
        if (!rows) {
            return Money.Zero;
        }
        return rows.reduce((a: Money, row: any) => a.plus(new Money(row.amount)), Money.Zero);
    });
}

export function getBudget(id: CategoryId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.one("select budget from categories where id = $1 and frame = $2", [id, frame]).then(row => {
        return new Money(row.budget);
    });
}

export async function getCategories(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Category[]> {
    const rows = await t.manyOrNone("select * from categories where gid = $1 and frame = $2 and alive = true", [gid, frame]);
    return rows.map(fromSerialized);
}

export async function getHistory(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>):
    Promise<{ [c: string]: Money[] }> {
    const minFrame = frame - 6;
    const categories = await getCategories(gid, frame, t);
    const history: { [c: string]: Money[] } = {};
    await t.batch(categories.map(async (c) => {
        history[c.id] = [];
        for (let historyFrame = minFrame; historyFrame <= frame; historyFrame++) {
            const spending = await getSpending(c.id, historyFrame, t);
            history[c.id].push(spending);
        }
    }));
    return history;
}
