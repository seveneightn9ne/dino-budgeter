import {Request, Response} from 'express';
import {User, Money, Category} from '../shared/types';
import db from './db';
import * as frames from './frames';
import * as user from './user';
import * as categories from './categories';
import { utils, txMode } from 'pg-promise';
import * as util from '../shared/util';
import { IncomingMessage, request } from 'http';
import * as transactions from './transactions';

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

export const handle_auth_redirect_get = function(req: Request, res: Response) {
    res.send({error: 'reauth', redirectTo: req.query.redirectTo});
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
        const index = frames.index(Number(req.params.month), Number(req.params.year));
        const frame = await frames.getOrCreateFrame(gid, index, t);
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
        const rows = await t.manyOrNone("select id,category,amount,description,category,date \
        from transactions \
        where gid=$1 \
        and frame=$2 \
        and alive order by date asc", [gid, frame]);
        return rows || [];
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
            "budget) values ($1, $2, $3, $4, $5, $6, $7)", [
                c.id, c.gid, c.frame, c.alive, c.name, c.ordering, c.budget.string()]);
    })
    res.send({category: c});
});

export const handle_category_delete = wrap(async function(req: Request, res: Response) {
    const id = req.body.id;
    const frame = Number(req.body.frame);
    if (!id) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const row = await t.oneOrNone("select * from categories where id = $1 and frame = $2", [id, frame]);
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
        await t.none("update categories set alive = false where id = $1 and frame = $2", [id, frame]);
        res.sendStatus(200);
    });
});

// Does not send the balance
export const handle_categories_get = wrap(async function(req: Request, res: Response): Promise<void> {
    const frame = Number(req.query.frame);
    await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        const rows = await db.manyOrNone("select * from categories where gid = $1 and frame = $2 and alive = true", [gid, frame]);
        const cs = rows.map(categories.fromSerialized);
        res.send({categories: cs});
    })
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
        await t.none("update frames set income = $1 where gid = $2 and index = $3",
            [income.string(), gid, frame]);
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
        // gid included to make sure user has permission to edit this category
        await t.none("update categories set budget = $1 where id = $2 and frame = $3 and gid = $4", [
            amount.string(), id, frame, gid,
        ]);
        res.sendStatus(200);
    });
});

export const handle_category_name_post = wrap(async function(req: Request, res: Response) {
    req.checkBody("id").notEmpty();
    req.checkBody("frame").notEmpty().isNumeric();
    req.checkBody("name").notEmpty().isString();
    const result = await req.getValidationResult();
    if (!result.isEmpty()) {
        console.log(result.mapped());
        res.sendStatus(400);
        return;
    }
    const id = req.body.id;
    const frame = req.body.frame;
    const name =req.body.name;
    await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        // gid included to make sure user has permission to edit this category
        await t.none("update categories set name = $1 where id = $2 and frame = $3 and gid = $4", [
            name, id, frame, gid,
        ]);
        res.sendStatus(200);
    });
});

export const handle_budgeting_move_post = wrap(async function(req: Request, res: Response) {
    req.checkBody("to").notEmpty().isString();
    req.checkBody("from").notEmpty().isString();
    req.checkBody("amount").notEmpty().isNumeric();
    req.checkBody("frame").notEmpty().isNumeric();
    const amount = new Money(req.body.amount);
    const from = req.body.from;
    const to = req.body.to;
    const frame = Number(req.body.frame);
    const result = await req.getValidationResult();
    if (!result.isEmpty() || !amount.isValid()) {
        console.log(result.mapped());
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const gid = await user.getDefaultGroup(req.user, t);
        const fromRow = (await t.oneOrNone("select * from categories where id = $1 and gid = $2 and frame = $3",
            [from, gid, frame])).exists;
        const toRow = (await t.one("select * from categories where id = $1 and gid = $2 and frame = $3",
            [to, gid, frame])).exists;
        if (!fromRow || !toRow) {
            res.sendStatus(400);
            return;
        }
        const newFromBudget = new Money(fromRow.budget).minus(amount);
        const newToBudget = new Money(toRow.budget).plus(amount);
        await t.none("update categories set budget = $1 where id = $2 and frame = $3 limit 1", [newFromBudget, from, frame]);
        await t.none("update categories set budget = $1 where id = $2 and frame = $3 limit 1", [newToBudget, to, frame]);
        res.sendStatus(200);
    });

});