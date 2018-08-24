import * as React from 'react';
import { BrowserRouter, Switch, Route, Link, RouteComponentProps } from 'react-router-dom'
import { GroupId, Frame } from '../shared/types';

interface AppState {
    group?: GroupId;
    frame?: Frame;
}

//type AppProps = RouteComponentProps<{group_id?: string}>;

/** /app */
export default class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
      super(props);
      this.state = {};
    }
    componentDidMount() {
        this.initializeGroup().then((gid: GroupId) => {
            this.initializeFrame(gid);
        })
    }

    initializeFrame(gid: GroupId): Promise<Frame> {
        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();
        const path = '/api/frame?gid=' + gid + '&month=' + month + '&year=' + year;
        return fetch(path).then((response) => {
            return response.json();
        }).then(response => {
            const frame = response as Frame;
            this.setState({frame});
            return frame;
        });
    }

    initializeGroup(): Promise<GroupId> {
        return fetch('/api/groups').then((response) => {
            return response.json().then(response => {
                if (!response.groups.length) {
                    throw Error("You really should have a group.");
                }
                const gid: GroupId = response.groups[0];
                console.log("your group is " + gid);
                this.setState({group: gid});
                return gid;
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
