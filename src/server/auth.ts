import bcrypt from "bcrypt";
import { Request, Response } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { User, UserId } from "../shared/types";
import * as util from "../shared/util";
import db from "./db";
import * as email from "./email";

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);
const checkPassword = (password: string, hash: string) => bcrypt.compareSync(password, hash);

passport.serializeUser(function (user: User, cb) {
    cb(null, user.uid);
});

passport.deserializeUser(function (id: string, cb) {
    db.one("select * from users where uid=$1", id)
        .then((row) => cb(null, row as User))
        .catch((error) => cb(error));
});

// Passport configuration
passport.use(new LocalStrategy(
    function (username, password, done) {
        db.one("select * from users where email=$1", username)
            .then((row) => {
                if (checkPassword(password, row.password_hash)) {
                    return done(null, row as User);
                } else {
                    // TODO how to show the user the error message??
                    return done(null, false, { message: "Incorrect passowrd." });
                }
            })
            .catch(() => {
                return done(null, false, { message: "Incorrect username." });
            });
    }
));

export const handle_login_post = function (req: Request, res: Response) {
    const successRedirect = req.body.redirect || "/app";
    passport.authenticate("local", {
        successRedirect,
        failureRedirect: "/login/error",
    })(req, res);
};

export const handle_logout_get = function (req: Request, res: Response) {
    req.logOut();
    res.redirect("/");
}

export const handle_signup_post = function (req: Request, res: Response) {
    req.checkBody("username").isEmail();
    req.checkBody("password").notEmpty();
    const email = req.body.username;
    req.getValidationResult().then((result) => {
        const errors = result.mapped();
        if (errors["username"]) {
            res.redirect("/signup/invalid-email");
            return;
        }
        if (errors["password"]) {
            res.redirect("/signup/no-password");
            return;
        }
        return db.one("select count(*) > 0 as exists from users where email=$1", email);
    }).then((row) => {
        if (row.exists) {
            res.redirect("/signup/user-exists");
        } else {
            const password = req.body.password;
            const password_hash = hashPassword(password);
            const user_id = util.randomId();
            const group_id = util.randomId();
            db.tx(function* (t) {
                yield t.none("insert into users values ($1, $2, $3)", [user_id, email, password_hash]);
                yield t.none("insert into groups values ($1)", [group_id]);
                yield t.none("insert into membership (uid, gid) values ($1, $2)", [user_id, group_id]);
            }).then(() => {
                passport.authenticate("local", { successRedirect: "/app" })(req, res);
            });
        }
    });
};

export const handle_forgot_password_post = async function (req: Request, res: Response) {
    req.checkBody("email").isEmail();
    const result = await req.getValidationResult()
    const errors = result.mapped();
    if (errors["email"]) {
        res.redirect("/forgot-password/invalid-email");
        return;
    }
    const emailAddress: string = req.body.email;
    await db.tx(async (t) => {
        const user: User = await t.oneOrNone("select * from users where email = $1", emailAddress);
        if (!user) {
            res.redirect("/forgot-password/no-account");
            return;
        }
        const existing = await t.oneOrNone("select * from email_resets where uid = $1", user.uid);
        const token = util.token();
        const expireTime = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now
        if (existing) {
            t.none("update email_resets set token = $1, expires = $2 where uid = $3", [token, expireTime, user.uid]);
        } else {
            t.none("insert into email_resets (uid, token, expires) values ($1, $2, $3)", [user.uid, token, expireTime]);
        }
        email.send({
            to: emailAddress,
            subject: "Dino Budgeting Password Reset Link",
            body: `Hey! Here's the link to reset your password: https://dino.jesskenney.com/reset?t=${token}

If you didn't request your password to be reset, you can ignore this email.`,
        });
        res.redirect("/forgot-password/success");
        return;
    });
};

export const handle_reset_password_get = async function (req: Request, res: Response) {
    const token = req.query.t;
    if (!token) {
        res.redirect("/");
        return;
    }
    await db.tx(async (t) => {
        const resetRow = await t.oneOrNone("select * from email_resets where token = $1", token);
        if (!resetRow) {
            res.redirect("/reset-password/invalid-token");
            return;
        }
        if (resetRow.expires < new Date()) {
            res.redirect("/reset-password/expired-token");
            return;
        }
        res.redirect(`/reset-password/t/${token}`);
        return;
    });
};

export const handle_reset_password_post = async function (req: Request, res: Response) {
    const token = req.body.token;
    const password = req.body.password;
    const passwordHash = hashPassword(password);
    await db.tx(async (t) => {
        const resetRow: { uid: UserId } = await t.oneOrNone("select uid from email_resets where token = $1", token);
        if (!resetRow) {
            res.redirect("/reset-password/invalid-token");
            return;
        }
        await t.none("update users set password_hash = $1 where uid = $2", [passwordHash, resetRow.uid]);
        if (req.user && req.user.uid === resetRow.uid) {
            // the user is logged in already
            res.redirect("/app");
        } else {
            res.redirect("/login/password-reset");
        }
    });
};
