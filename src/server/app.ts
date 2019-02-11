import * as bodyParser from "body-parser";
import * as ensureLogin from "connect-ensure-login";
import connectPgSimple from "connect-pg-simple";
import express from "express";
import { Request, Response } from "express";
import session from "express-session";
import validator from "express-validator";
import morgan from "morgan";
import passport from "passport";
import path from "path";
import serveStatic from "serve-static";
import * as api from "./api";
import * as categories from "./api/categories";
import * as frame from "./api/frame";
import * as transactions from "./api/transactions";
import * as user from "./api/user";
import * as payments from "./api/payments";
import * as auth from "./auth";
import db from "./db";
import { AcceptFriend, Initialize, RejectFriend, DeleteFriend, Name, Payment, Income, BudgetingMove, AddTransaction, DeleteTransaction, TransactionDescription, TransactionAmount, TransactionDate, TransactionCategory, TransactionSplit, AddCategory, DeleteCategory, CategoryBudget, CategoryName } from '../shared/api';

const app = express();
app.use(bodyParser.text({
  type: "application/json"
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(morgan("combined"));
const pgSession = connectPgSimple(session);
const sessionOptions: session.SessionOptions = {
  store: new pgSession({
    pgPromise: db,
  }),
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
  },
  rolling: true, // reset cookie expiration on each request
  resave: true, // TODO: not needed if pgSession implements touch
  saveUninitialized: true,
  secret: [process.env.DINO_SESSION_SECRET, "TODO"],
};
if (app.get("env") == "production") {
  app.set("trust proxy", 1); // 1 means the first hop before the proxy (nginx) is considered the client
  sessionOptions.cookie.secure = true;
}
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

// Express configuration
app.set("port", process.env.PORT || 3000);

/**
 * Primary app routes.
 */
app.post("/login", auth.handle_login_post);
app.post("/signup", auth.handle_signup_post);

/**
 * API Routes. They require login.
 */
app.get("/api/auth-redirect",      user.handle_auth_redirect_get);

api.registerHandler(app, AcceptFriend, user.handle_add_friend_post);
api.registerHandler(app, RejectFriend, user.handle_reject_friend_post);
api.registerHandler(app, DeleteFriend, user.handle_friend_delete);
api.registerHandler(app, Name, user.handle_change_name_post);

api.registerHandler(app, Payment, payments.handle_payment_post);
api.registerHandler(app, Initialize, api.handle_init_get);

api.registerHandler(app, Income, frame.handle_income_post);
api.registerHandler(app, BudgetingMove, frame.handle_budgeting_move_post);

api.registerHandler(app, AddTransaction, transactions.handle_transaction_post);
api.registerHandler(app, DeleteTransaction, transactions.handle_transaction_delete);
api.registerHandler(app, TransactionDescription, transactions.handle_transaction_description_post);
api.registerHandler(app, TransactionAmount, transactions.handle_transaction_amount_post);
api.registerHandler(app, TransactionDate, transactions.handle_transaction_date_post);
api.registerHandler(app, TransactionCategory, transactions.handle_transaction_category_post);
api.registerHandler(app, TransactionSplit, transactions.handle_transaction_split_post);

api.registerHandler(app, AddCategory, categories.handle_category_post);
api.registerHandler(app, DeleteCategory, categories.handle_category_delete);
api.registerHandler(app, CategoryBudget, categories.handle_category_budget_post);
api.registerHandler(app, CategoryName, categories.handle_category_name_post);

/* Static Routes */
app.use(serveStatic(path.join(__dirname, "../client")));
// app.use(serveStatic(path.join(__dirname, '../../static')));
app.use(serveStatic(path.join(__dirname, "../../node_modules/react/umd")));
app.use(serveStatic(path.join(__dirname, "../../node_modules/react-dom/umd")));
app.use(serveStatic(path.join(__dirname, "../../static/RobotoMono")));
app.get("/index.css", serveStatic(path.join(__dirname, "../../static/")));

const reactMode = app.get("env") == "development" ? "development" : "production.min";
app.get("/react.js", (_, res) =>
  res.sendFile(path.join(__dirname, `../../node_modules/react/umd/react.${reactMode}.js`)));
app.get("/react-dom.js", (_, res) =>
  res.sendFile(path.join(__dirname, `../../node_modules/react-dom/umd/react-dom.${reactMode}.js`)));


const index = (_req: Request, res: Response) =>
  res.sendFile(path.join(__dirname + "../../../static/index.html"));

app.get("/", ensureLogin.ensureLoggedOut("/app"), index);
app.get("/app", ensureLogin.ensureLoggedIn(""), index);
app.get("/app/home/:month/:year", ensureLogin.ensureLoggedIn(""), index);
app.get("/app/transactions/:month/:year", ensureLogin.ensureLoggedIn(""), index);

// Anything not matched above, use the main react app
app.get("*", index);

export default app;
