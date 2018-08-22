import {Request, Response} from 'express';
import {User} from '../shared/types';
import db from './db';

export const handle_current_email_get = function(req: Request, res: Response) {
    res.send({email: (req.user as User).email});
}

export const handle_groups_get = function(req: Request, res: Response) {
    // TODO the query.
    db.many("select * from groups where ????", [req.user.uid]).then((rows) => {
        res.send({groups: rows.map(row => row.group_id)});
    });
}