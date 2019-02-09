import Money from "../../shared/Money";
import { StatusCodeNoResponse } from "../api";
import db from "../db";
import * as user from "../user";
import { ApiRequest, Income, BudgetingMove } from "../../shared/api";
import { User } from "../../shared/types";
import * as frames from "../frames";

export function handle_income_post(request: ApiRequest<typeof Income>, actor: User): Promise<StatusCodeNoResponse> {
    return db.tx(async t => {
        const gid = await user.getDefaultGroup(actor, t);
        await frames.markNotGhost(gid, request.frame, t);
        await t.none("update frames set income = $1 where gid = $2 and index = $3",
            [request.income.string(), gid, request.frame]);
        return 204 as StatusCodeNoResponse;
    });
}

export function handle_budgeting_move_post(request: ApiRequest<typeof BudgetingMove>, actor: User): Promise<StatusCodeNoResponse> {
    return db.tx(async t => {
        const gid = await user.getDefaultGroup(actor, t);
        if (request.from) {
            const fromRow = (await t.oneOrNone("select * from categories where id = $1 and gid = $2 and frame = $3",
                [request.from, gid, request.frame]));
            if (!fromRow) {
                console.error("400: fromRow does not exist for " + request.from);
                return 400;
            }
            const newFromBudget = new Money(fromRow.budget).minus(request.amount);
            await t.none("update categories set budget = $1 where id = $2 and frame = $3", [newFromBudget.string(), request.from, request.frame]);
        }
        const toRow = (await t.oneOrNone("select * from categories where id = $1 and gid = $2 and frame = $3",
            [request.to, gid, request.frame]));
        if (!toRow) {
            console.error("400: target category does not exist for " + request.to);
            return 400;
        }
        await frames.markNotGhost(gid, request.frame, t);
        const newToBudget = new Money(toRow.budget).plus(request.amount);
        await t.none("update categories set budget = $1 where id = $2 and frame = $3", [newToBudget.string(), request.to, request.frame]);
        return 204 as StatusCodeNoResponse;
    });

}