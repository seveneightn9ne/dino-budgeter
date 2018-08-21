import express from "express";
import { Request, Response } from "express";
import {IMain, IDatabase} from 'pg-promise';
import pgPromise from 'pg-promise';
import * as bodyParser from 'body-parser';
import path from "path";
import serveStatic from 'serve-static'
import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import flash from 'connect-flash';
import session from 'express-session';

const app = express();
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: "TODO", //TODO
}));
app.use(flash());
const pgp:IMain = pgPromise();
const db = pgp(`postgres://budgeter:${process.env.PGPASSWORD}@127.0.0.1/budgeter`);

// Express configuration
app.set("port", process.env.PORT || 3000);

// Passport configuration
passport.use(new LocalStrategy(
  function(username, password, done) {
    db.one("select foo from users where username=?", username)
    .then((row) => {
      if (password == row.password_hash) {// TODO for real
        return done(null, {email: row.email});
      } else {
        return done(null, false, {message: 'Incorrect passowrd.'});
      }
    })
    .catch(error => {
      return done(null, false, { message: 'Incorrect username.' });
    });
  }
));


/**
 * Primary app routes.
 */
const index = (req: Request, res: Response) => res.sendFile(path.join(__dirname + '../../../static/index.html'));
app.get("/", index);
app.get("/login", index);
app.use(serveStatic(path.join(__dirname, '../client')));
app.use(serveStatic(path.join(__dirname, '../../node_modules/react/umd')));
app.use(serveStatic(path.join(__dirname, '../../node_modules/react-dom/umd')));
app.post('/login',
  passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/login',
                                   failureFlash: true })
);

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
