import {Request, Response} from 'express';
import Money from '../../shared/Money';
import db from '../db';
import * as user from '../user';
import {wrap} from '../api';

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
            [from, gid, frame]));
        const toRow = (await t.oneOrNone("select * from categories where id = $1 and gid = $2 and frame = $3",
            [to, gid, frame]));
        if (!fromRow || !toRow) {
            res.sendStatus(400);
            return;
        }
        const newFromBudget = new Money(fromRow.budget).minus(amount);
        const newToBudget = new Money(toRow.budget).plus(amount);
        await t.none("update categories set budget = $1 where id = $2 and frame = $3", [newFromBudget.string(), from, frame]);
        await t.none("update categories set budget = $1 where id = $2 and frame = $3", [newToBudget.string(), to, frame]);
        res.sendStatus(200);
    });

});