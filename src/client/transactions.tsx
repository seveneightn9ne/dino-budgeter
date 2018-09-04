import * as React from 'react';
import {ClickToEditDate, ClickToEditMoney, ClickToEditText} from './components/clicktoedit';
import { Frame, Transaction, TransactionId } from '../shared/types';

interface Props {
    month: number;
    year: number;
    frame: Frame;
    transactions: Transaction[];
    onUpdateTransaction: (txn: Transaction) => void;
    onDeleteTransaction: (id: TransactionId) => void;
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

    render() {
        const rows = this.props.transactions.map((tx) => {
            console.log(tx);
            return <tr key={tx.id}>
                <td><span className="deleteCr clickable" onClick={() => this.delete(tx.id)}>X</span></td>
                <td><ClickToEditDate value={tx.date}
                    onChange={date => 
                        this.props.onUpdateTransaction({...tx, date})}
                    postTo="/api/transaction/date"
                    postKey="date"
                    postData={{id: tx.id}}
                /></td>
                <td><ClickToEditText value={tx.description} size={20}
                    onChange={description => 
                        this.props.onUpdateTransaction({...tx, description})}
                    postTo="/api/transaction/description"
                    postKey="description"
                    postData={{id: tx.id}}
                /></td>
                <td><ClickToEditMoney value={tx.amount}
                    onChange={amount =>
                        this.props.onUpdateTransaction({...tx, amount})}
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
