import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import * as frames from '../shared/frames'

type Props = RouteComponentProps<{month: string, year: string}>;

type State = {
    kind: "loading"
} | {
    kind: "error"
    message: string
} | {
    kind: "loaded"
    transactions: any[]
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
        const month = Number(this.props.match.params.month);
        const year = Number(this.props.match.params.year);
        const frame = frames.index(month, year);
        const res = await fetch("/api/transactions?frame=" + frame);
        if (res.status != 200) {
            throw new Error(`status ${res.status}`)
        }
        const payload = await res.json();
        this.setStateStrict({
            kind: "loaded",
            transactions: payload.transactions,
        });
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

    renderTransactions(transactions: any[]) {
        const rows = transactions.map((tx) => {
            return <div>{tx.description}: {tx.amount}</div>
        })
        return <div>Transactions: {rows}</div>
    }
}
