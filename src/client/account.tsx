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

interface InitializedState {
    me: Friend;
    friends: Friend[];
    pendingFriends: Friend[];
    invites: Friend[];
}

interface NonInitializedState {
    initialized: boolean;
    addFriend: string;
    addFriendError?: string;
}

interface State extends Partial<InitializedState>, NonInitializedState {}

export default class Account extends React.Component<Props, State> {

    state: State = {
        initialized: false,
        addFriend: '',
    }

    componentDidMount() {
        util.initializeState(this, 0, 'friends', 'pendingFriends', 'me', 'invites');
    }

    onAddFriend(e: React.FormEvent) {
        this.setState({addFriendError: ''});
        this.acceptFriend(this.state.addFriend, false);
        this.setState({
            addFriend: '',
        });
        e.preventDefault();
    }

    isInitialized(state: State): state is (InitializedState & NonInitializedState) {
        return state.initialized;
    }

    acceptFriend(email: string, wasInvited: boolean) {
        util.apiPost({
            path: "/api/friend",
            body: {email},
            location: this.props.location,
            history: this.props.history,
        }).then((res) => {
            if (wasInvited) {
                // Invite -> Friend
                this.setState({
                    friends: [...this.state.friends, res.friend],
                    invites: this.state.invites.filter(e => e.email != email),
                })
            } else {
                // {} -> Pending
                this.setState({
                    pendingFriends: [...this.state.pendingFriends, res.friend],
                })
            }
        }).catch(e => {
            if (e == 404) {
                this.setState({addFriendError: "That user does not exist."});
            } else {
                throw e;
            }
        });
    }

    // TODO: could/should reject by uid
    rejectFriend(email: string) {
        util.apiPost({
            path: "/api/friend/reject",
            body: {email},
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            const newInvites = this.state.invites.filter(i => i.email != email);
            const newFriends = this.state.friends.filter(f => f.email != email);
            const newPending = this.state.pendingFriends.filter(p => p.email != email);
            this.setState({
                friends: newFriends,
                invites: newInvites,
                pendingFriends: newPending,
            });
        });
    }

    deleteFriend(email: string) {
        util.apiPost({
            method: 'DELETE',
            path: "/api/friend",
            body: {email},
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            const newInvites = this.state.invites.filter(i => i.email != email);
            const newFriends = this.state.friends.filter(f => f.email != email);
            const newPending = this.state.pendingFriends.filter(p => p.email != email);
            this.setState({
                friends: newFriends,
                invites: newInvites,
                pendingFriends: newPending,
            });
        });
    }

    render(): JSX.Element {
        if (!this.state.initialized) {
            return null;
        }
        const friends = this.state.friends.map(friend => <li key={friend.uid}>{friend.email}{' '}
            <span className="clickable" onClick={() => this.deleteFriend(friend.email)}>Remove</span></li>);

        friends.push(...this.state.pendingFriends.map(friend => <li key={friend.uid}>{friend.email}{' '}
                <span className="pending">(Pending)</span>{' '}
                <span className="clickable" onClick={() => this.rejectFriend(friend.email)}>Remove</span></li>));
        
        let errorMessage;
        if (this.state.addFriendError) {
            errorMessage = <p className="errorMessage">{this.state.addFriendError}</p>
        }
        let invites;
        if (this.state.invites.length > 0) {
            const invitesLis = this.state.invites.map(i => 
                <li key={i.uid}>{i.email} {' '}
                    <span className="clickable" onClick={() => this.acceptFriend(i.email, true)}>Accept</span> {' '}
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
            <p>{this.state.me.email}</p>
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
