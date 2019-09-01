import { Charge, Payment, UserId } from "./types";

/**
 * Desription of the payment/charge. You can add " for <something>" after it.
 */
export function description(
  you: UserId,
  them: { name?: string; email: string },
  payment: Payment | Charge,
): string {
  const displayName = them.name || them.email;
  return payment.type === "payment"
    ? payment.payer === you
      ? `You paid ${displayName} ${payment.amount.formatted()}`
      : `${displayName} paid you ${payment.amount.formatted()}`
    : payment.debtor === you
    ? `You charged ${displayName} ${payment.amount.formatted()}`
    : `${displayName} charged you ${payment.amount.formatted()}`;
}
