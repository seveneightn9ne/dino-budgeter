import pgPromise from "pg-promise";
import * as shared from "../shared/frames";
import Money from "../shared/Money";
import { Category, Frame, FrameIndex, GroupId } from "../shared/types";
import * as util from "../shared/util";
import * as categories from "./categories";
import db from "./db";
export * from "../shared/frames";
import { getSavings, getSavingsTransactions } from "./savings";

export function getOrCreateFrame(
  gid: GroupId,
  index: FrameIndex,
  t?: pgPromise.ITask<{}>,
): Promise<Required<Frame>> {
  return t
    ? getOrCreateFrameInner(gid, index, t)
    : db.tx((t) => getOrCreateFrameInner(gid, index, t));
}

async function getOrCreateFrameInner(
  gid: GroupId,
  index: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Required<Frame>> {
  const row = await t.oneOrNone(
    "select * from frames where gid = $1 and index = $2 and ghost = false",
    [gid, index],
  );
  if (row.exists) {
    return {
      ...shared.fromSerialized(row),
      categories: await getCategories(gid, index, t),
      balance: await getBalance(gid, index, t),
      spending: await getSpending(gid, index, t),
      savings: await getSavings(gid, index, t),
      savingsTransactions: await getSavingsTransactions(gid, index, t),
    };
  }
  // Delete any ghost if it exists
  await deleteGhost(gid, index, t);
  console.log("creating new frame");
  const frame: Required<Frame> = {
    gid,
    index,
    ghost: true,
    spending: await getSpending(gid, index, t),
    balance: await getBalance(gid, index, t),
    savings: await getSavings(gid, index, t),
    income: Money.Zero, // maybe fill in below
    categories: null, // to fill in below
    savingsTransactions: [],
  };
  const prevFrame = await getPreviousFrame(gid, index, t);
  if (prevFrame) {
    frame.income = prevFrame.income;
    frame.categories = await t.batch(
      (await getCategories(gid, prevFrame.index, t)).map(async (c) => ({
        ...c,
        frame: frame.index,
        balance: c.budget.minus(
          await categories.getSpending(c.id, frame.index, t),
        ),
      })),
    );
    frame.balance = frame.balance.plus(frame.income);
  } else {
    console.log("no previous frame");
    let i = -1;
    frame.categories = await t.batch(
      categories.DEFAULT_CATEGORIES.map(async (c) => {
        i += 1;
        return {
          name: c,
          gid,
          frame: index,
          alive: true,
          id: util.randomId(),
          ghost: true,
          ordering: i,
          budget: Money.Zero,
          balance: Money.Zero,
        };
      }),
    );
  }
  // Save the new frame and categories
  await t.none(
    "insert into frames (gid, index, income, ghost) values ($1, $2, $3, true)",
    [frame.gid, frame.index, frame.income.string()],
  );
  await t.batch(
    frame.categories.map((c) =>
      t.none(
        `insert into categories
          (id, gid, frame, name, ordering, budget, ghost, parent)
        values
          ($1, $2, $3, $4, $5, $6, true, $7)`,
        [c.id, c.gid, c.frame, c.name, c.ordering, c.budget.string(), c.parent],
      ),
    ),
  );
  return frame;
}

async function deleteGhost(
  gid: GroupId,
  index: FrameIndex,
  t: pgPromise.ITask<{}>,
) {
  await t.none(
    "delete from categories where gid = $1 and frame = $2 and ghost = true",
    [gid, index],
  );
  return t.none(
    "delete from frames where gid = $1 and index = $2 and ghost = true",
    [gid, index],
  );
}

export function markNotGhost(
  gid: GroupId,
  index: FrameIndex,
  t: pgPromise.ITask<{}>,
) {
  return t.batch([
    t.none("update frames set ghost = false where gid = $1 and index = $2", [
      gid,
      index,
    ]),
    t.none(
      "update categories set ghost = false where gid = $1 and frame = $2",
      [gid, index],
    ),
  ]);
}

export function getIncome(
  gid: GroupId,
  index: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Money> {
  return t
    .oneOrNone("select income from frames where gid = $1 and index = $2", [
      gid,
      index,
    ])
    .then((row) => {
      return row ? new Money(row.income) : Money.Zero;
    });
}

async function getBalance(
  gid: GroupId,
  index: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Money> {
  const txnRows = await t.manyOrNone(
    `select amount from transactions where gid = $1 and frame = $2 and alive = true`,
    [gid, index],
  );
  const totalSpent = txnRows
    ? Money.sum(txnRows.map((r) => new Money(r.amount)))
    : Money.Zero;

  const incomeRow = await t.oneOrNone(
    `select income from frames where gid = $1 and index = $2`,
    [gid, index],
  );
  const totalIncome = incomeRow ? new Money(incomeRow.income) : Money.Zero;

  const savingsTxns = await getSavingsTransactions(gid, index, t);
  const netSavingsTxns = Money.sum(savingsTxns.map((s) => s.amount));

  return totalIncome.minus(totalSpent).minus(netSavingsTxns);
}

function getSpending(
  gid: GroupId,
  frame: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Money> {
  return t
    .manyOrNone(
      "select amount from transactions where gid = $1 and frame = $2 and alive = true",
      [gid, frame],
    )
    .then((rows) => {
      return rows ? Money.sum(rows.map((r) => new Money(r.amount))) : Money.Zero;
    });
}

function getCategories(
  gid: GroupId,
  frame: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Category[]> {
  return t
    .manyOrNone(
      "select * from categories where gid = $1 and frame = $2 and alive order by ordering asc",
      [gid, frame],
    )
    .then((rows) => {
      return (
        t.batch(
          rows.map(async (row) => {
            const category = categories.fromSerialized(row);
            category.balance = category.budget.minus(
              await categories.getSpending(category.id, frame, t),
            );
            return category;
          }),
        ) || Promise.resolve([])
      );
    });
}

async function getPreviousFrame(
  gid: GroupId,
  index: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Frame | null> {
  const row = await t.oneOrNone(
    "select * from frames where gid = $1 and index < $2 order by index desc limit 1",
    [gid, index],
  );
  return shared.fromSerialized(row);
}
