import * as React from 'react';
import {ClickToEditDate, ClickToEditMoney, ClickToEditText, ClickToEditDropdown} from './components/clicktoedit';
import { Frame, Transaction, TransactionId, Category, GroupId, CategoryId } from '../shared/types';
import TxEntry from './txentry';
import Media from 'react-media';
import * as util from './util';
import { getTransactionAIs } from '../shared/ai';
import AIComponent from './ai';

interface Props {
    month: number;
    year: number;
    frame: Frame;
    transactions: Transaction[];
    categories: Category[];
    newTxDate: Date;
    gid: GroupId;
    onUpdateTransaction: (txn: Transaction) => void;
    onDeleteTransaction: (id: TransactionId) => void;
    onAddTransaction: (txn: Transaction) => void;
}

type State = {};

export default class Transactions extends React.Component<Props, State> {
    delete(id: TransactionId): boolean {
        fetch('/api/transaction', {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({id}),
        }).then(response => {
            if (response.status == 200) {
                this.props.onDeleteTransaction(id);
            }
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
        const rows = (isMobile: boolean) => {
            const rows = this.props.transactions.map((tx) => <tr key={tx.id}>
                <td className="del">{isMobile ? null :
                    <span className="deleteCr clickable fa-times fas" onClick={() => this.delete(tx.id)}></span>}
                </td>
                <td className="date">{isMobile ? util.yyyymmdd(tx.date) : <ClickToEditDate value={tx.date}
                    onChange={date =>
                        this.props.onUpdateTransaction({...tx, date})}
                    postTo="/api/transaction/date"
                    postKey="date"
                    postData={{id: tx.id}}
                />}</td>
                <td className="stretch">{isMobile ? tx.description :
                <ClickToEditText value={tx.description} size={20}
                    onChange={description =>
                        this.props.onUpdateTransaction({...tx, description})}
                    postTo="/api/transaction/description"
                    postKey="description"
                    postData={{id: tx.id}}
                />}</td>
                <td className={tx.category ? "category" : "category highlighted"}>
                <ClickToEditDropdown value={tx.category || ""}
                    values={this.categoryMap()}
                    onChange={cid => this.props.onUpdateTransaction({...tx, category: cid})}
                    postTo="/api/transaction/category"
                    postKey="category"
                    postData={{id: tx.id}}
                /></td>
                <td className="amount">{isMobile ? tx.amount.formatted() :
                <ClickToEditMoney value={tx.amount}
                    onChange={amount =>
                        this.props.onUpdateTransaction({...tx, amount})}
                    postTo="/api/transaction/amount"
                    postKey="amount"
                    postData={{id: tx.id}}
                />}</td></tr>);
            return isMobile ? rows.reverse() : rows;
        };
        return <Media query="(max-width: 599px)">{(isMobile: boolean) =>
            <div className="transactions">
                {isMobile ?
                <span className="button">Add Transaction</span> :
                <TxEntry onAddTransaction={this.props.onAddTransaction}
                    defaultDate={this.props.newTxDate} gid={this.props.gid}
                    categories={this.props.categories} />}
                {ais}
                {this.props.transactions.length > 0 ?
                    <table><tbody>
                        <tr><th></th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
                        {rows(isMobile)}
                    </tbody></table> : null}
            </div>}
        </Media>;
    }
}
