import * as React from 'react';
import { GroupId, Frame as FrameType } from '../shared/types';
import Frame from './frame';
import Transactions from './transactions';
import NoRoute from './noroute';
import { Switch, Route, Redirect } from 'react-router';

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
    render() {
        return <Switch>
            <Redirect exact from="/app" to={"/app/" + this.currentMonth + "/" + this.currentYear} />
            <Route path="/app/:month/:year" component={Frame} />
            <Route path="/app/transactions/:frame" component={Transactions} />
            <Route path="/apq" component={NoRoute} />
        </Switch>;
    }
}
