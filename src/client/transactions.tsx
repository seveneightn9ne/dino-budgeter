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
    onEditTransaction: (txn: Transaction) => void;
    location: Location;
    history: History;
}

type State = {};

export default class Transactions extends React.Component<Props, State> {

    private poplet: React.RefObject<Poplet>;
    constructor(props: Props) {
        super(props);
        this.poplet = React.createRef();
    }

    delete(id: TransactionId): boolean {
        util.apiPost({
            method: 'DELETE',
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

    onAddTransaction(t: Transaction) {
        this.props.onAddTransaction(t);
        if (this.poplet.current) this.poplet.current.close();
    }

    render() {
        const ais = getTransactionAIs(
            this.props.frame, this.props.transactions).map(ai =>
            <AIComponent ai={ai} key={ai.message()} />);

        const rowsDesktop = _.sortBy(this.props.transactions, ['date']).map((tx) => <tr key={tx.id}>
            <td className="del">
                <span className="deleteCr clickable fa-times fas" onClick={() => this.delete(tx.id)}></span>
            </td>
            <td className="date"><ClickToEditDate value={tx.date}
                onChange={date =>
                    this.props.onUpdateTransaction({...tx, date})}
                postTo="/api/transaction/date"
                postKey="date"
                postData={{id: tx.id}}
            /></td>
            <td className="stretch"><ClickToEditText value={tx.description} size={20}
                onChange={description =>
                    this.props.onUpdateTransaction({...tx, description})}
                postTo="/api/transaction/description"
                postKey="description"
                postData={{id: tx.id}}
            /></td>
            <td className={tx.category ? "category" : "category highlighted"}>
            <ClickToEditDropdown value={tx.category || ""}
                values={this.categoryMap()}
                onChange={cid => this.props.onUpdateTransaction({...tx, category: cid})}
                postTo="/api/transaction/category"
                postKey="category"
                postData={{id: tx.id}}
            /></td>
            <td className="amount">{tx.split ? tx.amount.formatted() :
                <ClickToEditMoney value={tx.amount}
                    onChange={amount =>
                        this.props.onUpdateTransaction({...tx, amount})}
                    postTo="/api/transaction/amount"
                    postKey="amount"
                    postData={{id: tx.id}}
            />}</td>
            <td className="split">
                {tx.split ? <SplitPoplet transaction={tx} onUpdateTransaction={this.props.onUpdateTransaction} /> : null}
            </td></tr>);

        const rowsMobile = _.sortBy(this.props.transactions, ['date']).reverse().map((tx) => <tr key={tx.id}
            onClick={() => this.props.onEditTransaction(tx)}>
            <td className="del"></td>
            <td className="date">{`${tx.date.getMonth()+1}/${tx.date.getDate()}`}</td>
            <td className="stretch">{tx.description}</td>
            <td className={tx.category ? "category" : "category highlighted"}>
                <span className="formatted">{this.categoryName(tx.category) || "Uncategorized"}</span></td>
            <td className="amount">{tx.amount.formatted()}</td>
            <td className="split">{tx.split ? "shared" : null}</td></tr>);
        const rows = <MobileQuery mobile={rowsMobile} desktop={rowsDesktop} />;
        return <div className="transactions">
            {ais}
            <table><tbody>
                <tr><th></th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr>
                <DesktopOnly>
                    <tr><td></td><td colSpan={5}>
                    <Poplet ref={this.poplet} text={<span><span className="fa-plus-circle fas"></span> Transaction</span>}>
                        <TxEntry onAddTransaction={this.onAddTransaction.bind(this)} defaultDate={this.props.newTxDate}
                            categories={this.props.categories} friends={this.props.friends}
                            location={this.props.location} history={this.props.history} />
                    </Poplet></td></tr>
                </DesktopOnly>
                {rows}
            </tbody></table>
        </div>;
    }
}
