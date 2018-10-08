import {InitState, GroupId} from '../shared/types';
import {Request, Response} from 'express';
import db from './db';
import * as frames from './frames';
import * as transactions from './transactions';
import * as categories from './categories';
import * as user from './user';

// Wrap an async handler to be called synchronously
export const wrap = function(handler: (req: Request, res: Response)=>Promise<void>): (req: Request, res: Response)=>void {
    return function(req: Request, res: Response, ) {
        handler(req, res).catch((err) => {
            console.log("Error (caught)", err);
            const status = 500;
            res.status(status).send({
                "error": {
                    "status": status,
                    "message": "internal server error",
                }
            });
        })
    };
}

export const handle_init_get = wrap(async function(req: Request, res: Response): Promise<void> {
    const resData : InitState = {};
    await db.tx(async t => {
        const index = Number(req.query.index);
        let _gid: GroupId;
        const gid = async () => {
            _gid = _gid || await user.getDefaultGroup(req.user, t);
            return _gid;
        }
        if (req.query.frame) {
            console.log("frame")
            resData.frame = await frames.getOrCreateFrame(await gid(), index, t);
        }
        if (req.query.transactions) {
            console.log("transactions")
            resData.transactions = await transactions.getTransactions(index, await gid(), t);
        }
        if (req.query.invites) {
            console.log("invites")
            resData.invites = await user.getFriendInvites(req.user.uid, t);
        }
        if (req.query.categories) {
            console.log("categories")
            resData.categories = await categories.getCategories(await gid(), index, t);
        }
        if (req.query.friends) {
            console.log("friends")
            resData.friends = await user.getFriends(req.user.uid, t);
        }
        if (req.query.pendingFriends) {
            console.log("pending friends")
            resData.pendingFriends = await user.getPendingFriends(req.user.uid, t);
        }
        if (req.query.debts) {
            console.log("debts");
            resData.debts = await user.getDebts(req.user.uid, t);
            console.log(resData.debts);
        }
        if (req.query.me) {
            console.log("me")
            resData.me = {
                email: req.user.email,
                uid: req.user.uid,
                gid: await gid(),
            }
        }
        res.send(resData);
    });
});