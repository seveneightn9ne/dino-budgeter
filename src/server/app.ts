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
import validator from 'express-validator';
import * as ensureLogin from 'connect-ensure-login';
import * as api from './api';
import connectPgSimple from 'connect-pg-simple';
import db from './db';
import * as categories from './api/categories';
import * as frame from './api/frame';
import * as transactions from './api/transactions';
import * as user from './api/user';

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

/**
 * API Routes. They require login.
 */
app.get('/api/auth-redirect',      user.handle_auth_redirect_get);
app.post('/api/friend',            ensureLogin.ensureLoggedIn('/api/auth-redirect'), user.handle_add_friend_post);
app.post('/api/friend/reject',     ensureLogin.ensureLoggedIn('/api/auth-redirect'), user.handle_reject_friend_post);
app.delete('/api/friend',          ensureLogin.ensureLoggedIn('/api/auth-redirect'), user.handle_friend_delete);
app.post('/api/friend/settle',     ensureLogin.ensureLoggedIn('/api/auth-redirect'), user.handle_friend_settle_post);

app.get('/api/init',               ensureLogin.ensureLoggedIn('/api/auth-redirect'), api.handle_init_get);

app.post('/api/income',            ensureLogin.ensureLoggedIn('/api/auth-redirect'), frame.handle_income_post);
app.post('/api/budgeting/move',    ensureLogin.ensureLoggedIn('/api/auth-redirect'), frame.handle_budgeting_move_post);

app.post('/api/transaction',       ensureLogin.ensureLoggedIn('/api/auth-redirect'), transactions.handle_transaction_post);
app.delete('/api/transaction',     ensureLogin.ensureLoggedIn('/api/auth-redirect'), transactions.handle_transaction_delete);
app.post('/api/transaction/description', ensureLogin.ensureLoggedIn('/api/auth-redirect'), transactions.handle_transaction_description_post);
app.post('/api/transaction/amount',ensureLogin.ensureLoggedIn('/api/auth-redirect'), transactions.handle_transaction_amount_post);
app.post('/api/transaction/date',  ensureLogin.ensureLoggedIn('/api/auth-redirect'), transactions.handle_transaction_date_post);
app.post('/api/transaction/category', ensureLogin.ensureLoggedIn('/api/auth-redirect'), transactions.handle_transaction_category_post);
app.post('/api/transaction/split', ensureLogin.ensureLoggedIn('/api/auth-redirect'), transactions.handle_transaction_split_post);

app.post('/api/category',          ensureLogin.ensureLoggedIn('/api/auth-redirect'), categories.handle_category_post);
app.delete('/api/category',        ensureLogin.ensureLoggedIn('/api/auth-redirect'), categories.handle_category_delete);
app.post('/api/category/budget',   ensureLogin.ensureLoggedIn('/api/auth-redirect'), categories.handle_category_budget_post);
app.post('/api/category/name',     ensureLogin.ensureLoggedIn('/api/auth-redirect'), categories.handle_category_name_post);


/* Static Routes */
app.use(serveStatic(path.join(__dirname, '../client')));
//app.use(serveStatic(path.join(__dirname, '../../static')));
app.use(serveStatic(path.join(__dirname, '../../node_modules/react/umd')));
app.use(serveStatic(path.join(__dirname, '../../node_modules/react-dom/umd')));
app.use(serveStatic(path.join(__dirname, '../../static/RobotoMono')));
app.get('/index.css', serveStatic(path.join(__dirname, '../../static/')));

const reactMode = app.get("env") == "development" ? "development" : "production.min";
app.get('/react.js', (_, res) =>
  res.sendFile(path.join(__dirname, `../../node_modules/react/umd/react.${reactMode}.js`)));
app.get('/react-dom.js', (_, res) =>
  res.sendFile(path.join(__dirname, `../../node_modules/react-dom/umd/react-dom.${reactMode}.js`)));


const index = (req: Request, res: Response) =>
  res.sendFile(path.join(__dirname + '../../../static/index.html'));

app.get('/', ensureLogin.ensureLoggedOut('/app'), index);
app.get('/app', ensureLogin.ensureLoggedIn(''), index);
app.get('/app/home/:month/:year', ensureLogin.ensureLoggedIn(''), index);
app.get('/app/transactions/:month/:year', ensureLogin.ensureLoggedIn(''), index);

// Anything not matched above, use the main react app
app.get('*', index);

export default app;
