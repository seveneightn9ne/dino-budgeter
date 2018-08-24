import {Request, Response} from 'express';
import {User} from '../shared/types';
import db from './db';

export const handle_current_email_get = function(req: Request, res: Response) {
    res.send({email: (req.user as User).email});
}

export const handle_groups_get = function(req: Request, res: Response) {
    db.many("select gid from membership where uid=$1", [req.user.uid]).then((rows) => {
        res.send({groups: rows.map(row => row.gid)});
    });
}