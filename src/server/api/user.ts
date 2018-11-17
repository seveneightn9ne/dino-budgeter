
import { Request, Response } from "express";
import Money from "../../shared/Money";
import { wrap } from "../api";
import db from "../db";
import * as user from "../user";

export const handle_auth_redirect_get = function(req: Request, res: Response) {
    res.send({error: "reauth", redirectTo: req.query.redirectTo});
};

export const handle_add_friend_post = wrap(async function(req: Request, res: Response) {
    if (!req.body.email) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const friend = await user.getFriendByEmail(req.body.email, t);
        if (!friend) {
            res.sendStatus(404);
            return;
        }
        await user.addFriend(req.user.uid, friend.uid, t);
        res.send({friend});
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

export const handle_friend_delete = wrap(async function(req: Request, res: Response) {
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
        await user.softDeleteFriendship(req.user.uid, uid, t);
        res.sendStatus(200);
    });
});

export const handle_friend_settle_post = wrap(async function(req: Request, res: Response) {
    const amount = new Money(req.body.amount);
    if (!amount.isValid() || !req.body.email) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const friend = await user.getFriendByEmail(req.body.email, t);
        if (!friend) {
            res.sendStatus(400);
            return;
        }
        const balance = await user.getBalance(req.user.uid, friend.uid, t);
        if (amount.cmp(balance) != 0 && amount.negate().cmp(balance) != 0) {
            res.sendStatus(400);
            console.log("Balance is incorrect, this is retryable");
            return;
        }
        await user.addToBalance(req.user.uid, friend.uid, balance.negate(), t);
        res.sendStatus(200);
    });
});