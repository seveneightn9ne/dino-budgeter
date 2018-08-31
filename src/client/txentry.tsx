import * as React from 'react';
import {Money} from '../shared/types';


interface TxEntryProps {
    frame: number;
    onAddTransaction: (amount: Money) => void;
}

interface TxEntryState {
    amount: string;
    description: string;
}

export default class TxEntry extends React.Component<TxEntryProps, TxEntryState> {
    state = {
        amount: '',
        description: '',
    }

    updateAmount(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({amount: event.target.value});
    }

    updateDescription(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({description: event.target.value});
    }

    saveNewBudget(): void {
        const amount = this.state.amount;
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
            }),
        }).then(() => {
            // TODO if it's in a category, you have to update the category view.
            this.props.onAddTransaction(amount);
            this.setState({amount: '', description: ''});
        });
    }
    render() {
        return <div>
            <label>Amount:</label>
            <input value={this.state.amount} onChange={(e) => this.updateAmount(e)} />
            <label>Description:</label>
            <input value={this.state.description} onChange={(e) => this.updateDescription(e)} />
            <button onClick={() => this.saveNewBudget()}>Add</button>
        </div>;
    }
}
