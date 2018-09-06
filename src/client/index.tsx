import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route, Link } from 'react-router-dom'
import NoRoute from './noroute';
import App from './app';

const Home = () => <div className="home">
    <h1>Dino Budgeter</h1>
    <Link className="button" to="/login">Log In</Link>{' '}
    <Link className="button" to="/signup">Sign Up</Link>
</div>;

const msg = (text: string) => () => <div>{text}</div>;

const Login = () => <form action="/login" method="post">
    <Route path="/login/error" render={msg("There was an error. Fix it!")} />
    <div>
        <label>Email:</label>
        <input type="text" name="username"/>
    </div>
    <div>
        <label>Password:</label>
        <input type="password" name="password"/>
    </div>
    <div>
        <input type="submit" value="Log In"/>
    </div>
</form>;

const Signup = () => <form action="/signup" method="post">
    <Route path="/signup/no-password" render={msg("You must enter a password.")} />
    <Route path="/signup/invalid-email" render={msg("You must enter a valid email.")} />
    <Route path="/signup/user-exists" render={msg("There is already an account with that email.")} />
    <div>
        <label>Username:</label>
        <input type="text" name="username"/>
    </div>
    <div>
        <label>Password:</label>
        <input type="password" name="password"/>
    </div>
    <div>
        <input type="submit" value="Sign Up"/>
    </div>
</form>;

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
    <BrowserRouter>
        <Index />
    </BrowserRouter>,
    document.getElementById('root') as HTMLElement
);