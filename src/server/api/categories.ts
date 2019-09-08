import { Response } from "typescript-json-api/dist/server/express";
import { ApiRequest, EmptyResponse } from "typescript-json-api/dist/shared/api";
import {
  AddCategory,
  CategoryBudget,
  CategoryName,
  DeleteCategory,
} from "../../shared/api";
import Money from "../../shared/Money";
import { Category, User } from "../../shared/types";
import * as util from "../../shared/util";
import * as categories from "../categories";
import db from "../db";
import * as frames from "../frames";
import * as user from "../user";

export function handle_category_post(
  request: ApiRequest<typeof AddCategory>,
  actor: User,
): Promise<Response<Category>> {
  const c: Category = {
    frame: request.frame,
    name: request.name,
    id: util.randomId(),
    alive: true,
    budget: Money.Zero,
    balance: Money.Zero,
    ghost: false,
    // To be filled in below:
    gid: undefined,
    ordering: undefined,
  };
  return db.tx(async (t) => {
    c.gid = await user.getDefaultGroup(actor, t);
    c.ordering = await categories.getNextOrdinal(c.gid, c.frame, t);
    await frames.markNotGhost(c.gid, c.frame, t);
    await t.none(
      "insert into categories (id, gid, frame, alive, name, ordering, " +
        "budget, ghost) values ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        c.id,
        c.gid,
        c.frame,
        c.alive,
        c.name,
        c.ordering,
        c.budget.string(),
        c.ghost,
      ],
    );
    return c;
  });
}

export function handle_category_delete(
  request: ApiRequest<typeof DeleteCategory>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  const { id, frame } = request;
  return db.tx(async (t) => {
    const row = await t.oneOrNone(
      "select * from categories where id = $1 and frame = $2",
      [id, frame],
    );
    if (!row) {
      return {
        code: 400,
        message: "Category not found",
      };
    }
    const category = categories.fromSerialized(row);
    const membership = await t.oneOrNone(
      "select * from membership where uid = $1 and gid = $2",
      [actor.uid, category.gid],
    );
    if (!membership) {
      return {
        code: 403,
        message: "User is not in the category's group",
      };
    }
    await frames.markNotGhost(category.gid, request.frame, t);
    await t.none(
      "update categories set alive = false where id = $1 and frame = $2",
      [id, frame],
    );
    return null;
  });
}

export function handle_category_budget_post(
  request: ApiRequest<typeof CategoryBudget>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  const { id, frame, amount } = request;
  return db.tx(async (t) => {
    const gid = await user.getDefaultGroup(actor, t);
    await frames.markNotGhost(gid, request.frame, t);
    // gid included to make sure user has permission to edit this category
    await t.none(
      "update categories set budget = $1 where id = $2 and frame = $3 and gid = $4",
      [amount.string(), id, frame, gid],
    );
    return null;
  });
}

export function handle_category_name_post(
  request: ApiRequest<typeof CategoryName>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  const { id, frame, name } = request;
  return db.tx(async (t) => {
    const gid = await user.getDefaultGroup(actor, t);
    await frames.markNotGhost(gid, request.frame, t);
    // gid included to make sure user has permission to edit this category
    await t.none(
      "update categories set name = $1 where id = $2 and frame = $3 and gid = $4",
      [name, id, frame, gid],
    );
    return null;
  });
}
