import * as React from 'react';
import {Money, Category} from '../shared/types';


interface TxEntryProps {
    frame: number;
    onAddTransaction: (amount: Money, category: string) => void;
    categories: Category[];
}

interface TxEntryState {
    amount: string;
    description: string;
    category: string;
    error: boolean;
}

export default class TxEntry extends React.Component<TxEntryProps, TxEntryState> {
    state = {
        amount: '',
        description: '',
        category: '',
        error: false,
    };

    updateAmount(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({amount: event.target.value, error: false});
    }

    updateDescription(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({description: event.target.value});
    }

    updateCategory(event: React.ChangeEvent<HTMLSelectElement>): void {
        this.setState({category: event.target.value});
    }

    handleSubmit(event: React.FormEvent): void {
        const amount = new Money(this.state.amount);
        if (!amount.isValid(false /** allowNegative **/)) {
            this.setState({error: true});
            event.preventDefault();
            return;
        }
        const category = this.state.category;
        fetch('/api/transaction', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                frame: this.props.frame,
                amount: amount,
                description: this.state.description,
                category: category,
            }),
        }).then(() => {
            // TODO if it's in a category, you have to update the category view.
            this.props.onAddTransaction(amount, category);
            this.setState({amount: '', description: '', category: ''});
        });
        event.preventDefault();
    }

    render() {
        const options = this.props.categories.map(c => {
            return <option key={c.id} value={c.id}>{c.name}</option>;
        });
        const className = this.state.error ? "error" : "";
        return <div>
            <form onSubmit={this.handleSubmit.bind(this)}>
                <label>Amount:
                <input className={className} value={this.state.amount} onChange={(e) => this.updateAmount(e)} size={4} /></label>
                <label>Description:
                <input value={this.state.description} onChange={(e) => this.updateDescription(e)} /></label>
                <select onChange={(e) => this.updateCategory(e)} value={this.state.category}>
                    <option value="">Uncategorized</option>
                    {options}
                </select>
                <input type="submit" value="Add" />
            </form>
        </div>;
    }
}
