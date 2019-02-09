import * as categories from "./categories";
import Money from "./Money";
import { Frame, FrameIndex } from "./types";

export function index(month: number, year: number): FrameIndex {
    return (year - 1970) * 12 + month;
}

export function month(frame: FrameIndex): number {
    return frame % 12;
}

export function year(frame: FrameIndex): number {
    return Math.floor(frame / 12) + 1970;
}

export function updateBalanceWithIncome(balance: Money, income: Money, newIncome: Money): Money {
    return balance.minus(income).plus(newIncome);
}

/**
 * Sum of money budgeted into categories in this frame
 */
export function budgeted(frame: Frame): Money {
    let totalBudgeted = Money.Zero;
    frame.categories.forEach(c => {
        totalBudgeted = totalBudgeted.plus(c.budget);
    });
    return totalBudgeted;
}

/**
 * The total amount of money that must be budgeted.
 * (Doesn't consider what has or has not been budgeted)
 */
export function totalToBudget(frame: Frame): Money {
    return frame.balance.plus(frame.spending);
}

/**
 * Sum of money that needs to be budgeted into categories in this frame.
 * If you are overbudgeted, returns zero.
 */
export function unbudgeted(frame: Frame): Money {
    if (!frame.balance || !frame.spending) {
        throw new Error("Frame needs balance & spending to calculate unbudgeted");
    }

    const needsBudgeting = totalToBudget(frame);
    const totalBudgeted = budgeted(frame);
    const cmp = needsBudgeting.cmp(totalBudgeted);
    if (cmp <= 0) {
        return Money.Zero;
    }
    return needsBudgeting.minus(totalBudgeted);
}

/** Works with a DB row or a JSON parsed object */
export function fromSerialized(row: any): Frame {
    if (!row) {
        return null;
    }
    const frame: Frame = {...row};
    if (row.income) {
        frame.income = new Money(row.income);
    }
    if (row.balance) {
        frame.balance = new Money(row.balance);
    }
    if (row.categories) {
        frame.categories = row.categories.map(categories.fromSerialized);
    }
    if (row.spending) {
        frame.spending = new Money(row.spending);
    }
    return frame;
}