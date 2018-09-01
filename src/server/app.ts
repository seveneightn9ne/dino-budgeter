import express from "express";
import { Request, Response } from "express";
import * as bodyParser from 'body-parser';
import path from "path";
import serveStatic from 'serve-static'
import passport from 'passport';
import session from 'express-session';
import * as auth from './auth';
import morgan from 'morgan';
import * as cookieParser from 'cookie-parser';
import * as playground from './playground';
import validator from 'express-validator';
import * as ensureLogin from 'connect-ensure-login';
import * as api from './api';
import connectPgSimple from 'connect-pg-simple';
import db from './db';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(cookieParser.default());
app.use(morgan('combined'));
const pgSession = connectPgSimple(session);
app.use(session({
  store: new pgSession({
    pgPromise: db,
  }),
  cookie: {
    secure: false // TODO
  },
  resave: true, // TODO
  saveUninitialized: true,
  secret: "TODO", //TODO
}));
app.use(passport.initialize());
app.use(passport.session());

// Express configuration
app.set("port", process.env.PORT || 3000);

/**
 * Primary app routes.
 */
app.post('/login', auth.handle_login_post);
app.post('/signup', auth.handle_signup_post);

app.get("/playground", playground.handle_playground_get);
app.post("/playground", playground.handle_playground_post);

/**
 * API Routes. They require login.
 */
app.get('/api/current-email', ensureLogin.ensureLoggedIn(), api.handle_current_email_get);
app.get('/api/groups', ensureLogin.ensureLoggedIn(), api.handle_groups_get);
app.get('/api/frame/:month/:year', ensureLogin.ensureLoggedIn(), api.wrap(api.handle_frame_get));
app.get('/api/frame', ensureLogin.ensureLoggedIn(), api.wrap(api.handle_frame_get));
app.get('/api/transactions', ensureLogin.ensureLoggedIn(), api.wrap(api.handle_transactions_get))
app.post('/api/transaction', ensureLogin.ensureLoggedIn(), api.handle_transaction_post);
app.post('/api/category', ensureLogin.ensureLoggedIn(), api.handle_category_post);
app.delete('/api/category', ensureLogin.ensureLoggedIn(), api.handle_category_delete);
app.post('/api/category/budget', ensureLogin.ensureLoggedIn(), api.handle_category_budget_post);

/* Static Routes */
app.use(serveStatic(path.join(__dirname, '../client')));
app.use(serveStatic(path.join(__dirname, '../../static')));
app.use(serveStatic(path.join(__dirname, '../../node_modules/react/umd')));
app.use(serveStatic(path.join(__dirname, '../../node_modules/react-dom/umd')));

const index = (req: Request, res: Response) =>
  res.sendFile(path.join(__dirname + '../../../static/index.html'));
app.get('/', ensureLogin.ensureLoggedOut('/app'), index);
app.get('/app', ensureLogin.ensureLoggedIn(''), index);
app.get('/app/:month/:year', ensureLogin.ensureLoggedIn(''), index);
app.get('/app/transactions/:frame', ensureLogin.ensureLoggedIn(''), index);

// Anything not matched above, use the main react app
app.get('*', index);

export default app;
