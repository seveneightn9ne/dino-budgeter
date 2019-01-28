import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import * as categories from "../shared/categories";
import Money from "../shared/Money";
import { Category, CategoryId } from "../shared/types";
import { ClickToEditDropdown, ClickToEditMoney, ClickToEditText } from "./components/clicktoedit";
import { ControlledPoplet } from "./components/poplet";
import * as util from "./util";
import { DeleteCategory, CategoryBudget, CategoryName, BudgetingMove } from "../shared/api";

interface CategoryRowProps {
    category: Category;
    categories: Category[];
    onDeleteCategory: (id: CategoryId) => void;
    onChangeCategory: (newCategory: Category) => void;
}
type Props = CategoryRowProps & RouteComponentProps<CategoryRowProps>;
interface CategoryRowState {
    provisionalCoverFrom?: CategoryId;
    popletOpen: boolean;
}

class CategoryRow extends React.Component<Props, CategoryRowState> {
    state: CategoryRowState = {
        popletOpen: false,
    };

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
        util.apiFetch({
            api: DeleteCategory,
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

    onUpdateName = (newName: string) => {
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

    closePoplet = () => {
        this.setState({popletOpen: false});
    }

    openPoplet = () => {
        this.setState({popletOpen: true});
    }

    previewCover(from: CategoryId) {
        this.setState({provisionalCoverFrom: from});
    }

    render() {
        const budget = <ClickToEditMoney
            size={6}
            api={CategoryBudget}
            value={this.props.category.budget}
            onChange={this.onUpdateBudget.bind(this)}
            postData={{
                id: this.props.category.id,
                frame: this.props.category.frame}}
            location={this.props.location}
            history={this.props.history}
            postKey="amount" />;
        const name = <ClickToEditText
                size={40}
                api={CategoryName}
                value={this.props.category.name}
                onChange={this.onUpdateName}
                postData={{
                    id: this.props.category.id,
                    frame: this.props.category.frame}}
                location={this.props.location}
                history={this.props.history}
                postKey="name" />;
        const spending = this.props.category.balance.minus(this.props.category.budget).negate();
        const spendingCls = spending.cmp(Money.Zero) == 0 ? "zero" : "";
        const budgetCls = this.props.category.budget.cmp(Money.Zero) == 0 ? "zero" : "";
        const balanceCls = this.props.category.balance.cmp(Money.Zero) == 0 ? "zero" :
            (this.props.category.balance.cmp(Money.Zero) == -1 ? "highlighted" : "");


        const balance = this.props.category.balance.cmp(Money.Zero) < 0 ?
            <ControlledPoplet text={this.props.category.balance.formatted()} open={this.state.popletOpen}
                onRequestClose={this.closePoplet} onRequestOpen={this.openPoplet}
                title={"Cover from another category"}>
                Cover from {" "}
                <ClickToEditDropdown open value=""
                    api={BudgetingMove}
                    values={this.categoryMap(this.props.category.balance.negate())}
                    onChange={this.onCoverBalance.bind(this)}
                    postKey="from"
                    location={this.props.location}
                    history={this.props.history}
                    postData={{
                        to: this.props.category.id,
                        amount: this.props.category.balance.negate(),
                        frame: this.props.category.frame,
                    }} />
            </ControlledPoplet> : this.props.category.balance.formatted();

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
