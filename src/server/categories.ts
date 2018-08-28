import {Frame, GroupId, Money} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';
import {randomId} from './util';

export const DEFAULT_CATEGORIES = [
    "Rent",
    "Gas",
    "Electric",
    "Internet",
    "Cell Phone",
    "Transportation",
    "Debt Payments",
    "Groceries",
    "Clothing",
    "Charity",
    "Gifts",
    "Vacation & Travel",
    "Shopping",
    "Restaurants",
    "Stuff I Forgot To Budget For",
];

