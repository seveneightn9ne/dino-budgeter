import * as React from "react";
import { Redirect } from "react-router";
import { index } from "../shared/frames";
import { Category, Friend, Transaction } from "../shared/types";
import TxEntry from "./txentry";
import * as util from "./util";

interface Props {}

interface State {
    initialized: boolean;
    categories?: Category[];
    friends?: Friend[];
    redirectTo?: string;
}

export default class AddTransaction extends React.Component<Props, State> {

    state: State = {
        initialized: false,
    };

    componentDidMount() {
        const date = new Date();
        const frame = index(date.getMonth(), date.getFullYear());
        util.initializeState(this, frame, "categories", "friends");
    }

    onAddTransaction(tx: Transaction) {
        const month = tx.date.getMonth();
        const year = tx.date.getFullYear();
        this.setState({redirectTo: `/app/${month + 1}/${year}/transactions`});
    }

    render(): JSX.Element {
        if (this.state.redirectTo) {
            return <Redirect to={this.state.redirectTo} />;
        }
        const today = new Date();
        return <div className="fullpage">
            <h1>Add Transaction <span className="close clickable fa-times fas" onClick={() => this.setState({
                redirectTo: `/app/${today.getMonth() + 1}/${today.getFullYear()}/categories`})} /></h1>
            <TxEntry onAddTransaction={this.onAddTransaction.bind(this)}
            defaultDate={new Date()}
            friends={this.state.friends || []}
            categories={this.state.categories || []} /></div>;
    }
}
