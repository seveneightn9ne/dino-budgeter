
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
    if (!req.body.email) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const uid = await user.getUserByEmail(req.body.email, t);
        if (!uid) {
            res.sendStatus(404);
            return;
        }
        await user.addFriend(req.user.uid, uid, t);
        res.sendStatus(200);
    });
});

export const handle_reject_friend_post = wrap(async function(req: Request, res: Response) {
    if (!req.body.email || (req.body.email == req.user.email)) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const uid = await user.getUserByEmail(req.body.email, t);
        if (!uid) {
            res.sendStatus(404);
            return;
        }
        await user.deleteFriendship(req.user.uid, uid, t);
        res.sendStatus(200);
    });
});

export const handle_friends_get = wrap(async function(req: Request, res: Response) {
    await db.tx(async t => {
        const friendIds = await user.getFriends(req.user.uid, t);
        const pendingFriendIds = await user.getPendingFriends(req.user.uid, t);
        const inviteIds = await user.getFriendInvites(req.user.uid, t);
        const friends = await user.getEmails(friendIds, t);
        const pending = await user.getEmails(pendingFriendIds, t);
        const invites = await user.getEmails(inviteIds, t);
        res.send({friends: [
                ...friends.map(f => ({email: f, pending: false})),
                ...pending.map(f => ({email: f, pending: true})),
            ],
            invites: invites.map(f => ({email: f})),
        });
    })
});
