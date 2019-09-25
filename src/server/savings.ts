import pgPromise from "pg-promise";
import Money from "../shared/Money";
import { FrameIndex, GroupId, SavingsTransaction } from "../shared/types";
import { randomId } from "../shared/util";

export async function getSavings(
  gid: GroupId,
  index: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Money> {
  const txnRows: Array<{ amount: string }> = await t.manyOrNone(
    `select amount from transactions where gid = $1 and frame < $2 and alive = true`,
    [gid, index],
  );
  const totalSpent = Money.sum(txnRows.map((r) => new Money(r.amount)));

  const incomeRows: Array<{ income: string }> = await t.manyOrNone(
    `select income from frames where gid = $1 and index < $2`,
    [gid, index],
  );
  const totalIncome = Money.sum(incomeRows.map((r) => new Money(r.income)));

  const netSavingsTxns = await getNetSavingsTransactions(gid, index, t);

  return totalIncome.plus(netSavingsTxns).minus(totalSpent);
}

async function getNetSavingsTransactions(
  gid: GroupId,
  through: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<Money> {
  const rows: SavingsTransactionRow[] = await t.manyOrNone(
    "select * from savings_transactions where gid = $1 and frame <= $2",
    [gid, through],
  );
  return Money.sum(rows.map((r) => fromSerialized(r).amount));
}

export async function getSavingsTransactions(
  gid: GroupId,
  frame: FrameIndex,
  t: pgPromise.ITask<{}>,
): Promise<SavingsTransaction[]> {
  const rows: SavingsTransactionRow[] = await t.manyOrNone(
    "select * from savings_transactions where gid = $1 and frame = $2",
    [gid, frame],
  );
  return rows.map(fromSerialized);
}

export async function addSavingsTransaction(
  gid: GroupId,
  frame: FrameIndex,
  amount: Money,
  t: pgPromise.ITask<{}>,
): Promise<SavingsTransaction> {
  const st: SavingsTransaction = {
    gid,
    frame,
    amount,
    id: randomId(),
    ctime: new Date(),
  };
  await t.none(
    "insert into savings_transactions(id, gid, amount, frame) " +
      "values (${id}, ${gid}, ${amount}, ${frame})",
    st,
  );
  return st;
}

interface SavingsTransactionRow {
  id: string;
  gid: string;
  amount: string;
  frame: number;
  ctime: Date;
}
function fromSerialized(row: SavingsTransactionRow): SavingsTransaction {
  return {
    id: row.id,
    gid: row.gid,
    amount: new Money(row.amount),
    frame: row.frame,
    ctime: row.ctime,
  };
}
