import * as frames from "./frames";
import Money from "./Money";
import { Frame, FrameIndex, Transaction, TransactionId } from "./types";

export interface AI<A extends Action = null> {
  frame?: FrameIndex;
  message(): string;
  cta?: string;
  action?: A;
}
export interface ChooseCategory {
  type: "choose-category";
  title: string;
  subtype: ChooseCategorySubtype;
}
type ChooseCategorySubtype = SendBalanceData | null;
interface SendBalanceData {
  type: "sendBalance";
  balance: Money;
}
export type Action = ChooseCategory | null;

export class OverspentCategory implements AI {
  constructor(
    public frame: FrameIndex,
    public categoryName: string,
    public budgetedAmount: Money,
    public balance: Money
  ) {}

  public message(): string {
    return (
      `You've overspent your budget in ${
        this.categoryName
      } by ${this.balance.formatted()}. ` +
      `Choose another category to cover it.`
    );
  }
}

export class Overbudgeted implements AI {
  public overspent: Money;

  constructor(
    public frame: FrameIndex,
    public budgetedAmount: Money,
    public income: Money
  ) {
    this.overspent = income.minus(budgetedAmount);
  }

  public message(): string {
    return (
      `You've budgeted ${this.overspent
        .negate()
        .formatted()} more than your income! ` +
      `Increase your income or decrease your budget in a category.`
    );
  }
}

function Underbudgeted(
  frame: FrameIndex,
  budgetedAmount: Money,
  totalToBudget: Money
): AI<ChooseCategory> {
  const balance = totalToBudget.minus(budgetedAmount);
  return {
    frame,
    message: () =>
      `${balance.formatted()} needs to be budgeted into categories.`,
    cta: "Move balance to...",
    action: {
      type: "choose-category",
      title: `Move ${balance.formatted()} to...`,
      subtype: {
        type: "sendBalance",
        balance
      }
    }
  };
}

export class UncategorizedMulti implements AI {
  constructor(public frame: FrameIndex, public tids: TransactionId[]) {}

  public message(): string {
    return this.tids.length > 1
      ? `${this.tids.length} transactions need to be categorized.`
      : `A transaction needs to be categorized.`;
  }
}

export function getAIs(frame: Frame): Array<AI<Action>> {
  const ais: Array<AI<Action>> = [];
  const overspends: Array<AI<Action>> = [];
  frame.categories.forEach(c => {
    if (c.balance.cmp(Money.Zero) === -1) {
      overspends.push(
        new OverspentCategory(frame.index, c.name, c.budget, c.balance.negate())
      );
    }
  });
  const totalBudgeted = frames.budgeted(frame);
  const needsBudgeting = frames.totalToBudget(frame);
  const cmpIncome = totalBudgeted.cmp(needsBudgeting);
  if (cmpIncome === 1) {
    ais.push(new Overbudgeted(frame.index, totalBudgeted, needsBudgeting));
  } else if (cmpIncome === -1) {
    ais.push(Underbudgeted(frame.index, totalBudgeted, needsBudgeting));
  }
  if (ais.length === 0) {
    // Only send ovespends if there aren't bigger problems.
    ais.push(...overspends);
  }
  return ais;
}

export function getTransactionAIs(
  frame: Frame,
  transactions: Transaction[]
): AI[] {
  const ais: AI[] = [];
  const uncategorized: TransactionId[] = [];
  transactions.forEach(transaction => {
    if (!transaction.category && transaction.amount.cmp(Money.Zero) !== 0) {
      uncategorized.push(transaction.id);
    }
  });
  if (uncategorized.length) {
    ais.push(new UncategorizedMulti(frame.index, uncategorized));
  }
  return ais;
}
