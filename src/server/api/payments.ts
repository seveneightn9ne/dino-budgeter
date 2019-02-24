import { Response } from "typescript-json-api/dist/server/express";
import { ApiRequest, ApiResponse } from "typescript-json-api/dist/shared/api";
import { Payment } from "../../shared/api";
import { User } from "../../shared/types";
import db from "../db";
import * as payments from "../payments";
import * as user from "../user";

export function handle_payment_post(request: ApiRequest<typeof Payment>, actor: User): Promise<Response<ApiResponse<typeof Payment>>> {
    return db.tx(async t => {
        const frame = request.frame;
        const friend = await user.getFriendByEmail(request.email, t);
        if (!friend || !await user.isFriend(actor.uid, friend.uid, t)) {
            return {
                code: 400,
                message: `You are not friends with ${request.email}`,
            };
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
        return null;
    });
}