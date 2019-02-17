
import { Request, Response as ExpressResponse } from "express";
import _ from "lodash";
import { ApiRequest, EmptyResponse, FriendRequest, Name, UpdateSettings } from "../../shared/api";
import { Friend, User } from "../../shared/types";
import { ErrorResponse, Response } from "../api";
import db from "../db";
import * as user from "../user";

export const handle_auth_redirect_get = function (_req: Request, res: ExpressResponse) {
    res.sendStatus(401);
};

export function handle_add_friend_post(request: FriendRequest, actor: User): Promise<Response<Friend>> {
    return db.tx(async t => {
        const friend = await user.getFriendByEmail(request.email, t);
        if (!friend) {
            return {
                code: 404,
                message: 'There is no user with that email',
            } as ErrorResponse;
        }
        await user.addFriend(actor.uid, friend.uid, t);
        return friend;
    });
}

export function handle_reject_friend_post(request: FriendRequest, actor: User): Promise<Response<EmptyResponse>> {
    return db.tx(async t => {
        const uid = await user.getUserByEmail(request.email, t);
        if (!uid) {
            return {
                code: 404,
                message: "There is no user with that email",
            } as ErrorResponse;
        }
        await user.deleteFriendship(actor.uid, uid, t);
        return null;
    });
}

export function handle_friend_delete(request: FriendRequest, actor: User): Promise<Response<EmptyResponse>> {
    return db.tx(async t => {
        const uid = await user.getUserByEmail(request.email, t);
        if (!uid) {
            return {
                code: 404,
                message: "There is no user with that email",
            } as ErrorResponse;
        }
        await user.softDeleteFriendship(actor.uid, uid, t);
        return null;
    });
}

export function handle_change_name_post(request: ApiRequest<typeof Name>, actor: User): Promise<Response<EmptyResponse>> {
    return db.tx(async t => {
        await user.setName(actor.uid, request.name, t);
        return null;
    });
}

export function handle_update_settings_post(
    request: ApiRequest<typeof UpdateSettings>, actor: User): Promise<Response<EmptyResponse>> {
    return db.tx(async (t) => {
        const settings = await user.getSettings(actor.uid, t);
        _.assignIn(settings, request);
        await user.setSettings(actor.uid, settings, t);
        return null;
    });
}
