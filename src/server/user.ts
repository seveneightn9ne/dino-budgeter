import {Request, Response} from 'express';
import {User, GroupId, UserId} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';

export function getGroups(user: User, t?: pgPromise.ITask<{}>): Promise<GroupId[]> {
    return t ? getGroupsInner(user, t) : db.task(t => getGroupsInner(user, t));
}

function getGroupsInner(user: User, t: pgPromise.ITask<{}>): Promise<GroupId[]> {
    return t.many("select gid from membership where uid=$1", [user.uid]).then((rows) => {
        return rows.map(row => row.gid as GroupId);
    });
}

export function getDefaultGroup(user: User, t?: pgPromise.ITask<{}>): Promise<GroupId> {
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
export async function getFriends(user: UserId, t: pgPromise.ITask<{}>): Promise<UserId[]> {
    const rows = await t.manyOrNone("select * from friendship where (u1 = $1 or u2 = $1) and u1_accepted and u2_accepted", [user]);
    return otherUserFromFriendshipRows(rows, user);
}

export async function getPendingFriends(user: UserId, t: pgPromise.ITask<{}>): Promise<UserId[]> {
    const rows = await t.manyOrNone(`select * from friendship
        where (u1 = $1 and not u2_accepted)
        or (u2 = $1 and not u1_accepted)`, [user]);
    return otherUserFromFriendshipRows(rows, user);
}

export async function getFriendInvites(user: UserId, t: pgPromise.ITask<{}>): Promise<UserId[]> {
    const rows = await t.manyOrNone(`select * from friendship
        where (u1 = $1 and not u1_accepted)
        or (u2 = $1 and not u2_accepted)`, [user]);
    return otherUserFromFriendshipRows(rows, user);
}

function otherUserFromFriendshipRows(rows: {u1: string, u2: string}[], user: UserId): UserId[] {
    return (rows || []).map(row => {
        return row.u1 == user ? row.u2 : row.u1;
    });
}