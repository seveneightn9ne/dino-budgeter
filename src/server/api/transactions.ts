import {Request, Response} from 'express';
import Money from '../../shared/Money';
import db from '../db';
import * as user from '../user';
import * as util from '../../shared/util';
import * as transactions from '../transactions';
import {wrap} from '../api';

export const handle_transaction_post = wrap(async function(req: Request, res: Response) {
    req.checkBody("frame").notEmpty().isNumeric();
    req.checkBody('amount').notEmpty().isString();
    req.checkBody('description').notEmpty().isString();
    req.checkBody('date').notEmpty();
    const amount = new Money(req.body.amount);
    const result = await req.getValidationResult();
    if (!result.isEmpty() || !amount.isValid(false /** allowNegative */)) {
        res.sendStatus(400);
        return;
    }
    const tx_id = util.randomId();
    const frame_index = req.body.frame;
    const category = req.body.category;
    const date = new Date(req.body.date);
    await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        await t.none("insert into transactions (id, gid, frame, amount, description, category, date) values ($1, $2, $3, $4, $5, $6, $7)",
            [tx_id, gid, frame_index, amount.string(), req.body.description, category || null, date]);
        res.send({tx_id});
    });
});

export const handle_transaction_delete = wrap(async function(req: Request, res: Response) {
    const id = req.body.id;
    if (!id) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const row = await t.oneOrNone("select * from transactions where id = $1", [id]);
        if (!row) {
            res.sendStatus(400);
            return;
        }
        const transaction = transactions.fromSerialized(row);
        const membership = await t.oneOrNone("select * from membership where uid = $1 and gid = $2", [
            req.user.uid, transaction.gid]);
        if (!membership) {
            res.sendStatus(401);
            return;
        }
        await t.none("update transactions set alive = false where id = $1", [id]);
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
        field: string,
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
        const id = req.body.id;
        await db.tx(async t => {
            const gid = await user.getDefaultGroup(req.user, t);
            // Include gid to make sure the user has permission to the transaction.
            await t.none("update transactions set " + field + " = $1 where id = $2 and gid = $3",
                [transform(value), id, gid]);
        });
        res.sendStatus(200);
    }
}