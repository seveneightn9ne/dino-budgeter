import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category, CategoryId } from '../shared/types';
import TxEntry from './txentry'
import * as frames from '../shared/frames';
import * as util from './util';
import * as categories from '../shared/categories';
import {ClickToEditMoney, ClickToEditText} from './components/clicktoedit';

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

    onUpdateBudget(newBudget: Money) {
        const newCategory = {...this.props.category};
        newCategory.budget = newBudget;
        newCategory.balance = categories.updateBalanceWithBudget(
            this.props.category, newBudget);
        this.props.onChangeCategory(newCategory);
    }

    onUpdateName(newName: string) {
        const newCategory = {...this.props.category};
        newCategory.name = newName;
        this.props.onChangeCategory(newCategory);
    }

    render() {
        const budget = <ClickToEditMoney 
            value={this.props.category.budget} 
            onChange={this.onUpdateBudget.bind(this)}
            postTo="/api/category/budget"
            postData={{
                id: this.props.category.id,
                frame: this.props.category.frame}}
            postKey="amount" />
        const name = <ClickToEditText
                value={this.props.category.name}
                onChange={this.onUpdateName.bind(this)}
                postTo="/api/category/name"
                postData={{
                    id: this.props.category.id,
                    frame: this.props.category.frame}}
                postKey="name" />
        return <tr key={this.props.category.id}>
            <td><a className="deleteCr" href="#" onClick={() => this.delete()}>X</a></td>
            <td>{name}</td>
            <td>{budget}</td>
            <td>{this.props.category.balance.formatted()}</td>
        </tr>;
    }
}
