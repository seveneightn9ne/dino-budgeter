import { Request, Response } from "express";
import Money from "../../shared/Money";
import { wrap } from "../api";
import db from "../db";
import * as user from "../user";
import * as payments from "../payments";

/**
 * {
 *   amount: Money
 *   email: "friend@email.com"
 *   youPay: true
 *   isPayment: true (else is charge/youCharge)
 * }
 */
export const handle_payment_post = wrap(async function(req: Request, res: Response) {
    const amount = new Money(req.body.amount);
    if (!amount.isValid() || !req.body.email) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const friend = await user.getFriendByEmail(req.body.email, t);
        if (!await user.isFriend(req.user.uid, friend.uid, t)) {
            res.sendStatus(400);
            return;
        }
        let from = req.user.uid;
        let to = friend.uid;
        if (!req.body.youPay) {
            [from, to] = [to, from];
        }
        if (req.body.isPayment) {
            await payments.addPayment(from, to, amount, t);
        } else {
            await payments.addCharge(from, to, amount, t);
        }
        res.sendStatus(204);
    });
});