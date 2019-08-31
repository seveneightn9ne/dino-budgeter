import { ErrorResponse } from "typescript-json-api/dist/server/express";
import { ApiRequest } from "typescript-json-api/dist/shared/api";
import { BudgetingMove, Income } from "../../shared/api";
import Money from "../../shared/Money";
import { User } from "../../shared/types";
import db from "../db";
import * as frames from "../frames";
import * as user from "../user";

export function handle_income_post(
  request: ApiRequest<typeof Income>,
  actor: User,
): Promise<null> {
  return db.tx(async (t) => {
    const gid = await user.getDefaultGroup(actor, t);
    await frames.markNotGhost(gid, request.frame, t);
    await t.none(
      "update frames set income = $1 where gid = $2 and index = $3",
      [request.income.string(), gid, request.frame],
    );
    return null;
  });
}

export function handle_budgeting_move_post(
  request: ApiRequest<typeof BudgetingMove>,
  actor: User,
): Promise<ErrorResponse | null> {
  return db.tx(async (t) => {
    const gid = await user.getDefaultGroup(actor, t);
    if (request.from) {
      const fromRow = await t.oneOrNone(
        "select * from categories where id = $1 and gid = $2 and frame = $3",
        [request.from, gid, request.frame],
      );
      if (!fromRow) {
        return {
          code: 400,
          message: `The category ${request.from} does not exist`,
        };
      }
      const newFromBudget = new Money(fromRow.budget).minus(request.amount);
      await t.none(
        "update categories set budget = $1 where id = $2 and frame = $3",
        [newFromBudget.string(), request.from, request.frame],
      );
    }
    const toRow = await t.oneOrNone(
      "select * from categories where id = $1 and gid = $2 and frame = $3",
      [request.to, gid, request.frame],
    );
    if (!toRow) {
      console.error("400: target category does not exist for " + request.to);
      return {
        code: 400,
        message: `Target category does not exist: ${request.to}`,
      };
    }
    await frames.markNotGhost(gid, request.frame, t);
    const newToBudget = new Money(toRow.budget).plus(request.amount);
    await t.none(
      "update categories set budget = $1 where id = $2 and frame = $3",
      [newToBudget.string(), request.to, request.frame],
    );
    return null;
  });
}
