import * as React from 'react';
import {ClickToEditDate, ClickToEditMoney, ClickToEditText} from './components/clicktoedit';
import { Frame, Transaction } from '../shared/types';
import { fromSerialized } from '../shared/transactions';

interface Props {
    month: number;
    year: number;
    frame: Frame;
}

type State = {
    kind: "loading"
} | {
    kind: "error"
    message: string
} | {
    kind: "loaded"
    transactions: Transaction[]
};

export default class Transactions extends React.Component<Props, State> {
    state: State = {
        kind: "loading",
    }

    setStateStrict(state: Readonly<State>): void {
        this.setState((prevState, props) => {
            return state
        })
    }

    componentDidMount() {
        this.init().catch(err => {
            console.error("initializing transactions", err);
            this.setStateStrict({
                kind: "error",
                message: err.toString(),
            })
        })
    }

    async init() {
        const res = await fetch("/api/transactions?frame=" + this.props.frame.index);
        if (res.status != 200) {
            throw new Error(`status ${res.status}`)
        }
        const payload = await res.json();
        const txns = payload.transactions.map(fromSerialized);
        this.setStateStrict({
            kind: "loaded",
            transactions: txns,
        });
    }

    updateTransactionState(txid: string, transform: (txn: Transaction) => Transaction) {
        if (this.state.kind != "loaded") throw new Error("impossible.");
        const transactions = this.state.transactions.map(tx => {
            if (tx.id == txid) {
                return transform(tx);
            }
            return tx;
        });
        this.setState({kind: 'loaded', transactions});
    }
    
    render() {
        switch (this.state.kind) {
        case "loading":
            return <div>Loading...</div>
        case "error":
            return <div>Failed: {this.state.message}</div>
        case "loaded":
            return this.renderTransactions(this.state.transactions);
        default:
            return <div>Invalid case {(this.state as any).kind}</div>
        }
    }

    onAddTransaction(t: Transaction) {
        if (this.state.kind != "loaded") throw new Error("impossible.");
        const transactions = [...this.state.transactions, t];
        this.setState({kind: 'loaded', transactions});
    }

    renderTransactions(transactions: Transaction[]) {
        const rows = transactions.map((tx) => {
            console.log(tx);
            return <tr key={tx.id}>
                <td><ClickToEditDate value={tx.date}
                    onChange={date => 
                        this.updateTransactionState(tx.id, tx => ({...tx, date}))}
                    postTo="/api/transaction/date"
                    postKey="date"
                    postData={{id: tx.id}}
                /></td>
                <td><ClickToEditText value={tx.description} size={20}
                    onChange={description => 
                        this.updateTransactionState(tx.id, tx => ({...tx, description}))}
                    postTo="/api/transaction/description"
                    postKey="description"
                    postData={{id: tx.id}}
                /></td>
                <td><ClickToEditMoney value={tx.amount}
                    onChange={amount =>
                        this.updateTransactionState(tx.id, tx => ({...tx, amount}))}
                    postTo="/api/transaction/amount"
                    postKey="amount"
                    postData={{id: tx.id}}
                /></td></tr>;
        });
        return <div>
            <h2>Transactions</h2>
            <table><tbody>
            {rows}
            </tbody></table>
        </div>;
    }
}
