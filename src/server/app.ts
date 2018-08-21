import express from "express";
import { Request, Response } from "express";
import {IMain, IDatabase} from 'pg-promise';
import pgPromise from 'pg-promise';
import * as bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());
const pgp:IMain = pgPromise();
const db = pgp(`postgres://budgeter:${process.env.PGPASSWORD}@127.0.0.1/budgeter`);

// Express configuration
app.set("port", process.env.PORT || 3000);

/**
 * Primary app routes.
 */
app.get("/", express.static('client/index.js'));

app.get("/playground", (req, res) => {
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
});

app.post("/playground", (req, res) => {
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
});

export default app;
