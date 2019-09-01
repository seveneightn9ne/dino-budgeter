import pgPromise from "pg-promise";
import * as payments from "../shared/payments";
import { Charge, Payment, Transaction, User, UserId } from "../shared/types";
import { formatDate } from "../shared/util";
import * as email from "./email";
import * as user from "./user";

export async function newTransaction(
  txn: Transaction,
  addedBy: User,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  if (!txn.split) {
    return;
  }
  const emailAddress = txn.split.with.email;
  const shouldEmail = await user.getSettingOrDefault(
    txn.split.with.uid,
    "emailNewTransaction",
    t,
  );
  if (!shouldEmail) {
    console.log(
      `Skipping new transaction email to ${emailAddress} due to user setting`,
    );
    return;
  }
  const fromName = addedBy.name || addedBy.email;
  const total = txn.amount.plus(txn.split.otherAmount);
  return sendNotification({
    to: emailAddress,
    subject: `"${txn.description}" (${total.formatted()}) added by ${fromName}`,
    body:
      `${fromName} added a new transaction split with you.\n\n` +
      `Description: ${txn.description}\n` +
      `Amount: ${total.formatted()} (you owe ${txn.split.otherAmount.formatted()})\n` +
      `Date: ${formatDate(txn.date)}\n\n` +
      `You can view and modify the transaction at ` +
      `https://dino.jesskenney.com/app/${txn.date.getMonth() +
        1}/${txn.date.getFullYear()}/transactions`,
  });
}

export async function newPayment<T extends Payment | Charge>(
  actor: User,
  recipient: UserId,
  payment: T,
  t: pgPromise.ITask<{}>,
) {
  const fromName = actor.name || actor.email;
  const emailAddress = await user.getEmail(recipient, t);
  const today = new Date();
  return sendNotification({
    to: emailAddress,
    subject: `${fromName} added a ${
      payment.type
    } for ${payment.amount.formatted()}`,

    body:
      payments.description(recipient, actor, payment) +
      ` for "${payment.memo}".\n\n` +
      `You can view and modify the ${payment.type} at ` +
      `https://dino.jesskenney.com/app/${today.getMonth() +
        1}/${today.getFullYear()}/debts`,
  });
}

function sendNotification(opts: { to: string; subject: string; body: string }) {
  return email.send({
    to: opts.to,
    subject: `[Dino] ${opts.subject}`,
    body:
      `${opts.body}\n\n` +
      `You can update your email settings at https://dino.jesskenney.com/app/account\n`,
  });
}
