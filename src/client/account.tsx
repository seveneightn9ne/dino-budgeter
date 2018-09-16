import * as React from 'react';
import {Friend, Transaction} from '../shared/types';
import { index } from '../shared/frames';
import TxEntry from './txentry';
import { Redirect, RouteComponentProps } from 'react-router';
import * as util from './util';
import { History, Location } from 'history';

interface Props {
    history: History;
    location: Location;
}

interface State {
    email?: string;
    friends?: Friend[];
    addFriend: string;
    addFriendError?: string;
    invites?: Friend[];
}

export default class Account extends React.Component<Props, State> {

    state: State = {
        addFriend: '',
    }

    componentDidMount() {
        this.initialize();
    }

    initialize(): Promise<void[]> {
        return Promise.all([
            util.apiGet({
                path: '/api/friends',
                location: this.props.location,
                history: this.props.history,
            }).then(response => {
                this.setState({
                    friends: response.friends,
                    invites: response.invites,
                });
            }),
            util.apiGet({
                path: '/api/current-email',
                location: this.props.location,
                history: this.props.history,
            }).then(response => {
                this.setState({email: response.email});
            }),
        ]);
    }

    onAddFriend(e: React.FormEvent) {
        this.setState({addFriendError: ''});
        this.acceptFriend(this.state.addFriend, true);
        this.setState({
            addFriend: '',
        });
        e.preventDefault();
    }

    acceptFriend(email: string, willBePending = false) {
        util.apiPost({
            path: "/api/friend",
            body: {email},
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            const newFriends = [...this.state.friends];
            newFriends.push({
                email, pending: willBePending,
            });
            const newInvites = this.state.invites.filter(i => i.email != email);
            this.setState({
                friends: newFriends,
                invites: newInvites,
            });
        }).catch(e => {
            if (e == 404) {
                this.setState({addFriendError: "That user does not exist."});
            } else {
                throw e;
            }
        });
    }

    rejectFriend(email: string) {
        util.apiPost({
            path: "/api/friend/reject",
            body: {email},
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            const newInvites = this.state.invites.filter(i => i.email != email);
            this.setState({
                invites: newInvites,
            });
        });
    }

    render(): JSX.Element {
        let friends;
        if (this.state.friends) {
            friends = this.state.friends.map(friend => {
                const thing = friend.pending ? 
                    <span className="pending">Pending</span> : 
                    <span className="clickable">Remove</span>;
                return <li key={friend.email}>{friend.email}{' '}{thing}</li>
            });
        }
        let errorMessage;
        if (this.state.addFriendError) {
            errorMessage = <p className="errorMessage">{this.state.addFriendError}</p>
        }
        let invites;
        if (this.state.invites && this.state.invites.length > 0) {
            const invitesLis = this.state.invites.map(i => 
                <li key={i.email}>{i.email} {' '}
                    <span className="clickable" onClick={() => this.acceptFriend(i.email)}>Accept</span> {' '}
                    <span className="clickable" onClick={() => this.rejectFriend(i.email)}>Reject</span>
                </li>
            );
            invites = <div>
                <h2>Friend Requests</h2>
                <ul>
                    {invitesLis}
                </ul>

            </div>;
        }
        return <div>
            <header><div className="inner">
                <h1>Account Settings</h1>
            </div></header>
            <main>
            <p>{this.state.email}</p>
            {invites}
            <h2>Friends</h2>
            <ul>
                {friends}
            </ul>
            <p>Add a friend by email. Once they confirm, you'll be able to split transactions with them.</p>
            {errorMessage}
            <form onSubmit={this.onAddFriend.bind(this)}>
                <input type="email" placeholder="Email"
                    value={this.state.addFriend}
                    onChange={util.cc(this, 'addFriend')} />
                <input type="submit" value="Request" />
            </form>
            </main>
        </div>;
    }
}
