import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Request, Response} from 'express';
import {User} from '../shared/types';
import bcrypt from 'bcrypt';
import db from './db';
import {randomId} from './util';

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
    const email = req.body.username;
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
        return db.one("select count(*) > 0 as exists from users where email=$1", email);
    }).then((row) => {
        if (row.exists){
            res.redirect('/signup/user-exists');
        } else {
            const password = req.body.password;
            const password_hash = bcrypt.hashSync(password, 10);
            const user_id = randomId();
            const group_id = randomId();
            db.tx(function * (t) {
                yield t.none("insert into users values ($1, $2, $3)", [user_id, email, password_hash]);
                yield t.none("insert into groups values ($1)", [group_id]);
                yield t.none("insert into membership (uid, gid) values ($1, $2)", [user_id, group_id]);
            }).then(() => {
                passport.authenticate('local', {successRedirect: '/app'})(req, res);
            });
        }
    });
}