import {Request, Response} from 'express';
import {Category} from '../../shared/types';
import Money from '../../shared/Money';
import db from '../db';
import * as user from '../user';
import * as categories from '../categories';
import * as util from '../../shared/util';
import {wrap} from '../api';

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