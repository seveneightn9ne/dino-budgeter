import {Request, Response} from 'express';
import {User, GroupId, UserId, Friend} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';

export function getGroups(user: User | UserId, t?: pgPromise.ITask<{}>): Promise<GroupId[]> {
    return t ? getGroupsInner(user, t) : db.task(t => getGroupsInner(user, t));
}

function getGroupsInner(user: User | UserId, t: pgPromise.ITask<{}>): Promise<GroupId[]> {
    const uid = (typeof user == "string") ? user : user.uid;
    return t.many("select gid from membership where uid=$1", [uid]).then((rows) => {
        return rows.map(row => row.gid as GroupId);
    });
}

export function getDefaultGroup(user: User | UserId, t?: pgPromise.ITask<{}>): Promise<GroupId> {
    return getGroups(user, t).then(groups => groups[0]);
}

export function isUserInGroup(user: User, group: GroupId, t: pgPromise.ITask<{}>): Promise<boolean> {
    return t.one("select count(*) > 0 as exists from membership where uid = $1 and gid = $2", [user.uid, group]).then(row => {
        return row.exists;
    });
}

export async function getUserByEmail(email: string, t: pgPromise.ITask<{}>): Promise<UserId | null> {
    const row = await t.oneOrNone("select * from users where email = $1", [email]);
    console.log("get user by email " + email + " yields " + (row||{}).uid);
    return row ? row.uid : null;
}

export async function getFriendByEmail(email: string, t: pgPromise.ITask<{}>): Promise<Friend | null> {
    const row = await t.oneOrNone("select U.uid, M.gid from users U left join membership M on U.uid = M.uid where U.email = $1", [email]);
    return row ? {uid: row.uid, gid: row.gid, email} : null;
}

export async function getFriend(uid: UserId, t: pgPromise.ITask<{}>): Promise<Friend | null> {
    const row = await t.oneOrNone("select U.email, M.gid from users U left join membership M on U.uid = M.uid where U.uid = $1", [uid]);
    return row ? {uid: uid, gid: row.gid, email: row.email} : null;
}

export async function getEmail(user: UserId, t: pgPromise.ITask<{}>): Promise<string> {
    const row = await t.one("select email from users where uid = $1", [user]);
    return row.email;
}

export async function getEmails(users: UserId[], t: pgPromise.ITask<{}>): Promise<string[]> {
    // how..?
    //const rows = await t.many("select email from users where uid in ($1)", [users]);
    return await t.batch(users.map(u => getEmail(u, t)));
}

export async function addFriend(actor: UserId, friend: UserId, t: pgPromise.ITask<{}>) {
    const [u1, u2] = [actor, friend].sort();
    const existing = await t.oneOrNone("select * from friendship where u1 = $1 and u2 = $2", [u1, u2]);
    if (existing) {
        if (actor == u1) {
            await t.none("update friendship set u1_accepted = true where u1 = $1 and u2 = $2", [u1, u2]);
        } else {
            await t.none("update friendship set u2_accepted = true where u1 = $1 and u2 = $2", [u1, u2]);
        }
    } else {
        const u1_accepted = u1 == actor;
        const u2_accepted = u2 == actor;
        await t.none("insert into friendship (u1, u2, u1_accepted, u2_accepted) values ($1, $2, $3, $4)",
            [u1, u2, u1_accepted, u2_accepted]);
    }
}

export async function deleteFriendship(u1: UserId, u2: UserId, t: pgPromise.ITask<{}>): Promise<void> {
    return t.none("delete from friendship where u1 = $1 and u2 = $2", [u1, u2].sort());
}

// Only gets friendships that have been accepted both ways.
export async function getFriends(user: UserId, t: pgPromise.ITask<{}>): Promise<Friend[]> {
    const rows = await t.manyOrNone(`select U.uid, U.email, G.gid from friendship F
        left join users U on (
            (F.u1 = U.uid and F.u2 = $1)
         or (F.u2 = U.uid and F.u1 = $1))
        left join membership G on U.uid = G.uid
        where (u1 = $1 or u2 = $1) and u1_accepted and u2_accepted`, [user]);
    return rows || [];
}

export async function getPendingFriends(user: UserId, t: pgPromise.ITask<{}>): Promise<Friend[]> {
    const rows = await t.manyOrNone(`select U.uid, U.email, G.gid from friendship F
        left join users U on (
            (F.u1 = U.uid and F.u2 = $1)
         or (F.u2 = U.uid and F.u1 = $1))
        left join membership G on U.uid = G.uid
        where (u1 = $1 and not u2_accepted)
           or (u2 = $1 and not u1_accepted)`, [user]);
    return rows || [];
}

export async function getFriendInvites(user: UserId, t: pgPromise.ITask<{}>): Promise<Friend[]> {
    const rows = await t.manyOrNone(`select U.uid, U.email, G.gid from friendship F
        left join users U on (
            (F.u1 = U.uid and F.u2 = $1)
         or (F.u2 = U.uid and F.u1 = $1))
        left join membership G on U.uid = G.uid
        where (u1 = $1 and not u1_accepted)
           or (u2 = $1 and not u2_accepted)`, [user]);
    return rows || [];
}

export async function isFriend(u1: UserId, u2: UserId, t: pgPromise.ITask<{}>): Promise<boolean> {
    const row = await t.one(`select count(*) > 0 as exists from friendship where
        u1 = $1 and u2 = $2 and u1_accepted and u2_accepted`, [u1, u2].sort());
    return row.exists;
}