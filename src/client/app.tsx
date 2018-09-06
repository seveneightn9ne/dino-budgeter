import * as React from 'react';
import { GroupId, Frame as FrameType } from '../shared/types';
import Frame from './frame';
import Transactions from './transactions';
import NoRoute from './noroute';
import { Switch, Route, Redirect } from 'react-router';
import Media from 'react-media';
import AddTransaction from './addtransaction';

interface AppState {
    group?: GroupId;
    frame?: FrameType;
    // frameLoaded is set when we navigated to /app and the current frame has been fetched.
    frameLoaded?: FrameType;
}

/** /app */
export default class App extends React.Component<{}, AppState> {
    private currentMonth: number;
    private currentYear: number;
    constructor(props: {}) {
      super(props);
      const date = new Date();
      this.currentMonth = date.getMonth() + 1; // To make it look right in the URL ;)
      this.currentYear = date.getFullYear();
      this.state = {};
    }

    renderLandingPage = () => <Media query="(max-width: 599px)">
        {(isMobile: boolean) => isMobile ? <AddTransaction /> :
            <Redirect from="/app" to={"/app/" + this.currentMonth + "/" + this.currentYear} />}
    </Media>;

    render() {
        return <Switch>
            <Route exact path="/app" render={this.renderLandingPage} />
            <Route path="/app/:month/:year" component={Frame} />
            <Route path="/app/add-transaction" component={AddTransaction} />
            <Route path="*" component={NoRoute} />
        </Switch>;
    }
}