import * as React from 'react';
import {Category, Transaction} from '../shared/types';
import { index } from '../shared/frames';
import TxEntry from './txentry';
import { Redirect } from 'react-router';

interface Props {}

interface State {
    categories: Category[];
    redirectTo?: string;
}

export default class AddTransaction extends React.Component<Props, State> {

    state: State = {
        categories: [],
    }

    private date = new Date();

    componentDidMount() {
        this.initialize();
    }

    initialize(): Promise<void> {
        const frame = index(this.date.getMonth(), this.date.getFullYear());
        const path = '/api/categories?frame=' + frame;
        return fetch(path).then((response) => {
            if (response.status != 200) {
                throw new Error(`Failed to get categories: ${response.body}`)
            }
            return response.json();
        }).then(response => {
            this.setState({categories: response.categories});
        });
    }

    onAddTransaction(tx: Transaction) {
        const month = tx.date.getMonth();
        const year = tx.date.getFullYear();
        this.setState({redirectTo: `/app/${month+1}/${year}/transactions`});
    }

    render(): JSX.Element {
        if (this.state.redirectTo) {
            return <Redirect to={this.state.redirectTo} />;
        }
        return <div className="fullpage">
            <h1>Add Transaction</h1>
            <TxEntry onAddTransaction={this.onAddTransaction.bind(this)}
            defaultDate={new Date()}
            categories={this.state.categories} /></div>;
    }
}
