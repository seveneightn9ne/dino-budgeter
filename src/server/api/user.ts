
import {Request, Response} from 'express';
import {User} from '../../shared/types';
import * as user from '../user';
import {wrap} from '../api';
import db from '../db';


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

export const handle_add_friend_post = wrap(async function(req: Request, res: Response) {
    req.checkBody("email").isEmail();
    const result = await req.getValidationResult();
    if (!result.isEmpty()) {
        res.sendStatus(400);
        return;
    }
    const uid = await user.getUserByEmail(req.body.email);
    if (!uid) {
        res.sendStatus(404);
    }
    await user.addFriend(req.user.uid, uid);
    res.sendStatus(200);
});

export const handle_friends_get = wrap(async function(req: Request, res: Response) {
    const friends = await user.getFriends(req.user.uid);
    res.send({friends});
});
