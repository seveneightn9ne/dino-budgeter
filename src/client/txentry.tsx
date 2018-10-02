import * as React from 'react';
import {Category, Transaction, GroupId, Friend, Share} from '../shared/types';
import Money from '../shared/Money';
import * as util from './util';
import { index } from '../shared/frames';
import { withRouter, RouteComponentProps } from 'react-router';
import { fromSerialized, distributeTotal } from '../shared/transactions';


interface TxEntryProps {
    onAddTransaction: (transaction: Transaction) => void;
    categories: Category[];
    friends: Friend[];
    defaultDate: Date;
    gid?: GroupId;
}

interface TxEntryState {
    amount: string;
    description: string;
    category: string;
    error: boolean;
    date: string;
    splitting: boolean;
    splitWith: string;
    yourShare: string;
    theirShare: string;
    youPaid: boolean;
}

class TxEntry extends React.Component<TxEntryProps & RouteComponentProps<TxEntryProps>, TxEntryState> {

    constructor(props: TxEntryProps & RouteComponentProps<TxEntryProps>) {
        super(props);
        this.state = {
            amount: '',
            description: '',
            category: '',
            error: false,
            date: util.yyyymmdd(props.defaultDate),
            splitting: false,
            splitWith: this.defaultSplitWith(),
            yourShare: '1',
            theirShare: '1',
            youPaid: true,
        };
    }

    defaultSplitWith() {
        return this.props.friends.length > 0 ? this.props.friends[0].uid : ''
    }

    handleSubmit(event: React.FormEvent): void {
        let amount = new Money(this.state.amount);
        if (!amount.isValid(false /** allowNegative **/)) {
            this.setState({error: true});
            event.preventDefault();
            return;
        }
        const category = this.state.category;
        const date = util.fromYyyymmdd(this.state.date);
        const frame = index(date.getMonth(), date.getFullYear());
        let split = undefined;
        if (this.state.splitting) {
            const myShare = new Share(this.state.yourShare);
            const theirShare = new Share(this.state.theirShare);
            if (!myShare.isValid(false) || !theirShare.isValid(false)) {
                this.setState({error: true});
                event.preventDefault();
                return;
            }
            let otherAmount;
            [amount, otherAmount] = distributeTotal(amount, myShare, theirShare);
            split = {
                with: this.state.splitWith,
                myShare, theirShare, otherAmount,
                iPaid: this.state.youPaid,
            };
        }
        util.apiPost({
            path: '/api/transaction',
            body: {
                frame: frame,
                amount: amount,
                description: this.state.description,
                date: date,
                category: category,
                split: split,
            },
            location: this.props.location,
            history: this.props.history,
        }).then((response) => {
            const transaction = fromSerialized(response.transaction);
            // Not clearing date & category
            this.setState({amount: '', description: '', splitting: false, splitWith: this.defaultSplitWith(),
                yourShare: '1', theirShare: '1', youPaid: true});
            this.props.onAddTransaction(transaction);
        });
        event.preventDefault();
    }

    render(): JSX.Element {
        console.log('newer code');
        const options = this.props.categories.map(c => {
            return <option key={c.id} value={c.id}>{c.name}</option>;
        });
        const className = this.state.error ? "error" : "";
        const splitting = this.props.friends.length > 0 ? (this.state.splitting ? 
            <div><label>Split with: <select onChange={util.cc(this, 'splitWith')} value={this.state.splitWith}>
                    {this.props.friends.map(f => <option key={f.uid}>{f.email}</option>)}
                </select></label>
                <label className="first half">
                    Your share: <input type="number" value={this.state.yourShare} onChange={util.cc(this, 'yourShare')} /> 
                </label><label className="half">
                    Their share: <input type="number" value={this.state.theirShare} onChange={util.cc(this, 'theirShare')} /></label>
                <div className="section" style={{clear: 'both'}}>
                    <label className="nostyle"><input type="radio" name="payer" value="0" checked={this.state.youPaid}
                        onChange={(e) => this.setState({youPaid: e.target.checked})} /> You paid</label>
                    <label className="nostyle"><input type="radio" name="payer" value="1" checked={!this.state.youPaid} 
                        onChange={(e) => this.setState({youPaid: !e.target.checked})} /> They paid</label>
                </div>
            </div>
            : <span className="section clickable" onClick={() => this.setState({splitting: true})}>Split transaction...</span>)
            : null;
        return <div className="txentry">
            <form onSubmit={this.handleSubmit.bind(this)}>
                <label>Amount:
                <input autoFocus className={className} value={this.state.amount} onChange={util.cc(this, 'amount')} size={4} /></label>
                <label>Description:
                <input value={this.state.description} onChange={util.cc(this, 'description')} /></label>
                <label><input type="date" value={this.state.date} onChange={util.cc(this, 'date')} /></label>
                <label><select onChange={util.cc(this, 'category')} value={this.state.category}>
                    <option value="">Uncategorized</option>
                    {options}
                </select></label>
                {splitting}
                <input className="button" type="submit" value="Save" />
            </form>
        </div>;
    }
}

export default withRouter(TxEntry);
