import _ from "lodash";
import Money from "../shared/Money";
import * as util from "../shared/util";
import { getNextOrdinal } from "./categories";
import db from "./db";

// Add all migrations here to run them
// They must be idempotent
export async function runMigrations() {
  await migrateAddFriendshipBalance();
  await migrateAddPaymentId();
  await migrateAddSavingsCategory();
}

async function migrateAddSavingsCategory() {
  await db.tx(async (t) => {
    // Find frame/gid with no savings category
    const queryFramesNeedingSavings = `
      select frames.index, frames.gid, frames.ghost from frames
      left join categories on
        frames.index = categories.frame and
        frames.gid = categories.gid and
        categories.alive = true and
        categories.savings = true
      group by frames.index, frames.gid
      having count(categories.id) = 0`;
    const rows = await t.manyOrNone(queryFramesNeedingSavings);

    if (!rows || !rows.length) {
      return;
    }

    console.log(
      `Migrating savings category: ${rows.length} frames need savings added`,
    );

    for (const row of rows) {
      const { index, gid, ghost } = row;
      // does it have a 'Savings' category
      const nameRow = await t.oneOrNone(
        `select id from categories
            where
              name = 'Savings' and
              frame = $1 and
              gid = $2
            limit 1`,
        [index, gid],
      );
      if (nameRow) {
        // Set this category to be savings
        const { id } = nameRow;
        console.log(`Migrating savings category: setting ${id} to savings`);
        await t.none(
          `update categories set savings = true where id = $1 and frame = $2 and gid = $3`,
          [id, index, gid],
        );
      } else {
        // Add a new category
        console.log(
          `Migrating savings category: adding a new savings category to ${gid}/${index}`,
        );
        const ordinal = await getNextOrdinal(gid, index, t);
        const id = util.randomId();
        console.log(
          `\tNew category will have ordinal = ${ordinal} and id = ${id}`,
        );
        await t
          .one(
            "insert into categories (id, gid, frame, alive, name, ordering, " +
              "budget, ghost, savings) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id",
            [
              id,
              gid,
              index,
              true /* alive */,
              "Savings",
              ordinal,
              Money.Zero.string(),
              ghost,
              true, /* savings */
            ],
          )
          .then((r) => console.log("Promise resolved", r))
          .catch((e) => console.error(e));
        console.log("Insert completed");
      }
    }

    // Now, verify that there are no frames needing savings
    const newRows = await t.manyOrNone(queryFramesNeedingSavings);
    if (newRows && newRows.length !== 0) {
      throw Error(
        "DB migration failed: should be no frames without savings. There are " +
          newRows.length,
      );
    }
  });
}

async function migrateAddFriendshipBalance() {
  await db.tx(async (t) => {
    const rows = await t.manyOrNone(`
        select M.uid, M2.uid as other_uid, ST.id as sid, T2.amount as other_amount from transaction_splits TS
        left join shared_transactions ST on ST.id = TS.sid
        left join transactions T on T.id = TS.tid
        left join membership M on M.gid = T.gid
        left join transaction_splits TS2 on TS.sid = TS2.sid and TS.tid != TS2.tid
        left join transactions T2 on TS2.tid = T2.id
        left join membership M2 on T2.gid = M2.gid
        where
          ST.settled = false and
          T.alive = true and
          M.uid = ST.payer`);
    const balances: { [uid: string]: { [uid: string]: Money } } = {};
    const work: Array<Promise<any>> = [];
    rows.forEach((row) => {
      // balance: u1 owes u2.
      const owed = new Money(row.other_amount);
      const payer = row.uid;
      const [u1, u2] = [row.uid, row.other_uid].sort();
      const u1_owes_u2 = payer === u1 ? owed.negate() : owed;
      if (balances[u1] === undefined) {
        balances[u1] = {};
      }
      if (balances[u1][u2] === undefined) {
        balances[u1][u2] = Money.Zero;
      }
      balances[u1][u2] = balances[u1][u2].plus(u1_owes_u2);
      work.push(
        t.none(`update shared_transactions set settled = true where id = $1`, [
          row.sid,
        ]),
      );
    });
    _.forEach(balances, (u2s, u1) => {
      _.forEach(u2s, (balance, u2) => {
        console.log(
          `Migrating balance: ${u1} owes ${u2} ${balance.formatted()}`,
        );
        work.push(
          t.none(
            `update friendship set balance = $1 where u1 = $2 and u2 = $3`,
            [balance.string(), u1, u2],
          ),
        );
      });
    });
    await t.batch(work);
  });
}

async function migrateAddPaymentId() {
  let totalRows = 0;
  let expectedRows = 0;
  await db.tx(async (t) => {
    const rows = await t.manyOrNone(
      "select round(extract(epoch from ctime)) as epoch from payments where id is null",
    );
    expectedRows = rows.length;
    await t.batch(
      rows.map(async (row) => {
        const args = [util.randomId(), row.epoch];
        const result = await t.result(
          `update payments set id = $1
          where round(extract(epoch from ctime)) = $2`,
          args,
        );
        totalRows += result.rowCount;
        if (result.rowCount !== 1) {
          console.warn(
            `Migration to add IDs to payments got an unexpected result: an update affected ${result.rowCount} rows.`,
          );
        }
      }),
    );
  });
  if (expectedRows !== totalRows) {
    console.warn(
      `Expected to affect ${expectedRows} rows but affected ${totalRows} rows!`,
    );
  }
  if (totalRows > 0) {
    console.log(`Migration added ID to ${totalRows} payments`);
  }
}
