import {Request, Response} from 'express';
import Money from '../../shared/Money';
import db from '../db';
import * as user from '../user';
import * as util from '../../shared/util';
import * as transactions from '../transactions';
import {wrap} from '../api';
import {UserId, CategoryId, Transaction, Share, TransactionId, SplitId} from '../../shared/types';
import { distributeTotal } from '../../shared/transactions';

export const handle_transaction_post = wrap(async function(req: Request, res: Response) {
    req.checkBody("frame").notEmpty().isNumeric();
    req.checkBody('amount').notEmpty().isString();
    req.checkBody('description').notEmpty().isString();
    req.checkBody('date').notEmpty();
    const amount = new Money(req.body.amount);
    const result = await req.getValidationResult();
    let myShare: Share;
    let theirShare: Share;
    let other: UserId;
    let otherAmount: Money;
    if (!result.isEmpty() || !amount.isValid(false /** allowNegative */)) {
        console.log("Validation failed");
        res.sendStatus(400);
        return;
    }
    if (req.body.split) {
        myShare = new Share(req.body.split.myShare);
        theirShare = new Share(req.body.split.theirShare);
        otherAmount = new Money(req.body.split.otherAmount);
        other = req.body.split.with as string;
        if (!otherAmount.isValid(false) ||
            !myShare.isValid(false) ||
            !theirShare.isValid(false)) {
            console.log("Split validation failed");
            res.sendStatus(400);
            return;
        }
        const total = amount.plus(otherAmount);
        const [calcAmount, calcOtherAmount] = distributeTotal(total, myShare, theirShare);
        if (calcAmount.string() != amount.string() || calcOtherAmount.string() != otherAmount.string()) {
            console.log("Calculated different values for split");
            res.sendStatus(400);
            return;
        }
    }
    const tx_id = util.randomId();
    const frame = req.body.frame;
    const category = req.body.category;
    const date = new Date(req.body.date);
    const description = req.body.description;
    await db.tx(async t => {
        if (other && !await user.isFriend(req.user.uid, other, t)) {
            res.sendStatus(400);
            return;
        }
        const gid = await user.getDefaultGroup(req.user, t);
        const query = "insert into transactions (id, gid, frame, amount, description, category, date) values ($1, $2, $3, $4, $5, $6, $7)";
        await t.none(query,
            [tx_id, gid, frame, amount.string(), req.body.description, category || null, date]);
        let split = undefined;
        if (other) {
            const other_id = util.randomId();
            const other_friend = await user.getFriend(other, t);
            const other_gid = other_friend.gid;
            const other_cat: CategoryId = null;
            const sid = util.randomId();
            await t.batch([
                t.none(query, [other_id, other_gid, frame, otherAmount.string(), req.body.description, other_cat, date]),
                t.none(`insert into shared_transactions (id, payer) values ($1, $2)`, [sid, req.user.uid]),
                t.none(`insert into transaction_splits (tid, sid, share) values ($1, $2, $3)`, [tx_id, sid, myShare.string()]),
                t.none(`insert into transaction_splits (tid, sid, share) values ($1, $2, $3)`, [other_id, sid, theirShare.string()]),
            ]);
            split = {
                id: sid,
                with: other_friend,
                payer: req.user.uid,
                settled: false,
                myShare, theirShare,
                otherAmount,
            }
        }
        const transaction: Transaction = {
            id: tx_id, gid, frame, category, amount, description, alive: true, date, split
        }
        res.send({transaction});
    });
});

type txField = 'amount' | 'date' | 'description' | 'category';
function isSharedField(field: txField): boolean {
    return field == 'date' || field == 'description';
}
function canEditShared(field: txField): boolean {
    return field != 'amount';
}

export const handle_transaction_delete = wrap(async function(req: Request, res: Response) {
    const id = req.body.id;
    if (!id) {
        console.log("No tid");
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        if (!(await transactions.canUserEdit(id, req.user.uid, t))) {
            res.sendStatus(401);
            return;
        }
        await transactions.deleteTransaction(id, t);
        res.sendStatus(200);
    });
});

export const handle_transaction_description_post = wrap(async function(req: Request, res: Response) {
    await handle_transaction_update_post('description')(req, res);
});

export const handle_transaction_amount_post = wrap(async function(req: Request, res: Response) {
    await handle_transaction_update_post('amount',
        s => new Money(s).isValid(),
        s => new Money(s).string())(req, res);
});

export const handle_transaction_date_post = wrap(async function(req: Request, res: Response) {
    await handle_transaction_update_post('date',
        s => !isNaN(new Date(Number(s)).valueOf()),
        s => new Date(Number(s)))(req, res);
});

export const handle_transaction_category_post = wrap(async function(req: Request, res: Response) {
    // TODO: validate that the category exists, is alive, is owned by the user, etc.
    await handle_transaction_update_post('category')(req, res);
});

function handle_transaction_update_post(
        field: txField,
        isValid?: (val: string) => boolean,
        transform?: (val: string) => any,
    ): (req: Request, res: Response) => Promise<void> {
    return async (req: Request, res: Response) => {
        if (!isValid) isValid = (s) => true;
        if (!transform) transform = (s) => s;
        req.checkBody("id").notEmpty().isString();
        req.checkBody(field).notEmpty();
        const result = await req.getValidationResult();
        const value = req.body[field];
        if (!result.isEmpty() || !isValid(value)) {
            res.sendStatus(400);
            return;
        }
        const updateLinked = isSharedField(field);
        if (field == 'amount' && updateLinked == true) {
            console.log("Cannot edit amount on a shared transaction.");
            res.sendStatus(400);
            return;
        }
        const id = req.body.id;
        await db.tx(async t => {
            const existing = await transactions.getTransaction(id, t);
            if (existing.gid != await user.getDefaultGroup(req.user, t)) {
                res.sendStatus(401);
                return;
            }
            if (existing.split && !canEditShared(field)) {
                console.log("Can't edit " + field + " on a shared transaction");
                res.sendStatus(400);
                return;
            }
            const val = transform(value)
            const query = "update transactions set " + field + " = $1 where id = $2";
            await t.none(query, [val, id]);
            if (updateLinked && existing.split) {
                await t.none(query, [val, await transactions.getOtherTid(id, existing.split.id, t)]);
            }
        });
        res.sendStatus(200);
    }
}

export async function handle_transaction_split_post(req: Request, res: Response) {
    const tid: TransactionId = req.body.tid;
    const sid: SplitId = req.body.sid;
    const total = new Money(req.body.total);
    const myShare = new Share(req.body.myShare);
    const theirShare = new Share(req.body.theirShare);
    if (!total.isValid(false) ||
        !myShare.isValid(false) ||
        !theirShare.isValid(false) ||
        !tid || !sid) {
        res.sendStatus(400);
        return;
    }
    const [myAmount, otherAmount] = distributeTotal(total, myShare, theirShare);
    await db.tx(async t => {
        const otherTid = await transactions.getOtherTid(tid, sid, t);
        const work = [
            t.none('update transactions set amount = $1 where id = $2', [myAmount.string(), tid]),
            t.none('update transactions set amount = $1 where id = $2', [otherAmount.string(), otherTid]),
            t.none('update transaction_splits set share = $1 where tid = $2', [myShare.string(), tid]),
            t.none('update transaction_splits set share = $1 where tid = $2', [theirShare.string(), otherTid]),
        ]
        await t.batch(work);
        res.sendStatus(200);
    });
}