import { Request as ExpressRequest, Response as ExpressResponse, Express } from "express";
import { GroupId, InitState, User } from "../shared/types";
import * as ensureLogin from "connect-ensure-login";
import * as categories from "./categories";
import db from "./db";
import * as frames from "./frames";
import * as transactions from "./transactions";
import * as user from "./user";
import { ApiRequest, API2, Initialize } from "../shared/api";

export type ErrorResponse = {code: StatusCodeNoResponse, message: string};
export type Response<Res> = Res | ErrorResponse | null;
type Handler<Req, Res> = (req: Req, user: User) => Promise<Response<Res>>;

// Wrap an async handler to be called synchronously
function wrap<Req extends object, Res extends object>(
    api: API2<Req, Res>, handler: Handler<Req, Res>): (req: ExpressRequest, res: ExpressResponse) => void {
    return function(req: ExpressRequest, res: ExpressResponse) {
        let apiRequest;
        try {
            apiRequest = api.reviveRequest(req.body);
        } catch (e) {
            console.error("Parsing request failed", e);
            res.status(400).send({
                "error": "Parsing request failed",
            });
            return;
        }
        handler(apiRequest, req.user).then(apiResponse => {
            if (typeof(apiResponse) == "number") {
                res.sendStatus(apiResponse);
            } else if (apiResponse == null) {
                if (api.responseSchema != null) {
                    throw new Error("handler returned null, but " + api.path + " requires a response");
                }
                res.sendStatus(204);
            } else if ('code' in apiResponse) {
                res.status(apiResponse.code).send({
                    "error": apiResponse.message,
                });
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

export function registerHandler<Req extends object, Res extends object>(
    app: Express, api: API2<Req, Res>, handler: Handler<Req, Res>) {
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

export async function handle_init_get(request: ApiRequest<typeof Initialize>, actor: User): Promise<Partial<InitState>>  {
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