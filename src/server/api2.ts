import { Request as ExpressRequest, Response as ExpressResponse, Express } from "express";
import { GroupId, InitState, User } from "../shared/types";
import * as ensureLogin from "connect-ensure-login";
import * as categories from "./categories";
import db from "./db";
import * as frames from "./frames";
import * as transactions from "./transactions";
import * as user from "./user";
import * as shared_api from "../shared/api2";

type Handler<Req, Res> = (req: Req, user: User) => Promise<Res | StatusCodeNoResponse>;

// Wrap an async handler to be called synchronously
function wrap2<Req extends shared_api.RequestType, Res extends shared_api.RequestType>(
    api: shared_api.API2<Req, Res>, handler: Handler<Req, Res>): (req: ExpressRequest, res: ExpressResponse) => void {
    return function(req: ExpressRequest, res: ExpressResponse) {
        const apiRequest = api.reviveRequest(req.body);
        handler(apiRequest, req.user).then(apiResponse => {
            if (typeof(apiResponse) == "number") {
                res.sendStatus(apiResponse);
            } else {
                res.status(200).send(apiResponse);
            }
        }).catch((err) => {
            console.error("Error (caught)", err);
            const status = 500;
            res.status(status).send({
                "error": "internal server error",
            });
        });
    };
};
function wrap<Req, Res>(api: shared_api.API<Req, Res>, handler: Handler<Req, Res>): (req: ExpressRequest, res: ExpressResponse) => void {
    return function(req: ExpressRequest, res: ExpressResponse) {
        const apiRequest = JSON.parse(req.body, api.requestReviver);
        handler(apiRequest, req.user).then(apiResponse => {
            if (typeof(apiResponse) == "number") {
                res.sendStatus(apiResponse);
            } else {
                res.status(200).send(apiResponse);
            }
        }).catch((err) => {
            console.error("Error (caught)", err);
            const status = 500;
            res.status(status).send({
                "error": "internal server error",
            });
        });
    };
};
export type StatusCode = 200 | 204 | 400 | 401 | 403 | 404 | 500;
export type StatusCodeNoResponse = Exclude<StatusCode, 200>;
export function registerHandler<Req, Res>(app: Express, api: shared_api.API<Req, Res>, handler: Handler<Req, Res>) {
    switch (api.method) {
        case 'POST':
            return app.post(api.path, ensureLogin.ensureLoggedIn("/api/auth-redirect"), wrap(api, handler));
        case 'DELETE':
            return app.delete(api.path, ensureLogin.ensureLoggedIn("/api/auth-redirect"), wrap(api, handler));
        case 'PUT':
            return app.put(api.path, ensureLogin.ensureLoggedIn("/api/auth-redirect"), wrap(api, handler));
        default:
            throw Error("api.method unknown: " + api.method);
    }
}

export function registerHandler2<Req extends shared_api.RequestType, Res extends shared_api.RequestType>(
    app: Express, api: shared_api.API2<Req, Res>, handler: Handler<Req, Res>) {
    switch (api.method) {
        case 'POST':
            return app.post(api.path, ensureLogin.ensureLoggedIn("/api/auth-redirect"), wrap2(api, handler));
        case 'DELETE':
            return app.delete(api.path, ensureLogin.ensureLoggedIn("/api/auth-redirect"), wrap2(api, handler));
        case 'PUT':
            return app.put(api.path, ensureLogin.ensureLoggedIn("/api/auth-redirect"), wrap2(api, handler));
        default:
            throw Error("api.method unknown: " + api.method);
    }
}

export async function handle_init_get(request: shared_api.InitializeRequest, actor: User): Promise<shared_api.InitializeResponse>  {
    const resData: InitState = {};
    return db.tx(async t => {
        const fields = new Set(request.fields);
        let _gid: GroupId;
        const gid = async () => {
            _gid = _gid || await user.getDefaultGroup(actor, t);
            return _gid;
        };
        if (fields.has('frame')) {
            resData.frame = await frames.getOrCreateFrame(await gid(), request.index, t);
        }
        if (fields.has('transactions')) {
            resData.transactions = await transactions.getTransactions(request.index, await gid(), t);
        }
        if (fields.has('invites')) {
            resData.invites = await user.getFriendInvites(actor.uid, t);
        }
        if (fields.has('categories')) {
            resData.categories = await categories.getCategories(await gid(), request.index, t);
        }
        if (fields.has('friends')) {
            resData.friends = await user.getFriends(actor.uid, t);
        }
        if (fields.has('pendingFriends')) {
            resData.pendingFriends = await user.getPendingFriends(actor.uid, t);
        }
        if (fields.has('debts')) {
            resData.debts = await user.getDebts(actor.uid, t);
        }
        if (fields.has('me')) {
            resData.me = {
                email: actor.email,
                uid: actor.uid,
                name: actor.name,
                gid: await gid(),
            };
        }
        return resData;
    });
}