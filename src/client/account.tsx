import * as React from "react";
import { Link } from "react-router-dom";
import {
  AcceptFriend,
  DeleteFriend,
  Name,
  RejectFriend,
  UpdateSettings,
} from "../shared/api";
import { Friend, UserSettings } from "../shared/types";
import { FadeCheck } from "./components/fadecheck";
import * as util from "./util";

interface Props {}

interface InitializedState {
  me: Friend;
  friends: Friend[];
  pendingFriends: Friend[];
  invites: Friend[];
  settings: UserSettings;
}

interface NonInitializedState {
  initialized: boolean;
  addFriend: string;
  addFriendError?: string;
  name: string;
  lastSave: number;
  timers: number[];
  rollover: boolean;
  lastSaveRollover: number;
}

interface State extends Partial<InitializedState>, NonInitializedState {}

export default class Account extends React.Component<Props, State> {
  public state: State = {
    initialized: false,
    addFriend: "",
    name: "",
    lastSave: 0,
    timers: [],
    rollover: false,
    lastSaveRollover: 0,
  };

  public componentDidMount() {
    util
      .initializeState(
        this,
        0,
        "friends",
        "pendingFriends",
        "me",
        "invites",
        "settings",
      )
      .then(() => {
        console.log("init with rollover " + this.state.settings.rollover);
        console.log(
          "making state to " + !(this.state.settings.rollover === false),
        );
        this.setState(({ me, settings }) => ({
          name: me.name || me.email,
          rollover: !(settings.rollover === false), // defaults to true
        }));
      });
  }

  public onAddFriend(e: React.FormEvent) {
    this.setState({ addFriendError: "" });
    this.acceptFriend(this.state.addFriend, false);
    this.setState({
      addFriend: "",
    });
    e.preventDefault();
  }

  public onSaveName = (e: React.FormEvent) => {
    const name = this.state.name;
    util
      .apiFetch({
        api: Name,
        body: { name },
      })
      .then(() => {
        this.setState(({ me }) => ({
          me: { ...me, name },
          name: name || me.email,
          lastSave: Date.now(),
        }));
      });
    e.preventDefault();
  }

  private onSaveRollover = (rollover: boolean) => {
    this.setState({ rollover });
    util
      .apiFetch({
        api: UpdateSettings,
        body: { rollover },
      })
      .then(() => {
        this.setState(({ settings }) => ({
          settings: { ...settings, rollover },
          lastSaveRollover: Date.now(),
        }));
      });
  }

  public isInitialized(state: State): state is InitializedState & NonInitializedState {
    return state.initialized;
  }

  public acceptFriend(email: string, wasInvited: boolean) {
    util
      .apiFetch({
        api: AcceptFriend,
        body: { email },
      })
      .then((friend) => {
        if (wasInvited) {
          // Invite -> Friend
          this.setState({
            friends: [...this.state.friends, friend],
            invites: this.state.invites.filter((e) => e.email != email),
          });
        } else {
          // {} -> Pending
          this.setState({
            pendingFriends: [...this.state.pendingFriends, friend],
          });
        }
      })
      .catch((e) => {
        if (e.status && e.status == 404) {
          this.setState({ addFriendError: "That user does not exist." });
        } else {
          throw e;
        }
      });
  }

  // TODO: could/should reject by uid
  public rejectFriend(email: string) {
    util
      .apiFetch({
        api: RejectFriend,
        body: { email },
      })
      .then(() => {
        const newInvites = this.state.invites.filter((i) => i.email != email);
        const newFriends = this.state.friends.filter((f) => f.email != email);
        const newPending = this.state.pendingFriends.filter(
          (p) => p.email != email,
        );
        this.setState({
          friends: newFriends,
          invites: newInvites,
          pendingFriends: newPending,
        });
      });
  }

  public deleteFriend(email: string) {
    util
      .apiFetch({
        api: DeleteFriend,
        body: { email },
      })
      .then(() => {
        const newInvites = this.state.invites.filter((i) => i.email != email);
        const newFriends = this.state.friends.filter((f) => f.email != email);
        const newPending = this.state.pendingFriends.filter(
          (p) => p.email != email,
        );
        this.setState({
          friends: newFriends,
          invites: newInvites,
          pendingFriends: newPending,
        });
      });
  }

  private onChangeRollover = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.onSaveRollover(e.target.checked);
  }

  private onChangeNoRollover = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.onSaveRollover(!e.target.checked);
  }

  private renderSettings(): JSX.Element {
    const defaultName = this.state.me
      ? this.state.me.name || this.state.me.email
      : "";
    const nameCls =
      this.state.name === defaultName
        ? "button secondary inline"
        : "button inline";
    return (
      <div>
        <h2>Settings</h2>
        <form onSubmit={this.onSaveName}>
          <label>
            <b>Name</b> (shown to friends):{" "}
            <input
              type="text"
              value={this.state.name}
              onChange={util.cc(this, "name")}
            />
          </label>{" "}
          <input type="submit" value="Save" className={nameCls} />
          <FadeCheck save={this.state.lastSave} />
        </form>
        <p>
          <b>Rollover:</b> when there's money left over at the end of the month,{" "}
          <FadeCheck save={this.state.lastSaveRollover} />
        </p>
        <form>
          <label>
            <input
              type="radio"
              name="rollover"
              value="1"
              checked={this.state.rollover}
              onChange={this.onChangeRollover}
            />{" "}
            Roll over to the next month
          </label>
          <br />
          <label>
            <input
              type="radio"
              name="rollover"
              value="0"
              checked={!this.state.rollover}
              onChange={this.onChangeNoRollover}
            />{" "}
            Ignore leftover money
          </label>
        </form>
      </div>
    );
  }

  public render(): JSX.Element {
    if (!this.state.initialized) {
      return null;
    }
    const friends = this.state.friends.map((friend) => (
      <li key={friend.uid}>
        {friend.email}{" "}
        <span
          className="button inline secondary"
          onClick={() => this.deleteFriend(friend.email)}
        >
          Remove
        </span>
      </li>
    ));

    friends.push(
      ...this.state.pendingFriends.map((friend) => (
        <li key={friend.uid}>
          <span className="highlighted">{friend.email}</span>{" "}
          <span className="pending">(Pending)</span>{" "}
          <span
            className="button inline secondary"
            onClick={() => this.rejectFriend(friend.email)}
          >
            Remove
          </span>
        </li>
      )),
    );

    let errorMessage;
    if (this.state.addFriendError) {
      errorMessage = (
        <p className="errorMessage">{this.state.addFriendError}</p>
      );
    }
    let invites;
    if (this.state.invites.length > 0) {
      const invitesLis = this.state.invites.map((i) => (
        <li key={i.uid}>
          {i.email}{" "}
          <span
            className="clickable"
            onClick={() => this.acceptFriend(i.email, true)}
          >
            Accept
          </span>{" "}
          <span
            className="clickable"
            onClick={() => this.rejectFriend(i.email)}
          >
            Reject
          </span>
        </li>
      ));
      invites = (
        <div>
          <h2>Friend Requests</h2>
          <ul>{invitesLis}</ul>
        </div>
      );
    }
    return (
      <div>
        <header>
          <div className="inner">
            <h1>
              <Link
                to={`/app`}
                className="fa-chevron-left fas framenav left-edge"
              />
              Account Settings
            </h1>
          </div>
        </header>
        <main className="account">
          <p>{this.state.me.email}</p>
          {invites}
          {this.renderSettings()}
          <h2>Friends</h2>
          <ul>{friends}</ul>
          <p>
            Add a friend by email. Once they confirm, you'll be able to split
            transactions with them.
          </p>
          {errorMessage}
          <form className="oneline" onSubmit={this.onAddFriend.bind(this)}>
            <label>
              Email:{" "}
              <input
                type="email"
                value={this.state.addFriend}
                onChange={util.cc(this, "addFriend")}
              />
            </label>
            <input type="submit" value="Request" className="button secondary" />
          </form>
          <p>
            <a href="/logout" className="button">
              Log Out
            </a>
          </p>
        </main>
      </div>
    );
  }
}
