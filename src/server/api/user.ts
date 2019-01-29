
import { Request, Response } from "express";
import { StatusCodeNoResponse } from "../api";
import db from "../db";
import * as user from "../user";
import { FriendRequest, NameRequest } from "../../shared/api";
import { Friend, User } from "../../shared/types";

export const handle_auth_redirect_get = function(_req: Request, res: Response) {
    res.sendStatus(401);
};

export function handle_add_friend_post(request: FriendRequest, actor: User): Promise<Friend | StatusCodeNoResponse> {
    return db.tx(async t => {
        const friend = await user.getFriendByEmail(request.email, t);
        if (!friend) {
            return 404;
        }
        await user.addFriend(actor.uid, friend.uid, t);
        return friend;
    });
}

export function handle_reject_friend_post(request: FriendRequest, actor: User): Promise<StatusCodeNoResponse> {
    if (request.email == actor.email) {
        return Promise.resolve(400 as StatusCodeNoResponse);
    }
    return db.tx(async t => {
        const uid = await user.getUserByEmail(request.email, t);
        if (!uid) {
            return 404;
        }
        await user.deleteFriendship(actor.uid, uid, t);
        return 204;
    });
}

export function handle_friend_delete(request: FriendRequest, actor: User): Promise<StatusCodeNoResponse> {
    if (request.email == actor.email) {
        return Promise.resolve(400 as StatusCodeNoResponse);
    }
    return db.tx(async t => {
        const uid = await user.getUserByEmail(request.email, t);
        if (!uid) {
            return 404;
        }
        await user.softDeleteFriendship(actor.uid, uid, t);
        return 204;
    });
}

export function handle_change_name_post(request: NameRequest, actor: User): Promise<StatusCodeNoResponse> {
    return db.tx(async t => {
        await user.setName(actor.uid, request.name, t);
        return 204 as StatusCodeNoResponse;
    });
}