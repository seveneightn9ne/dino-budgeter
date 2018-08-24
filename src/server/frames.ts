import {Request, Response} from 'express';
import {User, Frame, GroupId, FrameId, Money} from '../shared/types';
import db from './db';
import {randomId} from './util';

export function getOrCreateFrame(gid: GroupId, month: number, year: number): Promise<Frame> {
    return db.task(t => {
        return t.oneOrNone("select * from frames where gid = $1 and month = $2 and year = $3", [gid, month, year]).then(row => {
            if (row) {
                return row as Frame;
            } else {
                const id: FrameId = randomId();
                const income: Money = "0";
                return t.none("insert into frames values ($1, $2, $3, $4, $5)", [
                    id, gid, month, year, income,
                ]).then(() => {
                    return {id, gid, month, year, income};
                });
            }
        });
    });
}

export function setIncome(fid: FrameId, income: Money): Promise<void> {
    return db.none("update frames set income = $1 where id = $2", [income, fid]);
}