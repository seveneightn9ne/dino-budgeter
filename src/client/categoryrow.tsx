import * as React from 'react';
import {RouteComponentProps, withRouter} from 'react-router';
import {Category, CategoryId } from '../shared/types';
import Money from '../shared/Money';
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
interface CategoryRowState {
    provisionalCoverFrom?: CategoryId;
}

class CategoryRow extends React.Component<Props, CategoryRowState> {
    state: CategoryRowState = {};
    private poplet: React.RefObject<Poplet>;

    constructor(props: Props) {
        super(props);
        // create a ref to store the textInput DOM element
        this.poplet = React.createRef();
      }

    categoryMap(minBalance: Money): Map<string, string> {
        const map = new Map();
        this.props.categories.forEach(c => {
            if (c.balance.cmp(minBalance) >= 0) {
                map.set(c.id, `${c.name} - ${c.balance.formatted()}`);
            }
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
        thatNew.budget = thatNew.budget.plus(this.props.category.balance);
        thatNew.balance = thatNew.balance.plus(this.props.category.balance);
        this.props.onChangeCategory(thatNew);
    
        const thisNew = {...this.props.category};
        thisNew.budget = thisNew.budget.minus(thisNew.balance);
        thisNew.balance = Money.Zero;        

        this.props.onChangeCategory(thisNew);

        this.closePoplet();
    }

    closePoplet() {
        if (this.poplet.current) {
            this.poplet.current.close();
        }
    }

    previewCover(from: CategoryId) {
        this.setState({provisionalCoverFrom: from});
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


        const balance = this.props.category.balance.cmp(Money.Zero) < 0 ? 
            <Poplet text={this.props.category.balance.formatted()} ref={this.poplet}
                title={"Cover from another category"}>
                Cover from {' '}
                <ClickToEditDropdown open value=""
                    values={this.categoryMap(this.props.category.balance.negate())}
                    onChange={this.onCoverBalance.bind(this)}
                    postTo="/api/budgeting/move"
                    postKey="from"
                    postData={{
                        to: this.props.category.id,
                        amount: this.props.category.balance.negate(),
                        frame: this.props.category.frame,
                    }} />
            </Poplet> : this.props.category.balance.formatted();

        return <tr key={this.props.category.id} className="hoverable">
            <td className="del"><span className="deleteCr clickable fa-times fas" onClick={() => this.delete()} /></td>
            <td className="stretch">{name}</td>
            <td className={"amount " + budgetCls}>{budget}</td>
            <td className={"amount " + spendingCls}>{spending.formatted()}</td>
            <td className={"amount balance " + balanceCls}><span className="formatted">{balance}</span></td>
        </tr>;
    }
}

export default withRouter(CategoryRow);
