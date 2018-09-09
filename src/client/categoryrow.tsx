import * as React from 'react';
import {RouteComponentProps, withRouter} from 'react-router';
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

class CategoryRow extends React.Component<CategoryRowProps & RouteComponentProps<CategoryRowProps>, CategoryRowState> {
    state = {};

    delete(): boolean {
        util.apiPost({
            path: '/api/category',
            method: 'DELETE',
            body: {
                id: this.props.category.id,
                frame: this.props.category.frame,
            },
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
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
                size={40}
                value={this.props.category.name}
                onChange={this.onUpdateName.bind(this)}
                postTo="/api/category/name"
                postData={{
                    id: this.props.category.id,
                    frame: this.props.category.frame}}
                postKey="name" />
        const spending = this.props.category.balance.minus(this.props.category.budget).negate();
        const spendingCls = spending.cmp(Money.Zero) == 0 ? "zero" : "";
        const budgetCls = this.props.category.budget.cmp(Money.Zero) == 0 ? "zero" : "";
        const balanceCls = this.props.category.balance.cmp(Money.Zero) == 0 ? "zero" : "";
        return <tr key={this.props.category.id} className="hoverable">
            <td className="del"><span className="deleteCr clickable fa-times fas" onClick={() => this.delete()}></span></td>
            <td className="stretch">{name}</td>
            <td className={"amount " + budgetCls}>{budget}</td>
            <td className={"amount " + spendingCls}>{spending.formatted()}</td>
            <td className={"amount " + balanceCls}>{this.props.category.balance.formatted()}</td>
        </tr>;
    }
}

export default withRouter(CategoryRow);
