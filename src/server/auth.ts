import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Request, Response} from 'express';
import randomstring from 'randomstring';
import {User} from '../shared/types';
import bcrypt from 'bcrypt';
import db from './db';

passport.serializeUser(function(user: User, cb) {
    cb(null, user.uid);
});

passport.deserializeUser(function(id: string, cb) {
    db.one("select * from users where uid=$1", id)
        .then((row) => cb(null, row as User))
        .catch((error) => cb(error));
});

// Passport configuration
passport.use(new LocalStrategy(
  function(username, password, done) {
    db.one("select * from users where email=$1", username)
    .then((row) => {
      if (bcrypt.compareSync(password, row.password_hash)) {
        return done(null, row as User);
      } else {
          // TODO how to show the user the error message??
        return done(null, false, {message: 'Incorrect passowrd.'});
      }
    })
    .catch(error => {
      return done(null, false, { message: 'Incorrect username.' });
    });
  }
));

export const handle_login_post = passport.authenticate('local', {
    successRedirect: '/app',
    failureRedirect: '/login/error'});

export const handle_signup_post = function(req: Request, res: Response) {
    req.checkBody("username").isEmail();
    req.checkBody("password").notEmpty();
    req.getValidationResult().then((result) => {
        const errors = result.mapped();
        if (errors['username']) {
            res.redirect('/signup/invalid-email');
            return;
        }
        if (errors['password']) {
            res.redirect('/signup/no-password');
            return;
        }
        const email = req.body.username;
        const password = req.body.password;
        db.one("select 1 from users where email=$1", email).then(() => {
            res.redirect('/signup/user-exists');
        }).catch(() => {
            // Good - the user doesn't exist already
            const password_hash = bcrypt.hashSync(password, 10);
            const user_id = randomstring.generate(32);
            db.none("insert into users values ($1, $2, $3)", [user_id, email, password_hash]);
            passport.authenticate('local', {successRedirect: '/app'});
            res.redirect("/");
        });
    });
}

export const handle_current_email_get = function(req: Request, res: Response) {
    res.send({email: (req.user as User).email});
}