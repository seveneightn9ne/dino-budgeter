import * as React from 'react';
import {Category} from '../shared/types';
import { index } from '../shared/frames';
import TxEntry from './txentry';

interface Props {}

interface State {
    categories: Category[];
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

    render(): JSX.Element {
        return <div>
            <h1>Add Transaction</h1>
            <TxEntry onAddTransaction={() => {}}
            defaultDate={new Date()}
            categories={this.state.categories} /></div>;
    }
}
