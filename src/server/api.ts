import {Request, Response} from 'express';
import {User} from '../shared/types';
import db from './db';
import * as frames from './frames';
import * as user from './user';
import * as categories from './categories';
import { utils } from 'pg-promise';
import * as util from '../shared/util';

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

export const handle_frame_get = function(req: Request, res: Response) {
    req.checkParams("month").isNumeric();
    req.checkParams("year").isNumeric();
    req.getValidationResult().then((result) => {
        if (!result.isEmpty()) {
            res.sendStatus(400);
            return;
        }
        return db.tx(t => {
            return user.getDefaultGroup(req.user, t).then(gid => {
                return frames.getOrCreateFrame(gid, frames.index(
                    Number(req.params.month),
                    Number(req.params.year)));
            });
        }).then(frame => {
            res.send(frame);
        });
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}

export const handle_transaction_post = function(req: Request, res: Response) {
    req.checkBody("month").notEmpty().isNumeric();
    req.checkBody("year").notEmpty().isNumeric();
    req.checkBody('amount').notEmpty().isString();
    req.checkBody('description').notEmpty().isString();
    // TODO actually do the validation
    const amount = util.validateAmount(req.body.amount);
    const tx_id = util.randomId();
    db.tx(t => {
        return user.getDefaultGroup(req.user, t).then(gid => {
            const frame_index = frames.index(req.body.month, req.body.year);
            return Promise.all([
                t.none("insert into transactions (id, gid, frame, amount, description) values ($1, $2, $3, $4, $5)",
                    [tx_id, gid, frame_index, amount, req.body.description]),
                t.none("update frames set balance = balance - $1 where gid = $2 and index = $3",
                    [amount, gid, frame_index])]);
        });
    }).then(() => {
        res.send({tx_id: tx_id});
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}

export const handle_category_post = function(req: Request, res: Response) {
    req.checkBody("frame").notEmpty().isNumeric();
    req.checkBody("name").notEmpty();
    req.getValidationResult().then((result) => {
        if (!result.isEmpty()) {
            console.log(result.mapped());
            res.sendStatus(400);
            return;
        }
        const frame_index = Number(req.body.frame);
        const name = req.body.name;
        const id = util.randomId();
        db.tx(t => {
            return user.getDefaultGroup(req.user, t).then(gid => {
                return categories.getNextOrdinal(gid, frame_index, t).then(ord => {
                    return t.none("insert into categories (id, gid, frame, alive, name, ordering, " +
                        "budget, balance) values ($1, $2, $3, $4, $5, $6, $7, $8)", [
                            id, gid, frame_index, true, name, ord, "0", "0",
                        ]).then(() => ({
                            gid, id, name, frame: frame_index, alive: true, ordering: ord, budget: "0", balance: "0",
                        }));
                });
            });
        }).then(category => res.send({category}));
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}

export const handle_category_delete = function(req: Request, res: Response) {
    const id = req.body.id;
    if (!id) {
        res.sendStatus(400);
        return;
    }
    db.tx(t => {
        return t.oneOrNone("select * from categories where id = $1", [req.body.id]).then(category => {
            if (!category) {
                res.sendStatus(400);
                return;
            } 
            return t.oneOrNone("select * from membership where uid = $1 and gid = $2", [
                req.user.uid, category.gid]).then(membership => {
                    if (!membership) {
                        res.sendStatus(401);
                        return;
                    } 
                    return t.none("update categories set alive = false where id = $1", [id]).then(() => {
                        res.sendStatus(200);
                    });
            });
        });
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}

export const handle_category_budget_post = function(req: Request, res: Response) {
    req.checkBody("id").notEmpty();
    req.checkBody("frame").notEmpty().isNumeric();
    req.checkBody("amount").notEmpty().isNumeric();
    req.getValidationResult().then((result) => {
        if (!result.isEmpty()) {
            console.log(result.mapped());
            res.sendStatus(400);
            return;
        }
        const id = req.body.id;
        const frame = req.body.frame;
        // TODO canonicalize amount
        const amount = req.body.amount;
        db.tx(t => {
            return user.getDefaultGroup(req.user, t).then(gid => {
                return categories.getBalance(id, frame, t).then(prevBalance => {
                    return categories.getBudget(id, frame, t).then(prevBudget => {
                        const prevCat = {balance: prevBalance, budget: prevBudget};
                        const newBalance = categories.updateBalanceWithBudget(prevCat, amount);
                        // gid included to make sure user has permission to edit this category
                        return t.none("update categories set budget = $1, balance = $2 where id = $3 and frame = $4 and gid = $5", [
                            amount, newBalance, id, frame, gid,
                        ]);
                    });
                });
            });
        }).then(() => res.sendStatus(200));
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}
