import * as React from 'react';
import { BrowserRouter, Switch, Route, Link, RouteComponentProps } from 'react-router-dom'

interface AppState {
    groups: string[];
    group: string;
}

type AppProps = RouteComponentProps<{group_id?: string}>;

export default class App extends React.Component<AppProps, AppState> {
    constructor(props: AppProps) {
        super(props);
        if (props.match.params.group_id) {
            this.state = {
                groups: [props.match.params.group_id],
                group: props.match.params.group_id
            };
        } else {
            this.state = {
                groups: [],
                group: undefined,
            }
        }
    }
    componentDidMount() {
        fetch('/api/groups').then((response) => {
            response.json().then(response => {
                this.setState({groups: response.groups});
                if (response.groups.length == 1 && !this.state.group) {
                    this.setState({group: response.groups[0]});
                }
            })
        })
    }
    render() {
        console.log(this.props);
        return (
        <div>
            Welcome to the app. Your group is {this.state.group}.
        </div>
        );
    }
}
