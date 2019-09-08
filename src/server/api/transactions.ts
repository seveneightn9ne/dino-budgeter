import { Response } from "typescript-json-api/dist/server/express";
import { ApiRequest, EmptyResponse } from "typescript-json-api/dist/shared/api";
import {
  AddTransaction,
  DeleteTransaction,
  TransactionAmount,
  TransactionCategory,
  TransactionDate,
  TransactionDescription,
  TransactionSplit,
} from "../../shared/api";
import { index } from "../../shared/frames";
import { distributeTotal } from "../../shared/transactions";
import {
  CategoryId,
  Transaction,
  TransactionId,
  User,
} from "../../shared/types";
import * as util from "../../shared/util";
import db from "../db";
import * as frames from "../frames";
import * as notify from "../notify";
import * as payments from "../payments";
import * as transactions from "../transactions";
import * as user from "../user";

export function handle_transaction_post(
  request: ApiRequest<typeof AddTransaction>,
  actor: User,
): Promise<Response<Transaction>> {
  const other = request.split ? request.split.with : undefined;
  const payer = request.split
    ? request.split.iPaid
      ? actor.uid
      : other
    : undefined;
  if (request.split) {
    const total = request.amount.plus(request.split.otherAmount);
    const [calcAmount, calcOtherAmount] = distributeTotal(
      total,
      request.split.myShare,
      request.split.theirShare,
    );
    if (
      calcAmount.string() != request.amount.string() ||
      calcOtherAmount.string() != request.split.otherAmount.string()
    ) {
      return Promise.resolve({
        code: 400,
        message: "Calculated different values for split",
      });
    }
  }
  const tx_id = util.randomId();
  return db.tx(async (t) => {
    if (other && !(await user.isFriend(actor.uid, other, t))) {
      return {
        code: 400,
        message: "You can only split with a friend",
      };
    }
    const gid = await user.getDefaultGroup(actor, t);
    await frames.markNotGhost(gid, request.frame, t);
    const query = `insert into transactions
        (id, gid, frame, amount, description, category, date)
      values
        ($1, $2, $3, $4, $5, $6, $7)`;
    await t.none(query, [
      tx_id,
      gid,
      request.frame,
      request.amount.string(),
      request.description,
      request.category || null,
      request.date,
    ]);
    let split;
    if (other) {
      const other_id = util.randomId();
      const other_friend = await user.getFriend(other, t);
      const other_gid = other_friend.gid;
      const other_cat: CategoryId = null;
      const sid = util.randomId();
      split = {
        id: sid,
        with: other_friend,
        settled: false,
        myShare: request.split.myShare,
        theirShare: request.split.theirShare,
        otherAmount: request.split.otherAmount,
        payer,
      };
      const balance = transactions.getBalance({
        user: actor.uid,
        otherUser: other,
        amount: request.amount,
        otherAmount: request.split.otherAmount,
        payer,
      });
      await t.batch([
        frames.markNotGhost(other_gid, request.frame, t),
        payments.addToBalance(actor.uid, other, balance, t),
        t.none(query, [
          other_id,
          other_gid,
          request.frame,
          request.split.otherAmount.string(),
          request.description,
          other_cat,
          request.date,
        ]),
        t.none(
          `insert into shared_transactions (id, payer, settled) values ($1, $2, true)`,
          [sid, payer],
        ),
        t.none(
          `insert into transaction_splits (tid, sid, share) values ($1, $2, $3)`,
          [tx_id, sid, request.split.myShare.string()],
        ),
        t.none(
          `insert into transaction_splits (tid, sid, share) values ($1, $2, $3)`,
          [other_id, sid, request.split.theirShare.string()],
        ),
      ]);
    }
    const transaction: Transaction = {
      id: tx_id,
      gid,
      frame: request.frame,
      category: request.category,
      amount: request.amount,
      description: request.description,
      alive: true,
      date: request.date,
      split,
    };
    notify.newTransaction(transaction, actor, t);
    return transaction;
  });
}

type txField = "amount" | "date" | "description" | "category";
function isSharedField(field: txField): boolean {
  return field === "date" || field === "description";
}
function canEditShared(field: txField): boolean {
  return field != "amount";
}

export function handle_transaction_delete(
  request: ApiRequest<typeof DeleteTransaction>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  return db.tx(async (t) => {
    if (!(await transactions.canUserEdit(request.id, actor.uid, t))) {
      // Maybe no auth? maybe no exists? maybe no id at all?
      return {
        code: 400,
        message: "You can't edit this transaction.",
      };
    }
    await transactions.deleteTransaction(request.id, t);
    return null;
  });
}

export function handle_transaction_description_post(
  request: ApiRequest<typeof TransactionDescription>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  return handle_transaction_update_post("description", request, actor);
}

export function handle_transaction_amount_post(
  request: ApiRequest<typeof TransactionAmount>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  return handle_transaction_update_post("amount", request, actor, (amount) =>
    amount.string(),
  );
}

export function handle_transaction_date_post(
  request: ApiRequest<typeof TransactionDate>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  return handle_transaction_update_post("date", request, actor);
}

export function handle_transaction_category_post(
  request: ApiRequest<typeof TransactionCategory>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  // TODO: validate that the category exists, is alive, is owned by the user, etc.
  return handle_transaction_update_post(
    "category",
    request,
    actor,
    (c) => c || null,
  );
}

function handle_transaction_update_post<
  Request extends { id: TransactionId },
  Field extends Exclude<keyof Request, "id"> & txField
>(
  field: Field,
  request: Request,
  actor: User,
  transform?: (val: Request[Field]) => Request[Field] | string,
): Promise<Response<EmptyResponse>> {
  const value = request[field];
  if (!transform) {
    transform = (s) => s;
  }
  const updateLinked = isSharedField(field);
  const id = request.id;
  return db.tx(async (t) => {
    const existing = await transactions.getTransaction(id, t);
    if (existing.gid !== (await user.getDefaultGroup(actor, t))) {
      return {
        code: 403,
        message: "The transaction is not in your group",
      };
    }
    if (existing.split && !canEditShared(field)) {
      return {
        code: 400,
        message: "Can't edit " + field + " on a shared transaction",
      };
    }
    const val = transform(value);
    const query = "update transactions set " + field + " = $1 where id = $2";
    await t.none(query, [val, id]);
    let otherTid: TransactionId;
    if (updateLinked && existing.split) {
      otherTid = await transactions.getOtherTid(id, existing.split.id, t);
      await t.none(query, [val, otherTid]);
    }
    // Update the frame with the date
    if (field === "date") {
      if (!(val instanceof Date)) {
        throw new Error("How can I update date when it's not a date");
      }
      const newFrame = index(val.getMonth(), val.getFullYear());
      await frames.markNotGhost(existing.gid, newFrame, t);
      if (updateLinked && existing.split) {
        await frames.markNotGhost(
          await transactions.getGid(otherTid, t),
          newFrame,
          t,
        );
      }
      await t.none("update transactions set frame = $1 where id = $2", [
        newFrame,
        id,
      ]);
    }
    return null;
  });
}

export function handle_transaction_split_post(
  request: ApiRequest<typeof TransactionSplit>,
  actor: User,
): Promise<Response<EmptyResponse>> {
  const { tid, sid, total, myShare, theirShare } = request;
  const [myAmount, otherAmount] = distributeTotal(total, myShare, theirShare);
  return db.tx(async (t) => {
    const otherTid = await transactions.getOtherTid(tid, sid, t);
    const otherUid = await transactions.getUser(otherTid, t);
    const payer = request.iPaid ? actor.uid : otherUid;

    // Update the friendship balance
    const prevBalance = await transactions.getBalanceFromDb(tid, t);
    const newBalance = transactions.getBalance({
      user: actor.uid,
      otherUser: otherUid,
      amount: myAmount,
      otherAmount,
      payer,
    });
    const balanceDelta = newBalance.minus(prevBalance);

    const work = [
      payments.addToBalance(actor.uid, otherUid, balanceDelta, t),
      t.none("update transactions set amount = $1 where id = $2", [
        myAmount.string(),
        tid,
      ]),
      t.none("update transactions set amount = $1 where id = $2", [
        otherAmount.string(),
        otherTid,
      ]),
      t.none("update transaction_splits set share = $1 where tid = $2", [
        myShare.string(),
        tid,
      ]),
      t.none("update transaction_splits set share = $1 where tid = $2", [
        theirShare.string(),
        otherTid,
      ]),
      t.none("update shared_transactions set payer = $1 where id = $2", [
        payer,
        sid,
      ]),
    ];
    await t.batch(work);
    return null;
  });
}
