import * as React from 'react';
import {ClickToEditDate, ClickToEditMoney, ClickToEditText, ClickToEditDropdown} from './components/clicktoedit';
import { Frame, Transaction, TransactionId, Category, GroupId, CategoryId, Friend, Share } from '../shared/types';
import TxEntry from './txentry';
import * as util from './util';
import { getTransactionAIs, DebtAI } from '../shared/ai';
import AIComponent from './ai';
import { Location, History } from 'history';
import { MobileQuery, DesktopOnly } from './components/media';
import SplitPoplet from './splitpoplet';
import Poplet from './components/poplet';
import * as _ from 'lodash';
import Money from '../shared/Money';

interface Props {
    friends: Friend[];
    pendingFriends: Friend[];
    invites: Friend[];
    debts: {[email: string]: Money};
    location: Location;
    history: History;
    onSettle: (email: string) => void;
}

type State = {};

export default class Friends extends React.Component<Props, State> {
    settle(email: string): Promise<void> {
        return util.apiPost({
            path: '/api/friend/settle',
            body: {
                amount: this.props.debts[email],
                email,
            },
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            this.props.onSettle(email);
        });
    }

    render() {
        const allFriends: {[email: string]: {
            debt?: Money,
            pending?: true,
            invite?: true,
        }} = _.mapValues(this.props.debts, (amount, email) => ({
            debt: amount,
        }));
        this.props.friends.forEach(f => {
            if (allFriends[f.email] == undefined) {
                allFriends[f.email] = {};
            }
        });
        this.props.pendingFriends.forEach(f => {
            if (allFriends[f.email] == undefined) {
                allFriends[f.email] = {pending: true};
            }
        });
        this.props.invites.forEach(f => {
            if (allFriends[f.email] == undefined) {
                allFriends[f.email] = {invite: true};
            }
        });
        const rows = _.map(allFriends, (val, email) => <tr>
            <td>{val.pending ? <span className="bean">Pending</span> : val.invite ? <span className="bean">Invite</span> : null}</td>
            <td>{email}</td>
            <td>{val.debt && val.debt.cmp(Money.Zero) > 0 ? val.debt.formatted() : null}</td>
            <td>{val.debt && val.debt.cmp(Money.Zero) < 0 ? val.debt.negate().formatted() : null}</td>
            <td>{val.debt && val.debt.cmp(Money.Zero) != 0 ? <Poplet text="Settle Debt">
                <h2>Settle debts with {email}</h2>
                <p>{val.debt.cmp(Money.Zero) > 0 ? `Do this after you've paid ${email} ${val.debt.formatted()}.` :
                    `Do this after ${email} has paid you ${val.debt.negate().formatted()}.`}</p>
                <button className="button" onClick={() => this.settle(email)}>Settle Debt</button>
            </Poplet> : null}</td>
            <td><span className="clickable">{val.invite ? "Accept Friend" : "Remove Friend"}</span></td>
        </tr>);
        return <div className="friends">
            <table>
                <tbody>
                    <tr><th></th><th>Friend</th><th>You owe</th><th>They Owe</th><th></th><th></th></tr>
                    {rows}
                </tbody>
            </table>
            
        </div>;
    }
}
