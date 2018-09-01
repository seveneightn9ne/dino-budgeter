import { FrameIndex, Money, Frame } from "./types";

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
        return `You've budgeted more than your income! Increase your income or decrease your budget in a category.`;
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
        return `You have ${this.balance.formatted()} left to budget for the month.`;
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
    const cmpIncome = totalBudgeted.cmp(frame.income);
    if (cmpIncome == 1) {
        ais.push(new Overbudgeted(frame.index, totalBudgeted, frame.income));
    } else if (cmpIncome == -1) {
        ais.push(new Underbudgeted(frame.index, totalBudgeted, frame.income));
    }
    if (ais.length == 0) {
        // Only send ovespends if there aren't bigger problems.
        ais.push(...overspends);
    }
    return ais;
}