import { StatusCodeNoResponse } from "../api";
import db from "../db";
import * as user from "../user";
import * as payments from "../payments";
import { ApiRequest, Payment } from "../../shared/api";
import { User } from "../../shared/types";

export function handle_payment_post(request: ApiRequest<typeof Payment>, actor: User): Promise<StatusCodeNoResponse> {
    if (!request.amount.isValid()) {
        return Promise.resolve(400 as StatusCodeNoResponse);
    }
    return db.tx(async t => {
        const frame = request.frame;
        const friend = await user.getFriendByEmail(request.email, t);
        if (!friend || !await user.isFriend(actor.uid, friend.uid, t)) {
            return 400;
        }
        let from = actor.uid;
        let to = friend.uid;
        if (!request.youPay) {
            [from, to] = [to, from];
        }
        if (request.isPayment) {
            await payments.addPayment(frame, from, to, request.memo, request.amount, t);
        } else {
            await payments.addCharge(frame, from, to, request.memo, request.amount, t);
        }
        return 204;
    });
}