import * as React from 'react';
import {ClickToEditDate, ClickToEditMoney, ClickToEditText, ClickToEditDropdown} from './components/clicktoedit';
import { Frame, Transaction, TransactionId, Category, GroupId, CategoryId, Friend, Share } from '../shared/types';
import TxEntry from './txentry';
import * as util from './util';
import { getTransactionAIs } from '../shared/ai';
import AIComponent from './ai';
import { Location, History } from 'history';
import { MobileQuery, DesktopOnly } from './components/media';
import Poplet from './components/poplet';
import {distributeTotal, shareFromAmounts} from '../shared/transactions';

interface Props {
    month: number;
    year: number;
    frame: Frame;
    transactions: Transaction[];
    categories: Category[];
    friends: Friend[];
    newTxDate: Date;
    gid: GroupId;
    onUpdateTransaction: (txn: Transaction) => void;
    onDeleteTransaction: (id: TransactionId) => void;
    onAddTransaction: (txn: Transaction) => void;
    location: Location;
    history: History;
}

type State = {};

export default class Transactions extends React.Component<Props, State> {
    delete(id: TransactionId): boolean {
        util.apiPost({
            path: '/api/transaction',
            body: {id},
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            this.props.onDeleteTransaction(id);
        });
        return true;
    }

    categoryName(cid: CategoryId): string {
        return this.categoryMap().get(cid);
    }

    categoryMap(): Map<string, string> {
        const map = new Map();
        map.set("", "Uncategorized");
        this.props.categories.forEach(c => {
            map.set(c.id, c.name);
        });
        return map;
    }

    render() {
        const ais = getTransactionAIs(
            this.props.frame, this.props.transactions).map(ai =>
            <AIComponent ai={ai} key={ai.message()} />);
        const rowsList = this.props.transactions.map((tx) => <tr key={tx.id}>
            <td className="del">
                <DesktopOnly>
                    <span className="deleteCr clickable fa-times fas" onClick={() => this.delete(tx.id)}></span>
                </DesktopOnly>
            </td>
            <td className="date"><MobileQuery
                mobile={util.yyyymmdd(tx.date)}
                desktop={<ClickToEditDate value={tx.date}
                    onChange={date =>
                        this.props.onUpdateTransaction({...tx, date})}
                    postTo="/api/transaction/date"
                    postKey="date"
                    postData={{id: tx.id}}
            />} /></td>
            <td className="stretch"><MobileQuery
                mobile={tx.description}
                desktop={<ClickToEditText value={tx.description} size={20}
                    onChange={description =>
                        this.props.onUpdateTransaction({...tx, description})}
                    postTo="/api/transaction/description"
                    postKey="description"
                    postData={{id: tx.id}}
            />} /></td>
            <td className={tx.category ? "category" : "category highlighted"}>
            <ClickToEditDropdown value={tx.category || ""}
                values={this.categoryMap()}
                onChange={cid => this.props.onUpdateTransaction({...tx, category: cid})}
                postTo="/api/transaction/category"
                postKey="category"
                postData={{id: tx.id}}
            /></td>
            <td className="amount"><MobileQuery
                mobile={tx.amount.formatted()}
                desktop={<ClickToEditMoney value={tx.amount}
                    onChange={amount =>
                        this.props.onUpdateTransaction({...tx, amount})}
                    postTo="/api/transaction/amount"
                    postKey="amount"
                    postData={{id: tx.id}}
            />} /></td>
            <td className="split">
                {tx.split ? <Poplet text="shared">
                    <p>Split with {tx.split.with.email}</p>
                    <form onSubmit={() => {}}>
                    <p>Total <input /></p>
                    <p>Your share: <input /></p>
                    <p>Their share: <input /></p>
                    <p>You owe {"$10.00"}</p>
                    <input type="submit" value="Save" />
                    </form>
                </Poplet> : null}
            </td></tr>);
        const rows = <MobileQuery mobile={rowsList.reverse()} desktop={rowsList} />;
        return <div className="transactions">
            <DesktopOnly>
                <TxEntry onAddTransaction={this.props.onAddTransaction}
                    defaultDate={this.props.newTxDate} gid={this.props.gid}
                    categories={this.props.categories} friends={this.props.friends} />
            </DesktopOnly>
            {ais}
            {this.props.transactions.length > 0 ?
                <table><tbody>
                    <tr><th></th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr>
                    {rows}
                </tbody></table> : null}
        </div>;
    }
}
