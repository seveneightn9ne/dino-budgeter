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
  newCat?: CategoryId;
  depth: number;
  isOther?: boolean;
  onDeleteCategory: (id: CategoryId) => void;
  onChangeCategory: (newCategory: Category) => void;
}

interface CategoryRowState {
  budgetLeftoverId: CategoryId;
  provisionalCoverFrom?: CategoryId;
  popletOpen: {
    balance: boolean;
    budget: {
      [categoryId: string]: boolean;
    }
  };
  goToDetailPage?: boolean;
  newCatTransition?: boolean;
  timers: number[];
}

export default class CategoryRow extends React.Component<
  CategoryRowProps,
  CategoryRowState
> {
  public state: CategoryRowState = {
    popletOpen: {
      'balance': false,
      'budget': {},
    },
    budgetLeftoverId: util.randomId(),
    timers: [],
  };

  public componentDidUpdate(prevProps: CategoryRowProps) {
    // When transitioning from newCat to just-a-cat, add in the 
    // newCatTransition state to fade out the background color
    if (prevProps.newCat && !this.props.newCat) {
      const timer = setTimeout(() => {
        this.setState({newCatTransition: false});
      })
      this.setState(({timers}) => ({newCatTransition: true, timers: timers.concat([timer])}));

    }
  }

  public componentWillUnmount() {
    // Clear any setTimeout timers
    this.state.timers.forEach((timer) => {
      clearTimeout(timer);
    })
  }

  public render() {
    // Handle when the row has been clicked
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

  private children = (category = this.props.category) => {
    const childIds = findChildren(this.props.categories, category);
    return this.props.categories.filter((c) => _.includes(childIds, c.id));
  }

  private displayBudget(category = this.props.category) {
    if (this.props.isOther) {
      return category.budget;
    }
    return Money.sum(_.map([this.props.category, ...this.children(category)], "budget"));
  }

  private displayBalance() {
    if (this.props.isOther) {
      return this.props.category.balance;
    }
    console.log("displayBalance is sum of " + this.props.category.balance.string() + " and " + this.children().map(c => c.balance.string()).join(", "))
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

  private onUpdateBudget = (newBudget: Money, category = this.props.category) => {
    const newCategory = { ...category };
    newCategory.budget = newBudget;
    newCategory.balance = categories.updateBalanceWithBudget(
      category,
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
    this.setState({popletOpen: {budget: {}, balance: false}});
    return true;
  };

  private openBudgetPoplet = (categoryId: CategoryId) => {
    this.setState({popletOpen: {balance: false, budget: {[categoryId]: true}}});
  };

  private openBalancePoplet = () => {
    this.setState({popletOpen: {balance: true, budget: {}}});
  }

  private onClick = () => {
    if (!this.anyPopletOpen()) {
      this.setState({ goToDetailPage: true });
    }
  };

  private anyPopletOpen = () => {
    return this.state.popletOpen.balance || Object.keys(this.state.popletOpen.budget).length > 0;
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

    const rowClass =
      this.props.newCat === this.props.category.id ? "new" : 
      this.state.newCatTransition ? "not-new-ease" : "not-new";

    const indent = (
      <span style={{ display: "inline-block", width: 20 * this.props.depth }} />
    );

    const del = this.props.isOther ? null : (
      <span
      className="deleteCr clickable fa-times fas"
      onClick={this.delete}
    />
    );

    const nameClass = this.props.isOther ? "otherCR" : "";
    const name = this.props.isOther ? "Other" : this.props.category.name;

    // TODO: Make sub categories smaller font
    return (
      <tr
        key={this.props.category.id}
        className={`category-row hoverable ${rowClass}`}
        onClick={this.onClick}
      >
        <td className="del">
          {del}
        </td>
        <td className="stretch">
          {indent}
          <span className={nameClass}>{name}</span>
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
    return this.children().length && !this.props.isOther
      ? this.renderParentBudget(this.props.category)
      : this.cteBudget(this.props.category);
    }

  private renderParentBudget = (category: Category) => {
    const children = this.children(category).map((child) => {
      const grandChildren = findChildren(this.props.categories, child);
      if (grandChildren.length) {
        return this.renderParentBudget(child);
      }
      return <React.Fragment key={child.id}>
        <label className="right narrow">{child.name}: {this.cteBudget(child, true /* underline */)}</label>
      </React.Fragment>;
    })
    return <ControlledPoplet
        text={"$" + this.displayBudget(category).string()}
        open={!!this.state.popletOpen['budget'][category.id]}
        onRequestClose={() => this.closePoplet()}
        onRequestOpen={() => this.openBudgetPoplet(category.id)}
        title={"Edit Budget"}
      >
        <h1>{category.name} Budget</h1>
        {children}
        <label className="right narrow">Other: {this.cteBudget(category, true /* underline */)}</label>
        <label className="right">Total: <span style={{paddingRight: 20}}>
          {this.displayBudget(category).string()}</span></label>
      </ControlledPoplet>;
  }

  private cteBudget(category: Category, underline = false) {
    return <ClickToEditMoney
      textClassName={underline ? "dash-underline" : ""}
      size={6}
      api={CategoryBudget}
      value={category.budget}
      onChange={(newBudget) => this.onUpdateBudget(newBudget, category)}
      postData={{
        id: category.id,
        frame: category.frame,
      }}
      postKey="amount"
    />;
  }

  private renderBalance = () => {
    const isNegativeBalance = this.displayBalance().cmp(Money.Zero) < 0;
    if(isNegativeBalance) {
      return (
      <ControlledPoplet
        text={this.props.category.balance.formatted()}
        open={this.state.popletOpen['balance']}
        onRequestClose={() => this.closePoplet()}
        onRequestOpen={() => this.openBalancePoplet()}
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
      );
    }

    return this.displayBalance().formatted();
  }

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
