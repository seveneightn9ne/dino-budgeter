import Money from "../shared/Money";
import { Category } from "../shared/types";

export function updateBalanceWithBudget(category: {
        balance?: Money,
        budget: Money,
    }, newBudget: Money): Money {
    if (!category.balance) throw new Error("balance is required");
    return category.balance.minus(category.budget).plus(newBudget);
}

export function fromSerialized(row: any): Category {
    if (!row) {
        return null;
    }
    const category: Category = {...row};
    if (row.budget) {
        category.budget = new Money(row.budget);
    }
    if (row.balance) {
        category.balance = new Money(row.balance);
    }
    return category;
}