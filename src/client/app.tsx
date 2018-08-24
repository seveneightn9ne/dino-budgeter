import * as React from 'react';
import { GroupId, Frame as FrameType } from '../shared/types';
import Frame from './frame';

interface AppState {
    group?: GroupId;
    frame?: FrameType;
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

    initializeFrame(gid: GroupId): Promise<FrameType> {
        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();
        const path = '/api/frame?gid=' + gid + '&month=' + month + '&year=' + year;
        return fetch(path).then((response) => {
            return response.json();
        }).then(response => {
            const frame = response as FrameType;
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
        if (!this.state.frame) {
            console.log("there is no frame");
            return null;
        }
        return <Frame frame={this.state.frame} />;
    }
}
