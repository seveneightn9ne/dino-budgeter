import {Money, Category} from '../shared/types';
import * as util from './util';

export function updateBalanceWithBudget(category: {
        balance: Money,
        budget: Money,
    }, newBudget: Money): Money {
    return util.add(util.subtract(category.balance, category.budget), newBudget);
}