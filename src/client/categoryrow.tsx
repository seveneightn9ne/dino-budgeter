import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category, CategoryId } from '../shared/types';
import TxEntry from './txentry'
import * as frames from '../shared/frames';
import * as util from './util';
import * as categories from '../shared/categories';
import ClickToEdit from './components/clicktoedit';

interface CategoryRowProps {
    category: Category;
    onDeleteCategory: (id: CategoryId) => void;
    onChangeCategory: (newCategory: Category) => void;
}
interface CategoryRowState {
}

export default class CategoryRow extends React.Component<CategoryRowProps, CategoryRowState> {
    state = {};

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

    onUpdateBudget(newBudgetStr: string) {
        const newBudget = new Money(newBudgetStr);
        const newCategory = {...this.props.category};
        newCategory.budget = newBudget;
        newCategory.balance = categories.updateBalanceWithBudget(
            this.props.category, newBudget);
        this.props.onChangeCategory(newCategory);
    }

    async validateNewBudget(newBudgetStr: string): Promise<boolean> {
        const newBudget = new Money(newBudgetStr);
        if (!newBudget.isValid(false /** allowNegative **/)) {
            return false;
        }
        const res = await fetch('/api/category/budget', {
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
        });
        return res.status == 200;
    }

    render() {
        const budget = <ClickToEdit 
            value={this.props.category.budget.string()} 
            onChange={this.onUpdateBudget.bind(this)}
            validateChange={this.validateNewBudget.bind(this)}
            formatDisplay={(budget) => new Money(budget).formatted()} />
        return <tr key={this.props.category.id}>
            <td><a href="#" onClick={() => this.delete()}>X</a></td>
            <td>{this.props.category.name}</td>
            <td>{budget}</td>
            <td>{this.props.category.balance.formatted()}</td>
        </tr>;
    }
}
