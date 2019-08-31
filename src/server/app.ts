import * as bodyParser from "body-parser";
import * as ensureLogin from "connect-ensure-login";
import connectPgSimple from "connect-pg-simple";
import express, { Request, Response } from "express";
import session from "express-session";
import validator from "express-validator";
import morgan from "morgan";
import passport from "passport";
import path from "path";
import serveStatic from "serve-static";
import { express as api } from "typescript-json-api";
import {
  AcceptFriend,
  AddCategory,
  AddTransaction,
  BudgetingMove,
  CategoryBudget,
  CategoryName,
  DeleteCategory,
  DeleteFriend,
  DeleteTransaction,
  Income,
  Initialize,
  Name,
  Payment,
  RejectFriend,
  TransactionAmount,
  TransactionCategory,
  TransactionDate,
  TransactionDescription,
  TransactionSplit,
  UpdateSettings,
} from "../shared/api";
import * as dino_api from "./api";
import * as categories from "./api/categories";
import * as frame from "./api/frame";
import * as payments from "./api/payments";
import * as transactions from "./api/transactions";
import * as user from "./api/user";
import * as auth from "./auth";
import db from "./db";

const app = express();
app.use(
  bodyParser.text({
    type: "application/json",
  }),
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(morgan("combined"));
const pgSession = connectPgSimple(session);
const sessionOptions: session.SessionOptions = {
  store: new pgSession({
    pgPromise: db,
  }),
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  },
  rolling: true, // reset cookie expiration on each request
  resave: true, // TODO: not needed if pgSession implements touch
  saveUninitialized: true,
  secret: [process.env.DINO_SESSION_SECRET, "TODO"],
};
if (app.get("env") === "production") {
  app.set("trust proxy", 1); // 1 means the first hop before the proxy (nginx) is considered the client
  // sessionOptions.cookie.secure = true; // TODO: this doesn't work, why? (server does not set any cookie)
}
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

// Express configuration
app.set("port", process.env.PORT || 3000);

// API configuration
api.registerPassportUserExtractor();
api.registerMiddleware(
  ensureLogin.ensureLoggedIn({ redirectTo: "/api/auth-redirect" }),
);

/**
 * Primary app routes.
 */
app.post("/login", auth.handle_login_post);
app.post("/signup", auth.handle_signup_post);
app.post("/forgot-password", auth.handle_forgot_password_post);
app.get("/reset", auth.handle_reset_password_get);
app.post("/reset-password", auth.handle_reset_password_post);
app.get("/logout", auth.handle_logout_get);

/**
 * API Routes. They require login.
 */
app.get("/api/auth-redirect", user.handle_auth_redirect_get);

api.register(app, AcceptFriend, user.handle_add_friend_post);
api.register(app, RejectFriend, user.handle_reject_friend_post);
api.register(app, DeleteFriend, user.handle_friend_delete);
api.register(app, Name, user.handle_change_name_post);
api.register(app, UpdateSettings, user.handle_update_settings_post);

api.register(app, Payment, payments.handle_payment_post);
api.register(app, Initialize, dino_api.handle_init_get);

api.register(app, Income, frame.handle_income_post);
api.register(app, BudgetingMove, frame.handle_budgeting_move_post);

api.register(app, AddTransaction, transactions.handle_transaction_post);
api.register(app, DeleteTransaction, transactions.handle_transaction_delete);
api.register(
  app,
  TransactionDescription,
  transactions.handle_transaction_description_post,
);
api.register(
  app,
  TransactionAmount,
  transactions.handle_transaction_amount_post,
);
api.register(app, TransactionDate, transactions.handle_transaction_date_post);
api.register(
  app,
  TransactionCategory,
  transactions.handle_transaction_category_post,
);
api.register(app, TransactionSplit, transactions.handle_transaction_split_post);

api.register(app, AddCategory, categories.handle_category_post);
api.register(app, DeleteCategory, categories.handle_category_delete);
api.register(app, CategoryBudget, categories.handle_category_budget_post);
api.register(app, CategoryName, categories.handle_category_name_post);

/* Static Routes */
app.use(serveStatic(path.join(__dirname, "../client")));
// app.use(serveStatic(path.join(__dirname, '../../static')));
app.use(serveStatic(path.join(__dirname, "../../node_modules/react/umd")));
app.use(serveStatic(path.join(__dirname, "../../node_modules/react-dom/umd")));
app.use(serveStatic(path.join(__dirname, "../../static/RobotoMono")));
app.use(serveStatic(path.join(__dirname, "../../static/fontawesome")));
app.use(serveStatic(path.join(__dirname, "../../static/images")));
app.get("/index.css", serveStatic(path.join(__dirname, "../../static/")));

const reactMode =
  app.get("env") == "development" ? "development" : "production.min";
app.get("/react.js", (_, res) =>
  res.sendFile(
    path.join(__dirname, `../../node_modules/react/umd/react.${reactMode}.js`),
  ),
);
app.get("/react-dom.js", (_, res) =>
  res.sendFile(
    path.join(
      __dirname,
      `../../node_modules/react-dom/umd/react-dom.${reactMode}.js`,
    ),
  ),
);

const index = (_req: Request, res: Response) =>
  res.sendFile(path.join(__dirname + "../../../static/index.html"));

app.get("/", ensureLogin.ensureLoggedOut("/app"), index);
app.get("/login", ensureLogin.ensureLoggedOut("/app"), index);
app.get("/signup", ensureLogin.ensureLoggedOut("/app"), index);
app.get("/app", ensureLogin.ensureLoggedIn(""), index);
app.get("/app/home/:month/:year", ensureLogin.ensureLoggedIn(""), index);
app.get(
  "/app/transactions/:month/:year",
  ensureLogin.ensureLoggedIn(""),
  index,
);

// Anything not matched above, use the main react app
app.get("*", index);

export default app;
