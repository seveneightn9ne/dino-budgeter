
import * as React from 'react';
import Poplet from './components/poplet';
import {Transaction, UserId, Share} from '../shared/types';
import { cc, apiPost } from './util';
import Money from '../shared/Money';

interface Props {
    //me: UserId;
    transaction: Transaction;
    onUpdateTransaction: (t: Transaction) => void;
}
interface State {
    total: string;
    totalErr: boolean;
    yourShare: string;
    yourErr: boolean;
    theirShare: string;
    theirErr: boolean;
    //payer: UserId;
    settled: boolean;
}
export default class SplitPoplet extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = initialState(props.transaction);
    }

    /*componentDidUpdate(prevProps: Props) {
        if (prevProps.transaction.amount != this.props.transaction.amount ||
            prevProps.transaction.split.otherAmount != this.props.transaction.split.otherAmount) {
            this.setState(initialState(this.props))
        }
    }*/
    
    handleSubmit(event: React.FormEvent): void {
        event.preventDefault();
        const total = new Money(this.state.total);
        const totalErr = !total.isValid(false);
        const myShare = new Share(this.state.yourShare);
        const yourErr = !myShare.isValid(false);
        const theirShare = new Share(this.state.theirShare);
        const theirErr = !theirShare.isValid(false);
        if (totalErr || yourErr || theirErr) {
            this.setState({totalErr, yourErr, theirErr});
            return;
        }
        const yourAmount = youPay(this.state);
        apiPost({
            path: '/api/transaction/split',
            body: {
                tid: this.props.transaction.id,
                sid: this.props.transaction.split.id,
                total, myShare, theirShare,
            },
        }).then(() => {
            const newTransaction = {...this.props.transaction};
            newTransaction.split = {...this.props.transaction.split, myShare, theirShare};
            newTransaction.amount = yourAmount;
            // onUpdateTransaction will unmount this component
            this.props.onUpdateTransaction(newTransaction);
            this.setState(initialState(newTransaction))
        });
    }

    render() {
        return <Poplet text="shared">
            <p>Split with {this.props.transaction.split.with.email}</p>
            <form onSubmit={this.handleSubmit.bind(this)}>
            <p>Total: <input className={cls(this.state.totalErr)} type="text" value={this.state.total} onChange={cc(this, 'total')} /></p>
            <p>Your share: <input className={cls(this.state.yourErr)} type="number" value={this.state.yourShare} onChange={cc(this, 'yourShare')} /></p>
            <p>Their share: <input className={cls(this.state.theirErr)} type="number" value={this.state.theirShare} onChange={cc(this, 'theirShare')} /></p>
            <p>You spent {youPay(this.state).string()}.</p>
            <input type="submit" value="Save" />
            </form>
        </Poplet>;
    }
}

function initialState(transaction: Transaction): State {
    const yourAmount = transaction.amount;
    const yourShare = transaction.split.myShare;
    const theirShare = transaction.split.theirShare;
    const theirAmount = transaction.split.otherAmount;
    return {
        total: yourAmount.plus(theirAmount).string(),
        totalErr: false,
        yourShare: yourShare.string(),
        yourErr: false,
        theirShare: theirShare.string(),
        theirErr: false,
        //payer: props.me,
        settled: false,
    }
}

function cls(isError: boolean): string {
    return isError ? 'error' : '';
}

function youPay(state: State): Money {
    const [yourShare, _] = Share.normalize(new Share(state.yourShare), new Share(state.theirShare));
    return yourShare.of(new Money(state.total));
}