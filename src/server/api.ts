import {Request, Response} from 'express';
import {User} from '../shared/types';
import db from './db';
import * as frames from './frames';
import * as user from './user';

export const handle_current_email_get = function(req: Request, res: Response) {
    res.send({email: (req.user as User).email});
}

export const handle_groups_get = function(req: Request, res: Response) {
    user.getGroups(req.user).then(groups => {
        res.send({groups});
    });
}

export const handle_frame_get = function(req: Request, res: Response) {
    req.checkQuery("gid").notEmpty();
    req.checkQuery("month").isNumeric();
    req.checkQuery("year").isNumeric();
    req.getValidationResult().then((result) => {
        if (!result.isEmpty()) {
            res.sendStatus(400);
            return;
        }
        return user.isUserInGroup(req.user, req.body.gid);
    }).then(isUserInGroup => {
        if (!isUserInGroup) {
            res.sendStatus(401);
            return;
        }
        return frames.getOrCreateFrame(
            req.body.gid,
            Number(req.body.month),
            Number(req.body.year),
        );
    }).then(frame => {
        res.send(frame);
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}