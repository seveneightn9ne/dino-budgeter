import * as React from "react";
import { index } from "../shared/frames";
import Money from "../shared/Money";
import { distributeTotal } from "../shared/transactions";
import { Category, Friend, Share, Transaction, CategoryId } from "../shared/types";
import * as util from "./util";
import * as api from '../shared/api';

interface NewTxProps {
    onAddTransaction: (transaction: Transaction) => void;
    categories: Category[];
    friends: Friend[];
    defaultDate: Date;
}

interface UpdateTxProps {
    categories: Category[];
    friends: Friend[];
    transaction: Transaction;
    onUpdateTransaction: (transaction: Transaction) => void;
    onDeleteTransaction: (transaction: Transaction) => void;
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

interface SubmitData {
    amount: Money,
    total: Money,
    category: CategoryId,
    date: Date,
    frame: number,
    myShare: Share,
    theirShare: Share,
    otherAmount: Money,
}

function isUpdate(props: Props): props is UpdateTxProps {
    return "transaction" in props;
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
                category: props.transaction.category || "",
                error: false,
                date: util.yyyymmdd(props.transaction.date),
                splitting: !!props.transaction.split,
                splitWith: props.transaction.split ? props.transaction.split.with.uid : this.defaultSplitWith(),
                yourShare: props.transaction.split ? props.transaction.split.myShare.string() : "1",
                theirShare: props.transaction.split ? props.transaction.split.theirShare.string() : "1",
                youPaid: props.transaction.split ? props.transaction.split.payer != props.transaction.split.with.uid : true,
            };
        } else {
            return {
                amount: "",
                description: "",
                category: "",
                error: false,
                date: util.yyyymmdd(props.defaultDate),
                splitting: false,
                splitWith: this.defaultSplitWith(),
                yourShare: "1",
                theirShare: "1",
                youPaid: true,
            };
        }
    }

    componentDidUpdate(prevProps: Props) {
        if (isUpdate(prevProps) && isUpdate(this.props) && prevProps.transaction != this.props.transaction) {
            // New transaction - recompute all state
            this.setState(this.initializeState(this.props));
        } else if (prevProps.friends != this.props.friends && this.state.splitWith == "") {
            // Friends have loaded - recompute default split now that we have friends
            this.setState({
                splitWith: this.defaultSplitWith(),
            });
        }
    }

    defaultSplitWith() {
        return this.props.friends.length > 0 ? this.props.friends[0].uid : "";
    }

    delete(t: Transaction): boolean {
        util.apiFetch({
            api: api.DeleteTransaction,
            body: {id: t.id},
        }).then(() => {
            isUpdate(this.props) && this.props.onDeleteTransaction(t);
        });
        return true;
    }

    handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const data = this.prepareSubmission();
        if (!data) {
            return;
        }
        if (isUpdate(this.props)) {
            this.submitForUpdate(this.props, data);
        } else {
            this.submitForAdd(this.props, data);
        }
    }

    prepareSubmission(): SubmitData | false {
        let amount = new Money(this.state.amount);
        const total = new Money(this.state.amount);
        if (!amount.isValid(false /* allowNegative */)) {
            this.setState({error: true});
            return false;
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
                return false;
            }
            [amount, otherAmount] = distributeTotal(amount, myShare, theirShare);
        }
        return {amount, total, category, date, frame, myShare, theirShare, otherAmount};
    }

    submitForUpdate(props: UpdateTxProps, data: SubmitData) {
        const newTransaction = {...props.transaction};
        // Updating an existing transaction...
        const initialState = this.initializeState(props);
        const work: Promise<any>[] = [];

        const tasks = [
            this.submitUpdateSplit,
            this.submitUpdateDescription,
            this.submitUpdateDate,
            this.submitUpdateCategory,
            this.submitUpdateAmount,
        ];
        tasks.forEach(task => {
            const promise = task(props, initialState, newTransaction, data);
            if (promise) {
                work.push(promise);
            }
        });

        Promise.all(work).then(() => {
            isUpdate(this.props) && this.props.onUpdateTransaction(newTransaction);
        });
    }

    submitUpdateSplit = (props: UpdateTxProps, initialState: TxEntryState, newTransaction: Transaction, data: SubmitData) => {
        const {myShare, theirShare, amount, otherAmount, total} = data;

        if (!(props.transaction.split &&
            (this.state.amount != initialState.amount
            || this.state.theirShare != initialState.theirShare
            || this.state.yourShare != initialState.yourShare
            || this.state.youPaid != initialState.youPaid))) {
            
            return null;
        }

        // Update newTransaction
        newTransaction.split = {...newTransaction.split,
            myShare, theirShare, otherAmount,
            // XXX: using "0" because I don't know my own uid.
            payer: this.state.youPaid ? "0" : newTransaction.split.with.uid,
        };
        newTransaction.amount = amount;

        // Post the data
        return util.apiFetch({
            api: api.TransactionSplit,
            body: {
                tid: props.transaction.id,
                sid: props.transaction.split.id,
                total, myShare, theirShare,
                iPaid: this.state.youPaid,
            },
        });
    }

    submitUpdateDescription = (_props: UpdateTxProps, initialState: TxEntryState, newTransaction: Transaction, _data: SubmitData) => {
        if (this.state.description == initialState.description) {
            return null;
        }
        newTransaction.description = this.state.description;
        return util.apiFetch({
            api: api.TransactionDescription,
            body: {
                description: newTransaction.description,
                id: newTransaction.id,
            },
        });
    }

    submitUpdateDate = (_props: UpdateTxProps, initialState: TxEntryState, newTransaction: Transaction, data: SubmitData) => {
        if (this.state.date == initialState.date) {
            return null;
        }
        newTransaction.date = data.date;
        return util.apiFetch({
            api: api.TransactionDate,
            body: {
                date: data.date,
                id: newTransaction.id,
            },
        });
    }

    submitUpdateCategory = (_props: UpdateTxProps, initialState: TxEntryState, newTransaction: Transaction, data: SubmitData) => {
        if (this.state.category == initialState.category) {
            return null;
        }
        newTransaction.category = data.category;
        return util.apiFetch({
            api: api.TransactionCategory,
            body: {
                category: data.category,
                id: newTransaction.id,
            },
        });
    }

    submitUpdateAmount = (props: UpdateTxProps, initialState: TxEntryState, newTransaction: Transaction, data: SubmitData) => {
        if (this.state.amount == initialState.amount || props.transaction.split) {
            return null;
        }
        newTransaction.amount = data.amount;
        return util.apiFetch({
            api: api.TransactionAmount,
            body: {
                amount: data.amount, id: newTransaction.id,
            },
        });
    }

    submitForAdd = (props: NewTxProps, data: SubmitData) => {
        const {amount, frame, category, date, myShare, theirShare, otherAmount} = data;
        const onAddTransaction = props.onAddTransaction;
        const split = this.state.splitting ? {
            with: this.state.splitWith,
            myShare, theirShare, otherAmount,
            iPaid: this.state.youPaid,
        } : undefined;
        // Saving a new transaction...
        util.apiFetch({
            api: api.AddTransaction,
            body: {
                frame: frame,
                amount: amount,
                description: this.state.description,
                date: date,
                category: category,
                split: split,
            },
        }).then((transaction) => {
            // Not clearing date & category
            this.setState({amount: "", description: "", splitting: false, splitWith: this.defaultSplitWith(),
                yourShare: "1", theirShare: "1", youPaid: true});
            onAddTransaction(transaction);
        });
    }

    openSplitSection = () => {
        this.setState({splitting: true});
    }
    closeSplitSection = () => {
        this.setState({splitting: false});
    }

    selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.select();
    }

    onPayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({youPaid: e.target.value === "0"});
    }

    renderSplitSection = () => {
        // You can remove a split iff it's a new transaction.
        const closeButton = isUpdate(this.props) ? null : <span className="close clickable fa-times fas" onClick={this.closeSplitSection} />;
        return <div>
            <label>Split with: 
                <select onChange={util.cc(this, "splitWith")} value={this.state.splitWith}>
                    {this.props.friends.map(f => <option key={f.uid}>{f.email}</option>)}
                </select>
                {closeButton}
            </label>
            <label className="first half">
                Your share: <input type="text" value={this.state.yourShare} onChange={util.cc(this, "yourShare")} size={1} className="center" onFocus={this.selectOnFocus} />
            </label>
            <label className="half">
                Their share: <input type="text" value={this.state.theirShare} onChange={util.cc(this, "theirShare")} size={1} className="center" onFocus={this.selectOnFocus} />
            </label>
            <div className="section" style={{clear: "both"}}>
                <label className="nostyle"><input type="radio" name="payer" value="0" checked={this.state.youPaid}
                    onChange={this.onPayerChange} /> You paid</label>
                <label className="nostyle"><input type="radio" name="payer" value="1" checked={!this.state.youPaid}
                    onChange={this.onPayerChange} /> They paid</label>
            </div>
        </div>;
    }
    
    render(): JSX.Element {
        const options = this.props.categories.map(c => {
            return <option key={c.id} value={c.id}>{c.name}</option>;
        });
        const className = this.state.error ? "center error" : "center";
        // Show the splitting option if you're adding and have friends, or if you're updating a split transaction.
        const splitting = (isUpdate(this.props) ? this.props.transaction.split : this.props.friends.length > 0) ? (this.state.splitting ?
            this.renderSplitSection()
            : <span className="section clickable" onClick={this.openSplitSection}>Split transaction...</span>)
            : null;
        return <div className="txentry">
            <form onSubmit={this.handleSubmit}>
                <label>{isUpdate(this.props) && this.props.transaction.split ? "Total" : "Amount"}: <input
                    autoFocus className={className} value={this.state.amount} onChange={util.cc(this, "amount")} size={6} /></label>
                <label>Description: <input value={this.state.description} onChange={util.cc(this, "description")} /></label>
                <label><input type="date" value={this.state.date} onChange={util.cc(this, "date")} /></label>
                <label><select onChange={util.cc(this, "category")} value={this.state.category}>
                    <option value="">Uncategorized</option>
                    {options}
                </select></label>
                {splitting}
                <label><input className="button nomargin" type="submit" value="Save" />
                {isUpdate(this.props) ? <button className="button"
                    onClick={() => isUpdate(this.props) && this.delete(this.props.transaction)}>Delete</button> : null}</label>
            </form>
        </div>;
    }
}
