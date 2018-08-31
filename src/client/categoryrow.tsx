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
        this.setState({newBudget: event.target.value});
    }

    saveNewBudget(): void {
        fetch('/api/category/budget', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                id: this.props.category.id,
                frame: this.props.category.frame,
                amount: this.state.newBudget,
            }),
        }).then(() => {
            const newCategory = {...this.props.category};
            newCategory.budget = this.state.newBudget;
            newCategory.balance = categories.updateBalanceWithBudget(
                this.props.category, this.state.newBudget);
            this.props.onChangeCategory(newCategory);
            this.setState({editingBudget: false});
        });
    }

    render() {
        const budget = (this.state.editingBudget) 
            ? <span><input type="text" size={4} autoFocus={true}
                placeholder={this.props.category.budget} value={this.state.newBudget} 
                onChange={(e) => this.updateBudgetValue(e)}
                onBlur={() => this.endEditBudget()}  />
                <button onMouseDown={() => this.saveNewBudget()}>Save</button></span>
            : <b><a href="#" onClick={() => this.editBudget()}>{util.formatMoney(this.props.category.budget)}</a></b>;
        return <tr key={this.props.category.id}>
            <td><a href="#" onClick={() => this.delete()}>X</a></td>
            <td>{this.props.category.name}</td>
            <td>{budget}</td>
            <td>{util.formatMoney(this.props.category.balance)}</td>
        </tr>;
    }
}
