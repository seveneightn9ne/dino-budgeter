import { FrameIndex, Money, Frame } from "./types";
import { subtract, add, cmp, negate } from "./util";
import { formatMoney } from "../client/util";
import { utils } from "pg-promise";

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
        return `You've overspent your budget in ${this.categoryName} by ${formatMoney(negate(this.balance))}. ` +
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
        this.overspent = subtract(income, budgetedAmount);
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
        this.balance = subtract(income, budgetedAmount);
    }

    message(): string {
        return `You have ${formatMoney(this.balance)} left to budget for the month.`;
    }
}

export function getAIs(frame: Frame): AI[] {
    const ais: AI[] = [];
    const overspends: AI[] = [];
    let totalBudgeted: Money = "0";
    frame.categories.forEach(c => {
        totalBudgeted = add(totalBudgeted, c.budget);
        // if (balance < 0) {
        if (cmp(c.balance, "0") == -1) {
            overspends.push(new OverspentCategory(frame.index, c.name, c.budget, c.balance));
        }
    });
    const cmpIncome = cmp(totalBudgeted, frame.income);
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