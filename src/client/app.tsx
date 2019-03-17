import * as React from "react";
import { Redirect, Route, Switch } from "react-router";
import Account from "./account";
import Frame from "./frame";
import NoRoute from "./noroute";

/** /app */
export const App: React.SFC = () => {
    return <Switch>
        <Route exact path="/app" render={renderLandingPage} />
        <Route path="/app/:month/:year" component={Frame} />
        <Route path="/app/account" component={Account} />
        <Route path="*" component={NoRoute} />
    </Switch>;
}

const renderLandingPage = () => {
    const date = new Date();
    const currentMonth = date.getMonth() + 1; // To make it look right in the URL ;)
    const currentYear = date.getFullYear();
    return <Redirect from="/app" to={"/app/" + currentMonth + "/" + currentYear} />;
    /*return <MobileQuery
        mobile={<Redirect to="/app/add-transaction" />}
        desktop={<Redirect from="/app" to={"/app/" + currentMonth + "/" + currentYear} />}
    />;*/
}