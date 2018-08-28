import {Request, Response} from 'express';
import {User, GroupId} from '../shared/types';
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