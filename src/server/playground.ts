import {Request, Response} from 'express';

import db from './db';

export const handle_playground_get = (req: Request, res: Response) => {
  db.one("select foo from playground limit 1")
  .then((row) => {
    res.statusCode = 200;
    res.json({v: row.foo});
  })
  .catch(error => {
    console.log(error);
    res.statusCode = 500;
    res.json({});
  })
};

export const handle_playground_post = (req: Request, res: Response) => {
  db.none("delete from playground").then(() => {
    db.none(" \
      insert into playground (foo) values ($1) \
      on conflict (foo) do update set foo = excluded.foo", [req.body.v])
  }).then(() => {
    res.statusCode = 200;
    res.json({});
  }).catch(error => {
    console.log(error);
    res.statusCode = 500;
    res.json({});
  })
};