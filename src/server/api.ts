
import { ApiRequest } from "typescript-json-api/dist/shared/api";
import { Initialize } from "../shared/api";
import { GroupId, InitState, User } from "../shared/types";
import * as categories from "./categories";
import db from "./db";
import * as frames from "./frames";
import * as transactions from "./transactions";
import * as user from "./user";

export async function handle_init_get(
    request: ApiRequest<typeof Initialize>, actor: User): Promise<Partial<InitState>> {
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
        if (fields.has('history')) {
            resData.history = await categories.getHistory(await gid(), request.index, t);
        }
        if (fields.has('settings')) {
            resData.settings = await user.getSettings(actor.uid, t);
        }
        return resData;
    });
}