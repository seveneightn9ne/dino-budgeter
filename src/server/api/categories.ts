import Money from "../../shared/Money";
import { Category, User } from "../../shared/types";
import * as util from "../../shared/util";
import { StatusCodeNoResponse } from "../api";
import * as categories from "../categories";
import db from "../db";
import * as user from "../user";
import { AddCategoryRequest, DeleteCategoryRequest, CategoryBudgetRequest, CategoryNameRequest } from "../../shared/api";

export function handle_category_post(request: AddCategoryRequest, actor: User): Promise<Category | StatusCodeNoResponse> {
    const c: Category = {
        frame: request.frame,
        name: request.name,
        id: util.randomId(),
        alive: true,
        budget: Money.Zero,
        balance: Money.Zero,
        // To be filled in below:
        gid: undefined,
        ordering: undefined,
    };
    return db.tx(async t => {
        c.gid = await user.getDefaultGroup(actor, t);
        c.ordering = await categories.getNextOrdinal(c.gid, c.frame, t);
        await t.none("insert into categories (id, gid, frame, alive, name, ordering, " +
            "budget) values ($1, $2, $3, $4, $5, $6, $7)", [
                c.id, c.gid, c.frame, c.alive, c.name, c.ordering, c.budget.string()]);
        return c;
    });
}

export function handle_category_delete(request: DeleteCategoryRequest, actor: User): Promise<StatusCodeNoResponse> {
    const {id, frame} = request;
    return db.tx(async t => {
        const row = await t.oneOrNone("select * from categories where id = $1 and frame = $2", [id, frame]);
        if (!row) {
            return 400 as StatusCodeNoResponse;
        }
        const category = categories.fromSerialized(row);
        const membership = await t.oneOrNone("select * from membership where uid = $1 and gid = $2", [
            actor.uid, category.gid]);
        if (!membership) {
            return 401;
        }
        await t.none("update categories set alive = false where id = $1 and frame = $2", [id, frame]);
        return 204;
    });
}

export function handle_category_budget_post(request: CategoryBudgetRequest, actor: User): Promise<StatusCodeNoResponse> {
    const {id, frame, amount} = request;
    if (!amount.isValid(false /** allowNegative */)) {
        return Promise.resolve(400 as StatusCodeNoResponse);
    }
    return db.tx(async t => {
        const gid = await user.getDefaultGroup(actor, t);
        // gid included to make sure user has permission to edit this category
        await t.none("update categories set budget = $1 where id = $2 and frame = $3 and gid = $4", [
            amount.string(), id, frame, gid,
        ]);
        return 204 as StatusCodeNoResponse;
    });
}

export function handle_category_name_post(request: CategoryNameRequest, actor: User): Promise<StatusCodeNoResponse> {
    const {id, frame, name} = request;
    return db.tx(async t => {
        const gid = await user.getDefaultGroup(actor, t);
        // gid included to make sure user has permission to edit this category
        await t.none("update categories set name = $1 where id = $2 and frame = $3 and gid = $4", [
            name, id, frame, gid,
        ]);
        return 204 as StatusCodeNoResponse;
    });
}