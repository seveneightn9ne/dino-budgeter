import * as React from 'react';
import {Money, Category, Transaction, GroupId, FrameIndex} from '../shared/types';
import * as util from './util';
import { index } from '../shared/frames';


interface TxEntryProps {
    onAddTransaction: (transaction: Transaction) => void;
    categories: Category[];
    defaultDate: Date;
    gid?: GroupId;
}

interface TxEntryState {
    amount: string;
    description: string;
    category: string;
    error: boolean;
    date: string;
}

export default class TxEntry extends React.Component<TxEntryProps, TxEntryState> {

    constructor(props: TxEntryProps) {
        super(props);
        this.state = {
            amount: '',
            description: '',
            category: '',
            error: false,
            date: util.yyyymmdd(props.defaultDate),
        };
    }

    handleSubmit(event: React.FormEvent): void {
        const amount = new Money(this.state.amount);
        if (!amount.isValid(false /** allowNegative **/)) {
            this.setState({error: true});
            event.preventDefault();
            return;
        }
        const category = this.state.category;
        const date = util.fromYyyymmdd(this.state.date);
        const frame = index(date.getMonth(), date.getFullYear());
        fetch('/api/transaction', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                frame: frame,
                amount: amount,
                description: this.state.description,
                date: date,
                category: category,
            }),
        }).then((response) => {
            response.json().then((response) => {
                const transaction: Transaction = {
                    id: response.tx_id,
                    gid: this.props.gid,
                    frame: frame,
                    category: category || null,
                    amount: amount,
                    description: this.state.description,
                    alive: true,
                    date: date,
                }
                this.props.onAddTransaction(transaction);
                // Not clearing date & category
                this.setState({amount: '', description: ''});
            });
        });
        event.preventDefault();
    }

    render(): JSX.Element {
        const options = this.props.categories.map(c => {
            return <option key={c.id} value={c.id}>{c.name}</option>;
        });
        const className = this.state.error ? "error" : "";
        return <div>
            <form onSubmit={this.handleSubmit.bind(this)}>
                <label>Amount:
                <input className={className} value={this.state.amount} onChange={util.cc(this, 'amount')} size={4} /></label>
                <label>Description:
                <input value={this.state.description} onChange={util.cc(this, 'description')} /></label>
                <input type="date" value={this.state.date} onChange={util.cc(this, 'date')} />
                <select onChange={util.cc(this, 'category')} value={this.state.category}>
                    <option value="">Uncategorized</option>
                    {options}
                </select>
                <input type="submit" value="Add" />
            </form>
        </div>;
    }
}
