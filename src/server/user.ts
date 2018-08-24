import {Request, Response} from 'express';
import {User, GroupId} from '../shared/types';
import db from './db';

export function getGroups(user: User): Promise<GroupId[]> {
    return db.many("select gid from membership where uid=$1", [user.uid]).then((rows) => {
        return rows.map(row => row.gid as GroupId);
    });
}

export function isUserInGroup(user: User, group: GroupId): Promise<boolean> {
    return db.one("select count(*) > 0 as exists from membership where uid = $1 and gid = $2", [user.uid, group]).then(row => {
        return row.exists;
    });
}