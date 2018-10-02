import * as React from 'react';
import {ClickToEditDate, ClickToEditMoney, ClickToEditText, ClickToEditDropdown} from './components/clicktoedit';
import { Frame, Transaction, TransactionId, Category, GroupId, CategoryId, Friend, Share } from '../shared/types';
import TxEntry from './txentry';
import * as util from './util';
import { getTransactionAIs } from '../shared/ai';
import AIComponent from './ai';
import { Location, History } from 'history';
import { MobileQuery, DesktopOnly } from './components/media';
import SplitPoplet from './splitpoplet';
import Poplet from './components/poplet';
import * as _ from 'lodash';
import Money from '../shared/Money';

interface Props {
    transactions: Transaction[];
    location: Location;
    history: History;
}

type State = {};

export default class Debts extends React.Component<Props, State> {

    render() {
        const groups = _.map(_.groupBy(this.props.transactions, 'split.with.email'), (transactions: Transaction[], email: string) => {
            let totalYouOwe = Money.Zero;
            let totalTheyOwe = Money.Zero;
            return <section key={email}>
                <h2>{email}</h2>
                <table>
                    <tbody>
                        <tr><th className="date">Date</th>
                            <th className="description">Description</th>
                            <th className="amount">You Owe</th>
                            <th className="amount">They Owe</th></tr>
                        {_.orderBy(transactions, 'date').map(t => {
                            const youPaid = t.split.payer != t.split.with.uid;
                            const youAmount = t.amount;
                            const theyAmount = t.split.otherAmount;
                            const youOwe = youPaid ? '' : youAmount.formatted();
                            const theyOwe = youPaid ? theyAmount.formatted() : '';
                            totalYouOwe = youPaid ? totalYouOwe : totalYouOwe.plus(youAmount);
                            totalTheyOwe = youPaid ? totalTheyOwe.plus(theyAmount) : totalTheyOwe;
                            return <tr key={t.id}><td>{util.yyyymmdd(t.date)}</td><td>{t.description}</td><td>{youOwe}</td><td>{theyOwe}</td></tr>
                        })}
                    </tbody>
                </table>
                {totalYouOwe.cmp(totalTheyOwe) > 0 ? 
                   <p>You owe {totalYouOwe.minus(totalTheyOwe).formatted()}</p> :
                   <p>{email} owes you {totalTheyOwe.minus(totalYouOwe).formatted()}</p>
                }
            </section>
        });
        console.log(groups);
        return <div className="debts">
            {groups}
        </div>;
    }
}
