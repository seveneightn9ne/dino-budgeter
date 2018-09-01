import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category, CategoryId } from '../shared/types';
import TxEntry from './txentry'
import * as frames from '../shared/frames';
import * as util from './util';
import * as categories from '../shared/categories';

interface CategoryRowProps {
    category: Category;
    onDeleteCategory: (id: CategoryId) => void;
    onChangeCategory: (newCategory: Category) => void;
}
interface CategoryRowState {
    editingBudget: boolean;
    newBudget?: string;
    newBudgetErr?: boolean;
}

export default class CategoryRow extends React.Component<CategoryRowProps, CategoryRowState> {
    state = {editingBudget: false, newBudget: ''};

    delete(): boolean {
        fetch('/api/category', {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                id: this.props.category.id,
            }),
        }).then(response => {
            this.props.onDeleteCategory(this.props.category.id);
        });
        return true;
    }

    editBudget(): boolean {
        this.setState({editingBudget: true, newBudget: ''});
        return true;
    }

    endEditBudget(): void {
        this.setState({editingBudget: false});
    }

    updateBudgetValue(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({newBudget: event.target.value, newBudgetErr: false});
    }

    saveNewBudget(event: React.FormEvent): void {
        const newBudget = new Money(this.state.newBudget);
        if (!newBudget.isValid(false /** allowNegative **/)) {
            this.setState({newBudgetErr: true});
            event.preventDefault();
            return;
        }
        fetch('/api/category/budget', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                id: this.props.category.id,
                frame: this.props.category.frame,
                amount: newBudget,
            }),
        }).then(() => {
            const newCategory = {...this.props.category};
            newCategory.budget = newBudget;
            newCategory.balance = categories.updateBalanceWithBudget(
                this.props.category, newBudget);
            this.props.onChangeCategory(newCategory);
            this.setState({editingBudget: false});
        });
        event.preventDefault();
    }

    render() {
        const budget = (this.state.editingBudget) 
            ? <span><form onBlur={this.endEditBudget.bind(this)} onSubmit={this.saveNewBudget.bind(this)}>
                <input type="text" size={4} autoFocus={true}
                    placeholder={this.props.category.budget.string()} value={this.state.newBudget} 
                    onChange={(e) => this.updateBudgetValue(e)} />
                <input type="submit" value="Save" /></form></span>
            : <b><a href="#" onClick={() => this.editBudget()}>{this.props.category.budget.formatted()}</a></b>;
        return <tr key={this.props.category.id}>
            <td><a href="#" onClick={() => this.delete()}>X</a></td>
            <td>{this.props.category.name}</td>
            <td>{budget}</td>
            <td>{this.props.category.balance.formatted()}</td>
        </tr>;
    }
}
