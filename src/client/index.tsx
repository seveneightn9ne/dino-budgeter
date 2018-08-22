import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route, Link } from 'react-router-dom'

const Home = () => <div>
    <Link to="/login">Log In</Link>
    <Link to="/signup">Sign Up</Link>
</div>;

const Login = () => <form action="/login" method="post">
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

const msg = (text: string) => () => <div>{text}</div>;
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

class App extends React.Component {
    render() {
        return (
        <Switch>
            <Route exact path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
        </Switch>
        );
    }
}
  
ReactDOM.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>,
    document.getElementById('root') as HTMLElement
);