import _ from "lodash";
import * as React from "react";
import { match, Redirect } from "react-router-dom";
import { BudgetingMove, CategoryBudget, DeleteCategory } from "../shared/api";
import * as categories from "../shared/categories";
import Money from "../shared/Money";
import { Category, CategoryId } from "../shared/types";
import {
  ClickToEditDropdown,
  ClickToEditMoney,
} from "./components/clicktoedit";
import { ControlledPoplet } from "./components/poplet";
import { ProgressBar } from "./components/progressbar";
import * as util from "./util";

export interface CategoryRowProps {
  match: match<{ month: number; year: number }>;
  category: Category;
  categories: Category[];
  budgetLeftover: Money;
  newCat: CategoryId | undefined;
  depth: number;
  onDeleteCategory: (id: CategoryId) => void;
  onChangeCategory: (newCategory: Category) => void;
}

interface CategoryRowState {
  budgetLeftoverId: CategoryId;
  provisionalCoverFrom?: CategoryId;
  popletOpen: boolean;
  goToDetailPage?: boolean;
}

export default class CategoryRow extends React.Component<
  CategoryRowProps,
  CategoryRowState
> {
  public state: CategoryRowState = {
    popletOpen: false,
    budgetLeftoverId: util.randomId(),
  };

  private children = () => {
    const childIds = findChildren(this.props.categories, this.props.category);
    return this.props.categories.filter((c) => _.includes(childIds, c.id));
  }

  private displayBudget() {
    return Money.sum(_.map([this.props.category, ...this.children()], "budget"));
  }

  private displayBalance() {
    return Money.sum(_.map([this.props.category, ...this.children()], "balance"));
  }

  private displaySpending() {
    return this.displayBalance().minus(this.displayBudget()).negate();
  }

  private categoryMap(minBalance: Money): Map<string, string> {
    const map = new Map();
    if (this.props.budgetLeftover.cmp(minBalance) >= 0) {
      map.set(
        this.state.budgetLeftoverId,
        `Unbudgeted balance - ${this.props.budgetLeftover.formatted()}`,
      );
    }
    this.props.categories.forEach((c) => {
      if (c.balance.cmp(minBalance) >= 0) {
        map.set(c.id, `${c.name} - ${c.balance.formatted()}`);
      }
    });
    return map;
  }

  private delete = (e: React.MouseEvent<any>): boolean => {
    util
      .apiFetch({
        api: DeleteCategory,
        body: {
          id: this.props.category.id,
          frame: this.props.category.frame,
        },
      })
      .then(() => {
        this.props.onDeleteCategory(this.props.category.id);
      });
    e.stopPropagation();
    return true;
  };

  private onUpdateBudget = (newBudget: Money) => {
    const newCategory = { ...this.props.category };
    newCategory.budget = newBudget;
    newCategory.balance = categories.updateBalanceWithBudget(
      this.props.category,
      newBudget,
    );
    this.props.onChangeCategory(newCategory);
  };

  private onCoverBalance = (fromId: CategoryId) => {
    if (fromId !== this.state.budgetLeftoverId) {
      const that = this.props.categories.filter((c) => c.id == fromId)[0];
      const thatNew = { ...that };
      // This balance ought to be negative
      thatNew.budget = thatNew.budget.plus(this.props.category.balance);
      thatNew.balance = thatNew.balance.plus(this.props.category.balance);
      this.props.onChangeCategory(thatNew);
    }

    const thisNew = { ...this.props.category };
    thisNew.budget = thisNew.budget.minus(thisNew.balance);
    thisNew.balance = Money.Zero;

    this.props.onChangeCategory(thisNew);

    this.closePoplet();
  };

  private closePoplet = () => {
    this.setState({ popletOpen: false });
  };

  private openPoplet = () => {
    this.setState({ popletOpen: true });
  };

  private onClick = () => {
    this.setState({ goToDetailPage: true });
  };

  public render() {
    if (this.state.goToDetailPage) {
      return (
        <Redirect
          to={`${this.props.match.url}/${this.props.category.id}/${this.props.category.name}`}
          push={true}
        />
      );
    }

    return this.renderRow();
  }

  private renderRow = () => {
    const spending = this.displaySpending();
    const spendingCls = spending.cmp(Money.Zero) === 0 ? "zero" : "";
    const budget = this.displayBudget();
    const budgetCls = budget.cmp(Money.Zero) === 0 ? "zero" : "";
    const balance =  this.displayBalance();
    const balanceCls = balance.cmp(Money.Zero) === 0
        ? "zero"
        : balance.cmp(Money.Zero) === -1
        ? "highlighted"
        : "";

    const newClass =
      this.props.newCat === this.props.category.id ? "new" : "not-new";

    const indent = (
      <span style={{ display: "inline-block", width: 20 * this.props.depth }} />
    );

    return (
      <tr
        key={this.props.category.id}
        className={`hoverable category-row ${newClass}`}
        onClick={this.onClick}
      >
        <td className="del">
          <span
            className="deleteCr clickable fa-times fas"
            onClick={this.delete}
          />
        </td>
        <td className="stretch">
          {indent}
          <span>{this.props.category.name}</span>
        </td>
        <td className="progress-td">{this.renderProgress(spending)}</td>
        <td className={"amount budget " + budgetCls}>{this.renderBudget()}</td>
        <td className={"amount spent " + spendingCls}>
          {spending.formatted()}
        </td>
        <td className={"amount balance " + balanceCls}>
          <span className="formatted">{this.renderBalance()}</span>
        </td>
      </tr>
    );
  }

  private renderBudget = () => {
    const prefixOnEdit = this.children().length
      ? `${this.displayBudget().minus(this.props.category.budget).formatted()} + `
      : null;
    return (<ClickToEditMoney
      size={6}
      api={CategoryBudget}
      displayValue={this.displayBudget()}
      prefixOnEdit={prefixOnEdit}
      value={this.props.category.budget}
      onChange={this.onUpdateBudget}
      postData={{
        id: this.props.category.id,
        frame: this.props.category.frame,
      }}
      postKey="amount"
    />);
    }

  private renderBalance = () =>
    this.props.category.balance.cmp(Money.Zero) < 0 ? (
      <ControlledPoplet
        text={this.props.category.balance.formatted()}
        open={this.state.popletOpen}
        onRequestClose={this.closePoplet}
        onRequestOpen={this.openPoplet}
        title={"Cover from another category"}
      >
        Cover from{" "}
        <ClickToEditDropdown
          open={true}
          zeroValue="Choose category..."
          value=""
          api={BudgetingMove}
          values={this.categoryMap(this.props.category.balance.negate())}
          onChange={this.onCoverBalance}
          postKey="from"
          postTransform={(id) => {
            if (id == this.state.budgetLeftoverId) {
              return "";
            }
            return id;
          }}
          postData={{
            to: this.props.category.id,
            amount: this.props.category.balance.negate(),
            frame: this.props.category.frame,
          }}
        />
      </ControlledPoplet>
    ) : (
      this.props.category.balance.formatted()
    )

  private renderProgress = (spending: Money) => (
    <ProgressBar
      amount={spending}
      total={this.props.category.budget}
      frame={this.props.category.frame}
      small={true}
    />
  )
}

// Memoized function to find all descendants of a given category
// Note: not returning full categories because those can change so we don't want to memoize them
const findChildren = _.memoize((categories: Category[], parent: Category) => {
  const descendants: CategoryId[] = [];

  const categoriesByParent = _.groupBy(categories, "parent");
  const queue = [parent];
  while (queue.length) {
    const cat = queue.pop();
    const children = categoriesByParent[cat.id];
    if (children && children.length) {
      descendants.push(..._.map(children, "id"));
      queue.push(...children);
    }
  }
  return descendants;
}, (cs: Category[], p: Category) => p.id + ":" + cs.map((c) => c.id + "/" + c.parent).join("_"));
