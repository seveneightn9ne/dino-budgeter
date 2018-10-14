import * as React from 'react';
import {Category, Transaction, TransactionId, Friend, Share} from '../shared/types';
import Money from '../shared/Money';
import * as util from './util';
import { index } from '../shared/frames';
import { withRouter, RouteComponentProps } from 'react-router';
import { fromSerialized, distributeTotal, youPay } from '../shared/transactions';
import { Location, History } from 'history';

interface NewTxProps {
    onAddTransaction: (transaction: Transaction) => void;
    categories: Category[];
    friends: Friend[];
    defaultDate: Date;
    location: Location;
    history: History;
}

interface UpdateTxProps {
    categories: Category[];
    friends: Friend[];
    transaction: Transaction;
    onUpdateTransaction: (transaction: Transaction) => void;
    onDeleteTransaction: (transaction: Transaction) => void;
    location: Location;
    history: History;
}

type Props = (NewTxProps | UpdateTxProps);

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

function isUpdate(props: Props): props is UpdateTxProps {
    return 'transaction' in props;
}

export default class TxEntry extends React.Component<Props, TxEntryState> {

    constructor(props: Props) {
        super(props);
        this.state = this.initializeState(props);
    }

    initializeState(props: Props): TxEntryState {
        if (isUpdate(props)) {
            const amount = props.transaction.split ?
                props.transaction.amount.plus(props.transaction.split.otherAmount).string() :
                props.transaction.amount.string();
            return {
                amount: amount,
                description: props.transaction.description,
                category: props.transaction.category || '',
                error: false,
                date: util.yyyymmdd(props.transaction.date),
                splitting: !!props.transaction.split,
                splitWith: props.transaction.split ? props.transaction.split.with.uid : this.defaultSplitWith(),
                yourShare: props.transaction.split ? props.transaction.split.myShare.string() : '1',
                theirShare: props.transaction.split ? props.transaction.split.theirShare.string() : '1',
                youPaid: props.transaction.split ? props.transaction.split.payer != props.transaction.split.with.uid : true,
            };
        } else {
            return {
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
    }

    componentDidUpdate(prevProps: Props) {
        if (isUpdate(prevProps) && isUpdate(this.props) && prevProps.transaction != this.props.transaction) {
            // New transaction - recompute all state
            this.setState(this.initializeState(this.props));
        } else if (prevProps.friends != this.props.friends && this.state.splitWith == '') {
            // Friends have loaded - recompute default split now that we have friends
            this.setState({
                splitWith: this.defaultSplitWith(),
            });
        }
    }

    defaultSplitWith() {
        return this.props.friends.length > 0 ? this.props.friends[0].uid : ''
    }

    delete(t: Transaction): boolean {
        util.apiPost({
            method: 'DELETE',
            path: '/api/transaction',
            body: {id: t.id},
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            isUpdate(this.props) && this.props.onDeleteTransaction(t);
        });
        return true;
    }

    handleSubmit(event: React.FormEvent): void {
        event.preventDefault();
        let amount = new Money(this.state.amount);
        const total = new Money(this.state.amount);
        if (!amount.isValid(false /** allowNegative **/)) {
            this.setState({error: true});
            return;
        }
        const category = this.state.category;
        const date = util.fromYyyymmdd(this.state.date);
        const frame = index(date.getMonth(), date.getFullYear());
        let myShare: Share = undefined;
        let theirShare: Share = undefined;
        let otherAmount: Money = undefined;
        if (this.state.splitting) {
            myShare = new Share(this.state.yourShare);
            theirShare = new Share(this.state.theirShare);
            if (!myShare.isValid(false) || !theirShare.isValid(false)) {
                this.setState({error: true});
                return;
            }
            [amount, otherAmount] = distributeTotal(amount, myShare, theirShare);
        }
        if (isUpdate(this.props)) {
            const newTransaction = {...this.props.transaction};
            // Updating an existing transaction...
            const initialState = this.initializeState(this.props);
            const work = [];
            // 1. Update the split
            if (this.props.transaction.split && 
                (this.state.amount != initialState.amount
                || this.state.theirShare != initialState.theirShare
                || this.state.yourShare != initialState.yourShare
                || this.state.youPaid != initialState.youPaid)) {
                
                // Update newTransaction
                newTransaction.split = {...newTransaction.split,
                    myShare, theirShare, otherAmount,
                    // XXX: using "0" because I don't know my own uid.
                    payer: this.state.youPaid ? "0" : newTransaction.split.with.uid,
                };
                newTransaction.amount = amount;
                
                // Post the data
                work.push(util.apiPost({
                    path: '/api/transaction/split',
                    body: {
                        tid: this.props.transaction.id,
                        sid: this.props.transaction.split.id,
                        total, myShare, theirShare,
                        iPaid: this.state.youPaid,
                    },
                    location: this.props.location,
                    history: this.props.history,
                }));
            }

            // 2. Update the description
            if (this.state.description != initialState.description) {
                newTransaction.description = this.state.description;
                work.push(util.apiPost({
                    path: "/api/transaction/description",
                    body: {
                        description: newTransaction.description,
                        id: newTransaction.id,
                    },
                }));
            }

            // 3. Update the date
            if (this.state.date != initialState.date) {
                newTransaction.date = date;
                work.push(util.apiPost({
                    path: "/api/transaction/date",
                    body: {
                        date: date.valueOf().toString(),
                        id: newTransaction.id,
                    },
                    location: this.props.location,
                    history: this.props.history,
                }));
            }

            // 4. Update the category
            if (this.state.category != initialState.category) {
                newTransaction.category = category;
                work.push(util.apiPost({
                    path: "/api/transaction/category",
                    body: {
                        category, id: newTransaction.id,
                    },
                    location: this.props.location,
                    history: this.props.history,
                }));
            }

            // 5. Update the amount (if not split)
            if (this.state.amount != initialState.amount && !this.props.transaction.split) {
                newTransaction.amount = amount;
                work.push(util.apiPost({
                    path: '/api/transaction/amount',
                    body: {
                        amount, id: newTransaction.id,
                    },
                    location: this.props.location,
                    history: this.props.history,
                }));
            }

            Promise.all(work).then(() => {
                isUpdate(this.props) && this.props.onUpdateTransaction(newTransaction);
            });
            
        } else {
            const onAddTransaction = this.props.onAddTransaction;
            const split = this.state.splitting ? {
                with: this.state.splitWith,
                myShare, theirShare, otherAmount,
                iPaid: this.state.youPaid,
            } : undefined;
            // Saving a new transaction...
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
                onAddTransaction(transaction);
            });
        }
    }

    render(): JSX.Element {
        const options = this.props.categories.map(c => {
            return <option key={c.id} value={c.id}>{c.name}</option>;
        });
        const className = this.state.error ? "error" : "";
        // Show the splitting option if you're adding and have friends, or if you're updating a split transaction.
        const splitting = (isUpdate(this.props) ? this.props.transaction.split : this.props.friends.length > 0) ? (this.state.splitting ? 
            <div><label>Split with: <select onChange={util.cc(this, 'splitWith')} value={this.state.splitWith}>
                    {this.props.friends.map(f => <option key={f.uid}>{f.email}</option>)}
                </select></label>
                <label className="first half">
                    Your share: <input type="text" value={this.state.yourShare} onChange={util.cc(this, 'yourShare')} size={1} /> 
                </label><label className="half">
                    Their share: <input type="text" value={this.state.theirShare} onChange={util.cc(this, 'theirShare')} size={1} /></label>
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
                <label>{isUpdate(this.props) && this.props.transaction.split ? 'Total' : 'Amount'}:
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
                {isUpdate(this.props) ? <button className="button"
                    onClick={() => isUpdate(this.props) && this.delete(this.props.transaction)}>Delete</button> : null}
            </form>
        </div>;
    }
}

//export default withRouter(TxEntry);
