import * as React from "react";
import * as ReactDOM from "react-dom";
import { Link, Route, RouteComponentProps, Router, Switch } from "react-router-dom";
import App from "./app";
import NoRoute from "./noroute";
import { history } from './util';

const Home = () => <main className="home">
    <h1>Dino Personal Budgeting</h1>
    <p>Month-to-month budget planning and tracking</p>
    <div>
        <Link className="button" to="/login">Log In</Link>{" "}
        <Link className="button" to="/signup">Sign Up</Link>
    </div>
    <div className="images">
        <img src="categories.png" width="400" />
        <img src="mobile.png" height="250" />
        <img src="category.png" width="400" />
    </div>
</main>;

const msg = (text: string) => () => <div>{text}</div>;

const Login = (props: RouteComponentProps<{}>) => <main className="login">
    <h1>Dino Personal Budgeting</h1>
    <form action="/login" method="post">
        <input type="hidden" name="redirect" value={props.location.search.substring("?redirectTo=".length)} />
        <Route path="/login/error" render={msg("There was an error. Fix it!")} />
        <div>
            <label>Email:{' '}</label>
            <input type="text" name="username" />
        </div>
        <div>
            <label>Password:{' '}</label>
            <input type="password" name="password" />
        </div>
        <div>
            <input type="submit" value="Log In" className="button" />
        </div>
    </form></main>;

const Signup = () => <main className="signup"><form action="/signup" method="post">
    <h1>Dino Personal Budgeting</h1>
    <Route path="/signup/no-password" render={msg("You must enter a password.")} />
    <Route path="/signup/invalid-email" render={msg("You must enter a valid email.")} />
    <Route path="/signup/user-exists" render={msg("There is already an account with that email.")} />
    <div>
        <label>Username:{' '}</label>
        <input type="text" name="username" />
    </div>
    <div>
        <label>Password:{' '}</label>
        <input type="password" name="password" />
    </div>
    <div>
        <input type="submit" value="Sign Up" className="button" />
    </div>
</form></main>;

class Index extends React.Component {
    render() {
        return (
            <Switch>
                <Route exact path="/" component={Home} />
                <Route path="/login" component={Login} />
                <Route path="/signup" component={Signup} />
                <Route path="/app" component={App} />
                <Route path="*" component={NoRoute} />
            </Switch>
        );
    }
}

ReactDOM.render(
    <Router history={history}>
        <Index />
    </Router>,
    document.getElementById("root") as HTMLElement
);
