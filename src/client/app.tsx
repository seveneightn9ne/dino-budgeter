import * as React from 'react';
import { GroupId, Frame as FrameType } from '../shared/types';
import Frame from './frame';
import Transactions from './transactions';
import NoRoute from './noroute';
import { Switch, Route, Redirect, RouteComponentProps } from 'react-router';
import AddTransaction from './addtransaction';
import { MobileQuery } from './components/media';

interface AppState {
    group?: GroupId;
    frame?: FrameType;
    // frameLoaded is set when we navigated to /app and the current frame has been fetched.
    frameLoaded?: FrameType;
}

/** /app */
export default class App extends React.Component<RouteComponentProps<{}>, AppState> {
    private currentMonth: number;
    private currentYear: number;
    constructor(props: RouteComponentProps<{}>) {
      super(props);
      const date = new Date();
      this.currentMonth = date.getMonth() + 1; // To make it look right in the URL ;)
      this.currentYear = date.getFullYear();
      this.state = {};
    }

    renderLandingPage = () => <MobileQuery
        mobile={<Redirect to="/app/add-transaction" />}
        desktop={<Redirect from="/app" to={"/app/" + this.currentMonth + "/" + this.currentYear} />}
        />;

    render() {
        return <Switch>
            <Route exact path="/app" render={this.renderLandingPage} />
            <Route path="/app/:month/:year" component={Frame} />
            <Route path="/app/add-transaction" component={AddTransaction} />
            <Route path="*" component={NoRoute} />
        </Switch>;
    }
}
