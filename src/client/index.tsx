import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Link,
  Route,
  RouteComponentProps,
  Router,
  Switch,
} from "react-router-dom";
import { App } from "./app";
import NoRoute from "./noroute";
import { history } from "./util";

const Home = () => (
  <main className="home">
    <h1>Dino Personal Budgeting</h1>
    <p>Month-to-month budget planning and tracking</p>
    <div>
      <Link className="button" to="/login">
        Log In
      </Link>{" "}
      <Link className="button" to="/signup">
        Sign Up
      </Link>
    </div>
    <div className="images">
      <img src="categories.png" width="400" />
      <img src="mobile.png" height="250" />
      <img src="category.png" width="400" />
    </div>
  </main>
);

const msg = (text: string) => () => <p>{text}</p>;

const Login = (props: RouteComponentProps<{}>) => (
  <main className="login">
    <h1>Dino Personal Budgeting</h1>
    <form action="/login" method="post">
      <input
        type="hidden"
        name="redirect"
        value={props.location.search.substring("?redirectTo=".length)}
      />
      <Route path="/login/error" render={msg("There was an error. Fix it!")} />
      <Route
        path="/login/password-reset"
        render={msg("Your password has been reset. You can log in now.")}
      />
      <div>
        <label>Email: </label>
        <input type="text" name="username" />
      </div>
      <div>
        <label>Password: </label>
        <input type="password" name="password" />
      </div>
      <div>
        Forgot your password? You can{" "}
        <Link to="/forgot-password">reset it</Link>.
      </div>
      <div>
        <input type="submit" value="Log In" className="button" />
      </div>
    </form>
  </main>
);

const Signup = () => (
  <main className="signup">
    <form action="/signup" method="post">
      <h1>Dino Personal Budgeting</h1>
      <Route
        path="/signup/no-password"
        render={msg("You must enter a password.")}
      />
      <Route
        path="/signup/invalid-email"
        render={msg("You must enter a valid email.")}
      />
      <Route
        path="/signup/user-exists"
        render={msg("There is already an account with that email.")}
      />
      <div>
        <label>Username: </label>
        <input type="text" name="username" />
      </div>
      <div>
        <label>Password: </label>
        <input type="password" name="password" />
      </div>
      <div>
        <input type="submit" value="Sign Up" className="button" />
      </div>
    </form>
  </main>
);

const ForgotPassword = () => (
  <main className="forgot-password">
    <h1>Dino Personal Budgeting</h1>
    <Switch>
      <Route
        path="/forgot-password/success"
        render={msg("We've sent you the email to reset your password.")}
      />
      <Route path="*">
        <form action="/forgot-password" method="post">
          <Switch>
            <Route
              path="/forgot-password/invalid-email"
              render={msg("You must enter a valid email.")}
            />
            <Route
              path="/forgot-password/no-account"
              render={msg("There is no account with that email.")}
            />
            <Route
              exact={true}
              path="/forgot-password"
              render={msg("Reset your password")}
            />
          </Switch>
          <label>
            Email address: <input type="text" name="email" />
          </label>
          <br />
          <input
            type="submit"
            name="submit"
            value="Send reset link"
            className="button"
          />
          <p>
            <Link to="/login">Back to login</Link>
          </p>
        </form>
      </Route>
    </Switch>
  </main>
);

const ResetPassword = () => (
  <main className="reset-password">
    <h1>Dino Personal Budgeting</h1>
    <Switch>
      <Route
        path="/reset-password/invalid-token"
        render={msg("The link you followed was invalid.")}
      />
      <Route
        path="/reset-password/expired-token"
        render={msg("Your password reset has expired.")}
      />
      <Route path="/reset-password/t/:token" render={ResetPasswordForm} />
    </Switch>
  </main>
);

const ResetPasswordForm = (props: RouteComponentProps<{ token: string }>) => (
  <form action="/reset-password" method="post">
    <p>Enter a new password</p>
    <input type="hidden" name="token" value={props.match.params.token} />
    <label>
      New password: <input type="password" name="password" />
    </label>
    <br />
    <input type="submit" name="submit" value="Save" className="button" />
  </form>
);

export const Index = () => (
  <Switch>
    <Route exact={true} path="/" component={Home} />
    <Route path="/login" component={Login} />
    <Route path="/signup" component={Signup} />
    <Route path="/forgot-password" component={ForgotPassword} />
    <Route path="/reset-password" component={ResetPassword} />
    <Route path="/app" component={App} />
    <Route path="*" component={NoRoute} />
  </Switch>
);

ReactDOM.render(
  <Router history={history}>
    <Index />
  </Router>,
  document.getElementById("root") as HTMLElement,
);
