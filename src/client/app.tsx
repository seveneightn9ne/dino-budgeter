import * as React from 'react';
import { BrowserRouter, Switch, Route, Link, RouteComponentProps } from 'react-router-dom'

interface AppState {
    group?: string;
}

//type AppProps = RouteComponentProps<{group_id?: string}>;

/** /app */
export default class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
      super(props);
      this.state = {};
    }
    
    componentDidMount() {
        fetch('/api/groups').then((response) => {
            response.json().then(response => {
                if (response.groups.length >= 1) {
                    console.log("your group is " + response.groups[0]);
                    this.setState({group: response.groups[0]});
                }
            })
        })
    }
    render() {
        if (!this.state.group) {
            console.log("there is no group");
            return null;
        }
        return (
        <div>
            Welcome to the app. Your group is {this.state.group}.
        </div>
        );
    }
}
