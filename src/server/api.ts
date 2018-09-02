import {Request, Response} from 'express';
import {User, Money, Category} from '../shared/types';
import db from './db';
import * as frames from './frames';
import * as user from './user';
import * as categories from './categories';
import { utils } from 'pg-promise';
import * as util from '../shared/util';
import { IncomingMessage, request } from 'http';

// Wrap an async handler to be called synchronously
export const wrap = function(handler: (req: Request, res: Response)=>Promise<void>): (req: Request, res: Response)=>void {
    return function(req: Request, res: Response, ) {
        handler(req, res).catch((err) => {
            console.log("Error (caught)", err);
            const status = 500;
            res.status(status).send({
                "error": {
                    "status": status,
                    "message": "internal server error",
                }
            });
        })
    };
}

export const handle_current_email_get = function(req: Request, res: Response) {
    res.send({email: (req.user as User).email});
}

export const handle_groups_get = function(req: Request, res: Response) {
    user.getGroups(req.user).then(groups => {
        res.send({groups});
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}

export const handle_frame_get = wrap(async function(req: Request, res: Response): Promise<void> {
    req.checkParams("month").isNumeric();
    req.checkParams("year").isNumeric();
    let result = await req.getValidationResult();
    if (!result.isEmpty()) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        const frame = await frames.getOrCreateFrame(gid, frames.index(
            Number(req.params.month),
            Number(req.params.year)));
        res.send(frame);
    });
});

export const handle_transactions_get = wrap(async function(req: Request, res: Response): Promise<void> {
    req.checkQuery("frame").notEmpty().isNumeric();
    let result = await req.getValidationResult()
    if (!result.isEmpty()) {
        const status = 400;
        res.status(status).send({
            "error": {
                "status": status,
                "message": "invalid parameters",
                "details": result.mapped(),
            }
        });
        return;
    }
    const frame = Number(req.query.frame);
    const transactions = await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        const rows = await t.many("select id,category,amount,description,date \
        from transactions \
        where gid=$1 \
        and frame=$2 \
        and alive", [gid, frame]);
        return rows;
    })
    res.json({transactions});
});

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
        const frameRow = await t.one("select balance from frames where gid = $1 and index = $2", [gid, frame_index]);
        const newBalance = new Money(frameRow.balance).minus(amount);
        // TODO if the transaction is in not-the-newest frame, the more recent frames need their balances updated.
        const work = [
            t.none("insert into transactions (id, gid, frame, amount, description, date) values ($1, $2, $3, $4, $5, $6)",
                [tx_id, gid, frame_index, amount.string(), req.body.description, date]),
            t.none("update frames set balance = $1 where gid = $2 and index = $3",
                [newBalance.string(), gid, frame_index])];
        const catRow = await t.oneOrNone("select balance from categories where id = $1 and frame = $2", [category, frame_index]);
        if (catRow) {
            const newBalance = new Money(catRow.balance).minus(amount);
            work.push(t.none("update categories set balance = $1 where id = $2 and frame = $3", [newBalance.string(), category, frame_index]));
        }
        await t.batch(work);
        res.send({tx_id});
    });
});

export const handle_category_post = wrap(async function(req: Request, res: Response) {
    req.checkBody("frame").notEmpty().isNumeric();
    req.checkBody("name").notEmpty();
    const result = await req.getValidationResult();
    if (!result.isEmpty()) {
        console.log(result.mapped());
        res.sendStatus(400);
        return;
    }
    const c: Partial<Category> = {
        frame: Number(req.body.frame),
        name: req.body.name,
        id: util.randomId(),
        alive: true,
        budget: Money.Zero,
        balance: Money.Zero,
    }
    await db.tx(async t => {
        c.gid = await user.getDefaultGroup(req.user, t);
        c.ordering = await categories.getNextOrdinal(c.gid, c.frame, t);
        await t.none("insert into categories (id, gid, frame, alive, name, ordering, " +
            "budget, balance) values ($1, $2, $3, $4, $5, $6, $7, $8)", [
                c.id, c.gid, c.frame, c.alive, c.name, c.ordering, c.budget.string(), c.balance.string()]);
        
    })
    res.send({category: c});
});

export const handle_category_delete = wrap(async function(req: Request, res: Response) {
    const id = req.body.id;
    if (!id) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const row = await t.oneOrNone("select * from categories where id = $1", [req.body.id]);
        if (!row) {
            res.sendStatus(400);
            return;
        }
        const category = categories.fromSerialized(row);
        const membership = await t.oneOrNone("select * from membership where uid = $1 and gid = $2", [
            req.user.uid, category.gid]);
        if (!membership) {
            res.sendStatus(401);
            return;
        }
        await t.none("update categories set alive = false where id = $1", [id]);
        res.sendStatus(200);
    });
});

export const handle_income_post = wrap(async function(req: Request, res: Response): Promise<void> {
    req.checkBody("frame").isNumeric();
    req.checkBody("income").isNumeric();
    const result = await req.getValidationResult()
    if (!result.isEmpty()) {
        res.sendStatus(400);
        return;
    }
    const income = new Money(req.body.income);
    if (!income.isValid()) {
        res.sendStatus(400);
        return;
    }
    const frame = Number(req.body.frame);
    await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        const prevIncome = await frames.getIncome(gid, frame, t);
        const prevBalance = await frames.getBalance(gid, frame, t);
        const newBalance = frames.updateBalanceWithIncome(prevBalance, prevIncome, income);
        await t.none("update frames set income = $1, balance = $2 where gid = $3 and index = $4",
            [income.string(), newBalance.string(), gid, frame]);
        res.sendStatus(200);
    });
});

export const handle_category_budget_post = wrap(async function(req: Request, res: Response) {
    req.checkBody("id").notEmpty();
    req.checkBody("frame").notEmpty().isNumeric();
    req.checkBody("amount").notEmpty().isNumeric();
    const result = await req.getValidationResult();
    if (!result.isEmpty()) {
        console.log(result.mapped());
        res.sendStatus(400);
        return;
    }
    const id = req.body.id;
    const frame = req.body.frame;
    const amount = new Money(req.body.amount);
    if (!amount.isValid(false /** allowNegative */)) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        const prevBalance = await categories.getBalance(id, frame, t);
        const prevBudget = await categories.getBudget(id, frame, t)
        const prevCat = {balance: prevBalance, budget: prevBudget};
        const newBalance = categories.updateBalanceWithBudget(prevCat, amount);
        // gid included to make sure user has permission to edit this category
        await t.none("update categories set budget = $1, balance = $2 where id = $3 and frame = $4 and gid = $5", [
            amount.string(), newBalance.string(), id, frame, gid,
        ]);
        res.sendStatus(200);
    });
});