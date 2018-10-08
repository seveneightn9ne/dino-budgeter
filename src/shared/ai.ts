import { FrameIndex, Frame, TransactionId, Transaction } from "./types";
import Money from './Money';
export interface AI {
    frame?: FrameIndex;
    message(): string;
    cta?: string;
    action?: Action;
}
type Popup = {
    type: 'popup';
    title: string;
    body: string;
    confirm?: string;
    cancel?: string;
    do: () => Promise<void>;
}
type Redirect = {
    type: 'redirect';
    to: string;
}
type Action = Popup | Redirect;

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

export class DebtAI implements AI {
    constructor(
        public email: string,
        public iOwe: Money,
        public doAction: () => Promise<void>,
    ) {}

    message(): string {
        return this.iOwe.cmp(Money.Zero) > 0 ? `You owe ${this.email} ${this.iOwe.formatted()}.` :
            `${this.email} owes you ${this.iOwe.negate().formatted()}`;
    }

    public cta = "Settle";
    public action: Popup = {
        type: 'popup',
        title: 'Mark as settled',
        body: this.iOwe.cmp(Money.Zero) > 0 ?
            `Do this after you've paid ${this.email} ${this.iOwe.formatted()}.` :
            `Do this after ${this.email} has paid you ${this.iOwe.negate().formatted()}.`,
        do: this.doAction,
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
            overspends.push(new OverspentCategory(frame.index, c.name, c.budget, c.balance.negate()));
        }
    });
    const needsBudgeting = frame.balance.plus(frame.spending);
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

