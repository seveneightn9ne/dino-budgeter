import Money from "../../shared/Money";
import { StatusCodeNoResponse } from "../api";
import db from "../db";
import * as user from "../user";
import { IncomeRequest, BudgetingMoveRequest } from "../../shared/api";
import { User } from "../../shared/types";

export function handle_income_post(request: IncomeRequest, actor: User): Promise<StatusCodeNoResponse> {
    if (!request.income.isValid()) {
        return Promise.resolve(400 as StatusCodeNoResponse);
    }
    return db.tx(async t => {
        const gid = await user.getDefaultGroup(actor, t);
        await t.none("update frames set income = $1 where gid = $2 and index = $3",
            [request.income.string(), gid, request.frame]);
        return 204 as StatusCodeNoResponse;
    });
}

export function handle_budgeting_move_post(request: BudgetingMoveRequest, actor: User): Promise<StatusCodeNoResponse> {
    if (!request.amount.isValid()) {
        return Promise.resolve(400 as StatusCodeNoResponse);
    }
    return db.tx(async t => {
        const gid = await user.getDefaultGroup(actor, t);
        const fromRow = (await t.oneOrNone("select * from categories where id = $1 and gid = $2 and frame = $3",
            [request.from, gid, request.frame]));
        const toRow = (await t.oneOrNone("select * from categories where id = $1 and gid = $2 and frame = $3",
            [request.to, gid, request.frame]));
        if (!fromRow || !toRow) {
            return 400;
        }
        const newFromBudget = new Money(fromRow.budget).minus(request.amount);
        const newToBudget = new Money(toRow.budget).plus(request.amount);
        await t.none("update categories set budget = $1 where id = $2 and frame = $3", [newFromBudget.string(), request.from, request.frame]);
        await t.none("update categories set budget = $1 where id = $2 and frame = $3", [newToBudget.string(), request.to, request.frame]);
        return 204 as StatusCodeNoResponse;
    });

}