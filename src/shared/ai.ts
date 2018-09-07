import { FrameIndex, Money, Frame, TransactionId, Transaction } from "./types";

export interface AI {
    frame: FrameIndex;
    message(): string;
}

export class OverspentCategory implements AI {
    constructor(
        public frame: FrameIndex,
        public categoryName: string,
        public budgetedAmount: Money,
        public balance: Money,
    ) { }

    message(): string {
        return `You've overspent your budget in ${this.categoryName} by ${this.balance.formatted()}. ` +
            `Choose another category to cover it.`;
    }
}

export class Overbudgeted implements AI {
    public overspent: Money;

    constructor(
        public frame: FrameIndex,
        public budgetedAmount: Money,
        public income: Money,
    ) {
        this.overspent = income.minus(budgetedAmount);
    }

    message(): string {
        return `You've budgeted ${this.overspent.negate().formatted()} more than your income! ` +
            `Increase your income or decrease your budget in a category.`;
    }
}

export class Underbudgeted implements AI {
    public balance: Money;

    constructor(
        public frame: FrameIndex,
        public budgetedAmount: Money,
        public income: Money,
    ) {
        this.balance = income.minus(budgetedAmount);
    }

    message(): string {
        return `${this.balance.formatted()} needs to be budgeted into categories.`;
    }
}

export class UncategorizedMulti implements AI {
    constructor(
        public frame: FrameIndex,
        public tids: TransactionId[],
    ) {}

    message(): string {
        return this.tids.length > 1 ?
            `${this.tids.length} transactions need to be categorized.` :
            `A transaction needs to be categorized.`
    }
}

export function getAIs(frame: Frame): AI[] {
    const ais: AI[] = [];
    const overspends: AI[] = [];
    let totalBudgeted = Money.Zero;
    frame.categories.forEach(c => {
        totalBudgeted = totalBudgeted.plus(c.budget);
        // if (balance < 0) {
        if (c.balance.cmp(Money.Zero) == -1) {
            overspends.push(new OverspentCategory(frame.index, c.name, c.budget, c.balance));
        }
    });
    const needsBudgeting = frame.balance.plus(frame.spending);
    console.log("frame balance:", frame.balance.formatted());
    console.log("frame spending: ", frame.spending.formatted());
    console.log("needs budgeting:", needsBudgeting.formatted());
    const cmpIncome = totalBudgeted.cmp(needsBudgeting);
    if (cmpIncome == 1) {
        ais.push(new Overbudgeted(frame.index, totalBudgeted, needsBudgeting));
    } else if (cmpIncome == -1) {
        ais.push(new Underbudgeted(frame.index, totalBudgeted, needsBudgeting));
    }
    if (ais.length == 0) {
        // Only send ovespends if there aren't bigger problems.
        ais.push(...overspends);
    }
    return ais;
}

export function getTransactionAIs(frame: Frame, transactions: Transaction[]): AI[] {
    const ais: AI[] = [];
    const uncategorized: TransactionId[] = [];
    transactions.forEach(transaction => {
        if (!transaction.category) {
            uncategorized.push(transaction.id);
        }
    });
    if (uncategorized.length) {
        ais.push(new UncategorizedMulti(frame.index, uncategorized));
    }
    return ais;
}
