import * as React from 'react';
import {RouteComponentProps, withRouter} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category, CategoryId } from '../shared/types';
import TxEntry from './txentry'
import * as frames from '../shared/frames';
import * as util from './util';
import * as categories from '../shared/categories';
import {ClickToEditMoney, ClickToEditText, ClickToEditDropdown} from './components/clicktoedit';
import Poplet from './components/poplet';

interface CategoryRowProps {
    category: Category;
    categories: Category[];
    onDeleteCategory: (id: CategoryId) => void;
    onChangeCategory: (newCategory: Category) => void;
}
type Props = CategoryRowProps & RouteComponentProps<CategoryRowProps>;
interface CategoryRowState {}

class CategoryRow extends React.Component<Props, CategoryRowState> {
    state = {};
    private poplet: React.RefObject<Poplet>;

    constructor(props: Props) {
        super(props);
        // create a ref to store the textInput DOM element
        this.poplet = React.createRef();
      }

    categoryMap(): Map<string, string> {
        const map = new Map();
        this.props.categories.forEach(c => {
            map.set(c.id, `${c.name} - ${c.balance.formatted()}`);
        });
        return map;
    }

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

    onCoverBalance(fromId: CategoryId) {
        const that = this.props.categories.filter(c => c.id == fromId)[0];
        const thatNew = {...that};
        // This balance ought to be negative
        thatNew.balance = thatNew.balance.plus(this.props.category.balance);
        this.props.onChangeCategory(thatNew);
    
        const thisNew = {...this.props.category};
        thisNew.balance = Money.Zero;
        this.props.onChangeCategory(thisNew);

        this.poplet.current.close();
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
        const balanceCls = this.props.category.balance.cmp(Money.Zero) == 0 ? "zero" : 
            (this.props.category.balance.cmp(Money.Zero) == -1 ? "highlighted" : "");

        const balance = <Poplet text={this.props.category.balance.formatted()} ref={this.poplet}
            title={"Cover from another category"}>
            Cover from:
            <ClickToEditDropdown open value={this.props.category.id || ""}
                values={this.categoryMap()}
                onChange={this.onCoverBalance.bind(this)}
                postTo="/api/budgeting/move"
                postKey="from"
                postData={{to: this.props.category.id, amount: this.props.category.balance.negate()}} />
        </Poplet>;

        return <tr key={this.props.category.id} className="hoverable">
            <td className="del"><span className="deleteCr clickable fa-times fas" onClick={() => this.delete()}></span></td>
            <td className="stretch">{name}</td>
            <td className={"amount " + budgetCls}>{budget}</td>
            <td className={"amount " + spendingCls}>{spending.formatted()}</td>
            <td className={"amount balance " + balanceCls}><span className="formatted">{balance}</span></td>
        </tr>;
    }
}

export default withRouter(CategoryRow);
