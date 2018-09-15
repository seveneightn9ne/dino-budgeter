
import {Request, Response} from 'express';
import {User} from '../../shared/types';
import * as user from '../user';

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