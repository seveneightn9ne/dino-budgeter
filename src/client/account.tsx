import _ from "lodash";
import * as React from "react";
import { Link } from "react-router-dom";
import {
  AcceptFriend,
  DeleteFriend,
  Name,
  RejectFriend,
  UpdateSettings,
} from "../shared/api";
import * as settings from "../shared/settings";
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

  displaySettings: Required<UserSettings>;
  lastSaveSettings: { [k in keyof Required<UserSettings>]: number };

  addFriend: string;
  addFriendError?: string;

  name: string;
  lastSave: number;
}

interface State extends Partial<InitializedState>, NonInitializedState {}

export default class Account extends React.Component<Props, State> {
  public state: State = {
    initialized: false,
    addFriend: "",
    name: "",
    lastSave: 0,
    displaySettings: settings.getDefaultSettings(),
    lastSaveSettings: _.mapValues(settings.getDefaultSettings(), () => 0) as {
      [k in keyof Required<UserSettings>]: number;
    },
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
        this.setState(({ me, displaySettings, settings }) => {
          const newDisplaySettings = { ...displaySettings };
          _.forEach(settings, (setting, key: keyof UserSettings) => {
            if (setting !== undefined) {
              newDisplaySettings[key] = setting;
            }
          });
          return {
            name: me.name || me.email,
            displaySettings: newDisplaySettings,
          };
        });
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

  private onUpdateSetting = (setting: keyof UserSettings, value: boolean) => {
    this.setState(({ displaySettings }) => ({
      displaySettings: { ...displaySettings, [setting]: value },
    }));
    util
      .apiFetch({
        api: UpdateSettings,
        body: { [setting]: value },
      })
      .then(() => {
        this.setState(({ displaySettings, lastSaveSettings }) => ({
          displaySettings: { ...displaySettings, [setting]: value },
          lastSaveSettings: { ...lastSaveSettings, [setting]: Date.now() },
        }));
      });
  }

  public isInitialized(
    state: State,
  ): state is InitializedState & NonInitializedState {
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

  private onChangeSettingField = (field: keyof UserSettings) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    this.onUpdateSetting(field, e.target.checked);
  }

  private renderSettingsCheckbox(
    field: keyof UserSettings,
    description: string,
  ): JSX.Element {
    return (
      <label>
        <input
          type="checkbox"
          name={field}
          onChange={this.onChangeSettingField(field)}
          checked={this.state.displaySettings[field]}
        />
        {" " + description + " "}
        <FadeCheck save={this.state.lastSaveSettings[field]} />
      </label>
    );
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

        <form>
          <p>
            <b>Email:</b> send me an email when...
            <br />
            {this.renderSettingsCheckbox(
              "emailNewTransaction",
              "A friend adds a new transaction split with me",
            )}
            <br />
            {this.renderSettingsCheckbox(
              "emailNewPayment",
              "A friend adds a payment or charge with me",
            )}
          </p>
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
