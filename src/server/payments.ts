import _ from "lodash";
import pgPromise from "pg-promise";
import Money from "../shared/Money";
import {
  Charge,
  FrameIndex,
  Payment,
  PaymentId,
  UserId,
} from "../shared/types";
import * as util from "../shared/util";

export async function addToBalance(
  u1: UserId,
  u2: UserId,
  amount: Money,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  [u1, u2] = [u1, u2].sort();
  const row = await t.one(
    `select balance from friendship where u1 = $1 and u2 = $2`,
    [u1, u2],
  );
  const balance = new Money(row.balance).plus(amount);
  await t.none(`update friendship set balance = $1 where u1 = $2 and u2 = $3`, [
    balance.string(),
    u1,
    u2,
  ]);
}

export async function getBalance(
  u1: UserId,
  u2: UserId,
  t: pgPromise.ITask<{}>,
): Promise<Money> {
  [u1, u2] = [u1, u2].sort();
  const row = await t.oneOrNone(
    `select balance, alive from friendship where u1 = $1 and u2 = $2`,
    [u1, u2],
  );
  if (row && row.balance && row.alive) {
    return new Money(row.balance);
  }
  return Money.Zero;
}

export async function getBalances(
  user: UserId,
  t: pgPromise.ITask<{}>,
): Promise<{ [uid: string]: Money }> {
  const rows = await t.manyOrNone(
    `select * from friendship where u1 = $1 or u2 = $1`,
    [user],
  );
  const ret: { [uid: string]: Money } = {};
  rows.forEach((row) => {
    const balance = new Money(row.balance);
    if (!row.alive && balance.cmp(Money.Zero) == 0) {
      // Deleted friendship with no balance - ignore.
      return;
    }
    const otherUser = row.u1 == user ? row.u2 : row.u1;
    ret[otherUser] = balance;
  });
  return ret;
}

export async function addPayment(
  frame: FrameIndex,
  from: UserId,
  to: UserId,
  memo: string,
  amount: Money,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  const [u1, u2] = [from, to].sort();
  // Jess pays Miles $10.
  // If Jess is u1, the balance should decrease by $10.
  if (u1 === from) {
    amount = amount.negate();
  }
  return addPaymentInner(
    util.randomId(),
    frame,
    u1,
    u2,
    memo,
    amount,
    false,
    t,
  );
}

export async function addCharge(
  frame: FrameIndex,
  debtor: UserId,
  debtee: UserId,
  memo: string,
  amount: Money,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  const [u1, u2] = [debtor, debtee].sort();
  // Miles owes Jess $10, so Jess is the debtor.
  // If Jess is u1, the balance should decrease by $10.
  if (u1 === debtor) {
    amount = amount.negate();
  }
  return addPaymentInner(util.randomId(), frame, u1, u2, memo, amount, true, t);
}

/** u1, u2 must be sorted */
async function addPaymentInner(
  id: PaymentId,
  frame: FrameIndex,
  u1: UserId,
  u2: UserId,
  memo: string,
  amount: Money,
  isCharge: boolean,
  t: pgPromise.ITask<{}>,
) {
  await t.none(
    "insert into payments (id, friendship_u1, friendship_u2, amount, is_charge, memo, frame) values ($1, $2, $3, $4, $5, $6, $7)",
    [id, u1, u2, amount.string(), isCharge, memo, frame],
  );
  await addToBalance(u1, u2, amount, t);
}

export async function getPayments(
  u1: UserId,
  u2: UserId,
  t: pgPromise.ITask<{}>,
  frame?: FrameIndex,
): Promise<Array<Payment | Charge>> {
  [u1, u2] = [u1, u2].sort();
  let rows;
  if (frame) {
    rows = await t.manyOrNone(
      "select * from payments where friendship_u1 = $1 and friendship_u2 = $2 and frame = $3",
      [u1, u2, frame],
    );
  } else {
    rows = await t.manyOrNone(
      "select * from payments where friendship_u1 = $1 and friendship_u2 = $2",
      [u1, u2],
    );
  }
  return _.reverse(
    _.sortBy(
      rows.map((row) => {
        const date = new Date(row.ctime);
        const memo = row.memo;
        const frame = row.frame;
        const id = row.id;
        let amount = new Money(row.amount);
        if (row.is_charge) {
          // amount is what u1 owes u2. so u1 is the debtee by default.
          let debtor = u2;
          let debtee = u1;
          if (amount.cmp(Money.Zero) == -1) {
            amount = amount.negate();
            debtor = u1;
            debtee = u2;
          }
          return {
            type: "charge",
            debtor,
            debtee,
            amount,
            date,
            memo,
            frame,
            id,
          } as Charge;
        } else {
          // amount is what u1 owes u2. so u2 is the payer by default.
          let payer = u2;
          let payee = u1;
          if (amount.cmp(Money.Zero) == -1) {
            amount = amount.negate();
            payer = u1;
            payee = u2;
          }
          return {
            type: "payment",
            payer,
            payee,
            amount,
            date,
            memo,
            frame,
            id,
          } as Payment;
        }
      }),
      "date", /* sortBy */
    ),
  );
}
