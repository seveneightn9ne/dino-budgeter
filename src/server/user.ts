import {Request, Response} from 'express';
import {User, GroupId, UserId} from '../shared/types';
import db from './db';
import pgPromise from 'pg-promise';

export function getGroups(user: User, t?: pgPromise.ITask<{}>): Promise<GroupId[]> {
    return t ? getGroupsInner(user, t) : db.task(t => getGroupsInner(user, t));
}

function getGroupsInner(user: User, t: pgPromise.ITask<{}>): Promise<GroupId[]> {
    return db.many("select gid from membership where uid=$1", [user.uid]).then((rows) => {
        return rows.map(row => row.gid as GroupId);
    });
}

export function getDefaultGroup(user: User, t?: pgPromise.ITask<{}>): Promise<GroupId> {
    return getGroups(user, t).then(groups => groups[0]);
}

export function isUserInGroup(user: User, group: GroupId): Promise<boolean> {
    return db.one("select count(*) > 0 as exists from membership where uid = $1 and gid = $2", [user.uid, group]).then(row => {
        return row.exists;
    });
}

export async function getUserByEmail(email: string): Promise<UserId | null> {
    const row = await db.oneOrNone("select * from users where email = $1", [email]);
    return row ? row.uid : null;
}

export async function addFriend(actor: UserId, friend: UserId) {
    const [u1, u2] = [actor, friend].sort();
    await db.tx(async t => {
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
    });
}

// Only gets friendships that have been accepted both ways.
export async function getFriends(user: UserId): Promise<UserId[]> {
    const rows = await db.manyOrNone("select * from friendship where (u1 = $1 or u2 = $1) and u1_accepted and u2_accepted", [user]);
    return otherUserFromFriendshipRows(rows, user);
}

export async function getPendingFriends(user: UserId): Promise<UserId[]> {
    const rows = await db.manyOrNone(`select * from friendship
        where (u1 = $1 and not u2_accepted)
        or (u2 = $1 and not u1_accepted)`, [user]);
    return otherUserFromFriendshipRows(rows, user);
}

export async function getFriendInvites(user: UserId): Promise<UserId[]> {
    const rows = await db.manyOrNone(`select * from friendship
        where (u1 = $1 and not u1_accepted)
        or (u2 = $1 and not u2_accepted)`, [user]);
    return otherUserFromFriendshipRows(rows, user);
}

function otherUserFromFriendshipRows(rows: {u1: string, u2: string}[], user: UserId): UserId[] {
    return (rows || []).map(row => {
        return row.u1 == user ? row.u2 : row.u1;
    });
}