import {Request, Response} from 'express';
import {User} from '../shared/types';
import db from './db';
import * as frames from './frames';
import * as user from './user';
import { utils } from 'pg-promise';
import * as util from './util';

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
        });
    }).then(frame => {
        res.send(frame);
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
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const amount = util.validateAmount(req.body.amount);
    const tx_id = util.randomId();
    db.tx(t => {
        return user.getDefaultGroup(req.user, t).then(gid => {
            const frame_index = frames.index(req.query.month, req.query.year);
            return t.none("insert into transactions (id, gid, frame, amount, description) values ($1, $2, $3, $4, $5)",
                [tx_id, gid, frame_index, amount, req.body.description]);
        });
    }).then(() => {
        res.send({tx_id: tx_id});
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}