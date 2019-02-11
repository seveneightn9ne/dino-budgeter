import * as React from "react";
import { Friend } from "../shared/types";
import * as util from "./util";
import { Name, AcceptFriend, RejectFriend, DeleteFriend } from "../shared/api";

interface Props {}

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
    name: string;
}

interface State extends Partial<InitializedState>, NonInitializedState {}

export default class Account extends React.Component<Props, State> {

    state: State = {
        initialized: false,
        addFriend: "",
        name: "",
    };

    componentDidMount() {
        util.initializeState(this, 0, "friends", "pendingFriends", "me", "invites").then(() => {
            this.setState({
                name: this.state.me.name || this.state.me.email,
            });
        });
    }

    onAddFriend(e: React.FormEvent) {
        this.setState({addFriendError: ""});
        this.acceptFriend(this.state.addFriend, false);
        this.setState({
            addFriend: "",
        });
        e.preventDefault();
    }

    onSaveName = (e: React.FormEvent) => {
        const name = this.state.name;
        util.apiFetch({
            api: Name,
            body: {name},
        }).then(() => {
            this.setState({
                me: {...this.state.me, name},
                name: name || this.state.me.email,
            });
        });
        e.preventDefault();
    }

    isInitialized(state: State): state is (InitializedState & NonInitializedState) {
        return state.initialized;
    }

    acceptFriend(email: string, wasInvited: boolean) {
        util.apiFetch({
            api: AcceptFriend,
            body: {email},
        }).then((friend) => {
            if (wasInvited) {
                // Invite -> Friend
                this.setState({
                    friends: [...this.state.friends, friend],
                    invites: this.state.invites.filter(e => e.email != email),
                });
            } else {
                // {} -> Pending
                this.setState({
                    pendingFriends: [...this.state.pendingFriends, friend],
                });
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
        util.apiFetch({
            api: RejectFriend,
            body: {email},
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
        util.apiFetch({
            api: DeleteFriend,
            body: {email},
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
        const friends = this.state.friends.map(friend => <li key={friend.uid}>{friend.email}{" "}
            <span className="button inline secondary" onClick={() => this.deleteFriend(friend.email)}>Remove</span></li>);

        friends.push(...this.state.pendingFriends.map(friend => <li key={friend.uid}>{friend.email}{" "}
                <span className="pending">(Pending)</span>{" "}
                <span className="button inline secondary" onClick={() => this.rejectFriend(friend.email)}>Remove</span></li>));

        let errorMessage;
        if (this.state.addFriendError) {
            errorMessage = <p className="errorMessage">{this.state.addFriendError}</p>;
        }
        let invites;
        if (this.state.invites.length > 0) {
            const invitesLis = this.state.invites.map(i =>
                <li key={i.uid}>{i.email} {" "}
                    <span className="clickable" onClick={() => this.acceptFriend(i.email, true)}>Accept</span> {" "}
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
        const defaultName = this.state.me ? this.state.me.name || this.state.me.email : '';
        const nameCls = this.state.name === defaultName ? "button secondary inline" : "button inline"
        return <div>
            <header><div className="inner">
                <h1>Account Settings</h1>
            </div></header>
            <main className="account">
            <p>{this.state.me.email}</p>
            <form onSubmit={this.onSaveName}>
            <label>Name (shown to friends): <input type="text" value={this.state.name} onChange={util.cc(this, "name")} /></label>{' '}
            <input type="submit" value="Save" className={nameCls} />
            </form>
            {invites}
            <h2>Friends</h2>
            <ul>
                {friends}
            </ul>
            <p>Add a friend by email. Once they confirm, you'll be able to split transactions with them.</p>
            {errorMessage}
            <form className="oneline" onSubmit={this.onAddFriend.bind(this)}>
                <label>Email: <input type="email" value={this.state.addFriend} onChange={util.cc(this, "addFriend")} /></label>
                <input type="submit" value="Request" className="button secondary" />
            </form>
            </main>
        </div>;
    }
}
