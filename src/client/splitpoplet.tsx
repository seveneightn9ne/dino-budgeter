
import * as React from 'react';
import Poplet from './components/poplet';
import {Transaction, UserId} from '../shared/types';

interface Props {
    me: UserId;
    transaction: Transaction;
}
interface State {
    total: string;
    yourShare: string;
    theirShare: string;
    payer: UserId;
    settled: boolean;
}
export default class SplitPoplet extends React.Component<Props, State> {

    render() {
        return <Poplet text="shared">
            <p>Split with {this.props.transaction.split.with.email}</p>
            <form onSubmit={() => {}}>
            <p>Total <input type="number" value={this.state.total} /></p>
            <p>Your share: <input /></p>
            <p>Their share: <input /></p>
            <p>You owe {"$10.00"}</p>
            <input type="submit" value="Save" />
            </form>
        </Poplet>;
    }
}