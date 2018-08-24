import {Request, Response} from 'express';
import {User, FrameId} from '../shared/types';
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
        // TODO - combine getDefaultGroup with getOrCreateFrame
        return user.getDefaultGroup(req.user).then((gid) => {
            return frames.getOrCreateFrame(
                gid,
                Number(req.params.month),
                Number(req.params.year),
            );
        });
    }).then(frame => {
        res.send(frame);
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}

export const handle_transaction_post = function(req: Request, res: Response) {
    req.checkQuery("month").notEmpty().isNumeric();
    req.checkQuery("year").notEmpty().isNumeric();
    req.checkBody('amount').notEmpty().isString();
    req.checkBody('description').notEmpty().isString();
    const amount = util.validateAmount(req.body.amount);
    const tx_id = util.randomId();
    db.tx(function* (t) {
        const gid = yield t.one("select gid from membership where uid = $1", [req.user.uid]);
        const frame_id: FrameId = yield* frames.getOrCreateFrame2(t, gid, Number(req.query.month), Number(req.query.year));
        yield t.none("insert into transactions (id, fid, amount, description) values ($1, $2, $3, $3)",
            [tx_id, frame_id, amount, req.body.description]);
    }).then(() => {
        res.send({tx_id: tx_id});
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}