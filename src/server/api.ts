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
    req.checkQuery("month").isNumeric();
    req.checkQuery("year").isNumeric();
    req.getValidationResult().then((result) => {
        if (!result.isEmpty()) {
            res.sendStatus(400);
            return;
        }
        // TODO - combine getDefaultGroup with getOrCreateFrame
        return user.getDefaultGroup(req.user).then((gid) => {
            return frames.getOrCreateFrame(
                gid,
                Number(req.query.month),
                Number(req.query.year),
            );
        });
    }).then(frame => {
        res.send(frame);
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
}
