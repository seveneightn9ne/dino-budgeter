import _ from "lodash";
import * as React from "react";
import { Redirect, Route, RouteComponentProps, Switch } from "react-router";
import { Link, NavLink } from "react-router-dom";
import { AI, getAIs } from "../shared/ai";
import { Income } from "../shared/api";
import * as frames from "../shared/frames";
import Money from "../shared/Money";
import { getBalanceDelta } from "../shared/transactions";
import {
  Category,
  CategoryId,
  Charge,
  FrameIndex,
  InitState,
  Payment,
  Transaction,
  TransactionId,
} from "../shared/types";
import Categories from "./categories";
import CategoryPage from "./category";
import { DesktopOnly, MobileOnly, MobileQuery } from "./components/media";
import { ControlledPoplet } from "./components/poplet";
import Friends from "./friends";
import Transactions from "./transactions";
import TxEntry from "./txentry";
import * as util from "./util";

type FrameProps = RouteComponentProps<{ month: string; year: string }>;
interface FrameState extends InitState {
  initialized: boolean;
  budgeted?: Money;
  setIncome: string;
  setIncomeErr?: boolean;
  addTxnOpen: boolean;
}

/** /app/:month/:year */
export default class Frame extends React.Component<FrameProps, FrameState> {
  public state: FrameState = {
    initialized: false,
    setIncome: "",
    addTxnOpen: false,
  };

  public month = (props = this.props) => Number(props.match.params.month) - 1;
  public year = (props = this.props) => Number(props.match.params.year);
  public monthName = () => util.MONTHS[this.month()];
  public index = (props = this.props) =>
    frames.index(this.month(props), this.year(props))
  public newTxDate = () => {
    const newTxDate = new Date();
    if (
      newTxDate.getFullYear() != this.year() ||
      newTxDate.getMonth() != this.month()
    ) {
      // frame is not the current frame
      newTxDate.setFullYear(this.year());
      newTxDate.setMonth(this.month());
      newTxDate.setDate(1);
    }
    return newTxDate;
  }
  public prevMonth = () => (this.month() === 0 ? 11 : this.month() - 1);
  public prevYear = () =>
    this.prevMonth() == 11 ? this.year() - 1 : this.year()
  public nextMonth = () => (this.month() === 11 ? 0 : this.month() + 1);
  public nextYear = () =>
    this.nextMonth() == 0 ? this.year() + 1 : this.year()

  public todayFrame(): FrameIndex {
    const today = new Date();
    return frames.index(today.getMonth(), today.getFullYear());
  }

  public getAIs(): AI[] {
    if (!this.state.frame) {
      return [];
    }
    return getAIs(this.state.frame);
  }

  public componentDidMount() {
    if (this.props.location.pathname.endsWith("add-transaction")) {
      this.setState({ addTxnOpen: true });
    }
    this.initializeFrame();
  }

  public componentDidUpdate(prevProps: FrameProps) {
    if (
      prevProps.match.params.month != this.props.match.params.month ||
      prevProps.match.params.year != this.props.match.params.year
    ) {
      this.initializeFrame();
    }
    if (
      prevProps.location.pathname !== this.props.location.pathname &&
      this.props.location.pathname.endsWith("add-transaction")
      /*&& !this.state.addTxnOpen*/
    ) {
      this.setState({ addTxnOpen: true });
    }
  }

  private openAddTxn = () => this.setState({ addTxnOpen: true });
  private closeAddTxn = () => {
    this.setState({ addTxnOpen: false });
  }

  public calculateBudgeted(categories: Category[]): Money {
    return categories.reduce((a, b) => a.plus(b.budget), Money.Zero);
  }

  // TODO update the frame in the background.

  public initializeFrame(props = this.props): Promise<void> {
    const index = this.index(props);
    return util
      .initializeState(
        this,
        index,
        "frame",
        "transactions",
        "invites",
        "friends",
        "debts",
        "pendingFriends",
        "me",
        "history",
      )
      .then(() => {
        this.setState({
          budgeted: this.calculateBudgeted(this.state.frame.categories),
        });
      });
  }

  public onAddCategory(category: Category) {
    const newFrame = { ...this.state.frame };
    const newCategories = [...this.state.frame.categories];
    newCategories.push(category);
    newFrame.categories = newCategories;
    this.setState({ frame: newFrame });
  }

  public onDeleteCategory(id: CategoryId) {
    const newFrame = { ...this.state.frame };
    const newCategories = this.state.frame.categories.filter((c) => c.id != id);
    newFrame.categories = newCategories;
    const budgeted = this.calculateBudgeted(newCategories);
    this.setState({ frame: newFrame, budgeted });
  }

  public onChangeCategory(newCategory: Category) {
    this.setState(({ frame, history }) => {
      const newFrame = { ...frame };
      const newCategories: Category[] = frame.categories.map((c) => {
        if (c.id === newCategory.id) {
          return newCategory;
        } else {
          return c;
        }
      });
      newFrame.categories = newCategories;
      const budgeted = this.calculateBudgeted(newCategories);
      const newHistory = this.newCategoryHistory(
        history,
        newCategory.id,
        null,
        newCategory.budget,
      );
      return { frame: newFrame, budgeted, history: newHistory };
    });
  }

  private categoryHistorySpending = (
    history: { [c: string]: Array<{ budget: Money; spending: Money }> },
    cid: CategoryId,
  ) => {
    return history[cid][history[cid].length - 1].spending;
  }

  private newCategoryHistory = (
    history: { [c: string]: Array<{ budget: Money; spending: Money }> },
    cid: CategoryId,
    spending: Money | null,
    budget: Money | null,
  ) => {
    const newHistory = { ...history };
    newHistory[cid] = [...history[cid]];
    const prev = newHistory[cid][newHistory[cid].length - 1];
    newHistory[cid][newHistory[cid].length - 1] = {
      spending: spending || prev.spending,
      budget: budget || prev.budget,
    };
    return newHistory;
  }

  private onAddTransaction = (t: Transaction) => {
    this.setState(({ frame, debts, transactions, me, history }) => {
      const newFrame = { ...frame };
      let newHistory = history;
      if (t.frame === frame.index) {
        newFrame.balance = frame.balance.minus(t.amount);
        newFrame.spending = frame.spending.plus(t.amount);
        newFrame.categories = newFrame.categories.map((c) => {
          if (c.id === t.category) {
            const newBalance = c.balance.minus(t.amount);
            const newSpending = this.categoryHistorySpending(
              history,
              c.id,
            ).plus(t.amount);
            newHistory = this.newCategoryHistory(
              history,
              c.id,
              newSpending,
              null,
            );
            return { ...c, balance: newBalance };
          }
          return c;
        });
      } else if (t.frame < frame.index) {
        newFrame.balance = frame.balance.minus(t.amount);
      }
      if (t.category && t.frame + 6 >= frame.index) {
        // needs to update in the history
        const newCatHistory = [...history[t.category]];
        const index = this.historyIndex(newCatHistory, frame.index, t.frame);
        newCatHistory[index] = {
          budget: newCatHistory[index].budget,
          spending: newCatHistory[index].spending.plus(t.amount),
        };
        newHistory[t.category] = newCatHistory;
      }
      const newTransactions = [...transactions, t];
      const newDebts = { ...debts };
      if (t.split) {
        const prevBalance = debts[t.split.with.email].balance || Money.Zero;
        debts[t.split.with.email] = {
          balance: prevBalance.plus(getBalanceDelta(me.uid, null, t)),
          payments: debts[t.split.with.email].payments,
        };
      }
      return {
        frame: newFrame,
        transactions: newTransactions,
        debts: newDebts,
        history: newHistory,
        addTxnOpen: false,
      };
    });
  }

  private historyIndex = (
    history: any[],
    current: FrameIndex,
    target: FrameIndex,
  ) => {
    const frameIndexDelta = current - target;
    return history.length - 1 - frameIndexDelta;
  }

  private onUpdateTransaction(t: Transaction) {
    this.setState(({ transactions, frame, me, debts, history }) => {
      const oldTransaction = transactions.filter(
        (otherT) => otherT.id === t.id,
      )[0];
      let newFrame = frame;
      let newTransactions = transactions;
      const newHistory = { ...history };
      if (t.frame === frame.index) {
        if (oldTransaction.category !== t.category) {
          const newCategories = frame.categories.map((c) => {
            // Remove the old transaction amount from the old category
            if (c.id === oldTransaction.category) {
              return { ...c, balance: c.balance.plus(oldTransaction.amount) };
            }
            // Add the new transaction amount to the new category
            if (c.id === t.category) {
              return { ...c, balance: c.balance.minus(t.amount) };
            }
            return c;
          });
          newFrame = { ...frame, categories: newCategories };
        } else if (t.category && oldTransaction.amount.cmp(t.amount) !== 0) {
          // Update the category balance
          const newCategories = frame.categories.map((c) => {
            if (c.id === t.category) {
              return {
                ...c,
                balance: c.balance.plus(oldTransaction.amount).minus(t.amount),
              };
            }
            return c;
          });
          newFrame = { ...frame, categories: newCategories };
        }
        newTransactions = transactions.map((otherT) => {
          if (t.id === otherT.id) {
            return t;
          }
          return otherT;
        });
      }
      if (oldTransaction.category) {
        // Remove from old category's history
        const newCatHistory = [...newHistory[oldTransaction.category]];
        const index = this.historyIndex(
          newCatHistory,
          frame.index,
          oldTransaction.frame,
        );
        newCatHistory[index] = {
          budget: newCatHistory[index].budget,
          spending: newCatHistory[index].spending.minus(oldTransaction.amount),
        };
        newHistory[oldTransaction.category] = newCatHistory;
      }
      if (t.category) {
        // Add to new category's history
        const newCatHistory = [...newHistory[t.category]];
        const index = this.historyIndex(newCatHistory, frame.index, t.frame);
        newCatHistory[index] = {
          budget: newCatHistory[index].budget,
          spending: newCatHistory[index].spending.plus(t.amount),
        };
        newHistory[t.category] = newCatHistory;
      }
      const newDebts = { ...debts };
      if (t.split) {
        const prevBalance = debts[t.split.with.email].balance || Money.Zero;
        debts[t.split.with.email] = {
          balance: prevBalance.plus(getBalanceDelta(me.uid, oldTransaction, t)),
          payments: debts[t.split.with.email].payments,
        };
      }
      return {
        transactions: newTransactions,
        frame: newFrame,
        debts: newDebts,
        history: newHistory,
      };
    });
  }

  // Note: you can only delete a transaction that's for the current frame.
  public onDeleteTransaction(id: TransactionId) {
    this.setState(({ transactions, frame, debts, history, me }) => {
      const transaction = transactions.filter((otherT) => otherT.id == id)[0];
      const newTransactions = transactions.filter((t) => t.id != id);
      const newFrame = {
        ...frame,
        categories: frame.categories.map((category) => {
          if (transaction.category == category.id) {
            return {
              ...category,
              balance: category.balance.plus(transaction.amount),
            };
          }
          return category;
        }),
      };
      const newDebts = { ...debts };

      const newHistory = transaction.category
        ? this.newCategoryHistory(
            history,
            transaction.category,
            this.categoryHistorySpending(history, transaction.category).minus(
              transaction.amount,
            ),
            null,
          )
        : history;
      if (transaction.split) {
        const prevBalance =
          debts[transaction.split.with.email].balance || Money.Zero;
        newDebts[transaction.split.with.email] = {
          balance: prevBalance.plus(getBalanceDelta(me.uid, transaction, null)),
          payments: debts[transaction.split.with.email].payments,
        };
      }
      return {
        transactions: newTransactions,
        frame: newFrame,
        debts: newDebts,
        history: newHistory,
      };
    });
  }

  public onChangeIncome(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ setIncome: event.target.value, setIncomeErr: false });
  }

  public onSetIncome(event: React.FormEvent) {
    const setIncome = new Money(this.state.setIncome);
    if (!setIncome.isValid(false /* allowNegative */)) {
      this.setState({ setIncomeErr: true });
      event.preventDefault();
      return;
    }
    util
      .apiFetch({
        api: Income,
        body: {
          frame: this.state.frame.index,
          income: setIncome,
        },
      })
      .then(() => {
        const newFrame = { ...this.state.frame };
        newFrame.balance = frames.updateBalanceWithIncome(
          newFrame.balance,
          newFrame.income,
          setIncome,
        );
        newFrame.income = setIncome;
        this.setState({ frame: newFrame });
      });
    event.preventDefault();
  }

  public onNewIncome(setIncome: Money) {
    const newFrame = { ...this.state.frame };
    newFrame.balance = frames.updateBalanceWithIncome(
      newFrame.balance,
      newFrame.income,
      setIncome,
    );
    newFrame.income = setIncome;
    this.setState({ frame: newFrame });
  }

  public onPayment = (email: string, pmt: Charge | Payment) => {
    let diffToBalance = pmt.amount.plus(Money.Zero); // why + 0?
    // If I charge you, you owe me more. balance (I owe you) decreases
    // If I pay you, I owe you less. balance (I owe you) decreases
    if (
      (pmt.type == "charge" && pmt.debtor !== this.state.me.uid) ||
      (pmt.type == "payment" && pmt.payer !== this.state.me.uid)
    ) {
      diffToBalance = diffToBalance.negate();
    }
    // Because it should decrease, we use minus
    const newBalance = this.state.debts[email].balance.minus(diffToBalance);
    const newPayments = [pmt, ...this.state.debts[email].payments];
    this.setState({
      debts: {
        ...this.state.debts,
        [email]: { balance: newBalance, payments: newPayments },
      },
    });
  }

  public linkToMonth = (month: number, year: number, className: string) => {
    const prefixLink = `/app/${month + 1}/${year}`;
    return (
      <Route
        path="/app/:month/:year"
        // tslint:disable jsx-no-lambda
        render={(props) => {
          const suffix = props.location.pathname
            .split("/")
            .slice(4)
            .join("/");
          return <Link to={`${prefixLink}/${suffix}`} className={className} />;
        }}
      />
    );
  }

  public render() {
    if (!this.state.initialized) {
      return null;
    }

    if (
      this.state.frame.income.cmp(Money.Zero) == 0 &&
      this.state.frame.index >= this.todayFrame()
    ) {
      const className = this.state.setIncomeErr ? "error" : "";
      return (
        <div className="splash">
          <p>What is your total expected income for {this.monthName()}?</p>
          <form onSubmit={this.onSetIncome.bind(this)}>
            <input
              className={className}
              type="number"
              placeholder="0.00"
              value={this.state.setIncome}
              onChange={this.onChangeIncome.bind(this)}
            />
            <input type="submit" value="Continue" />
          </form>
        </div>
      );
    }

    const appPrefix = `/app/${this.month() + 1}/${this.year()}`;

    const transactions =
      this.state.transactions == undefined ? null : (
        <Transactions
          transactions={this.state.transactions}
          onUpdateTransaction={this.onUpdateTransaction.bind(this)}
          onDeleteTransaction={this.onDeleteTransaction.bind(this)}
          onAddTransaction={this.onAddTransaction}
          frame={this.state.frame}
          newTxDate={this.newTxDate()}
          categories={this.state.frame.categories}
          friends={this.state.friends}
        />
      );

    const debts = (
      <Friends
        debts={this.state.debts}
        friends={this.state.friends}
        me={this.state.me}
        index={this.index()}
        pendingFriends={this.state.pendingFriends}
        invites={this.state.invites}
        onPayment={this.onPayment}
      />
    );

    const prevButton = this.linkToMonth(
      this.prevMonth(),
      this.prevYear(),
      "fa-chevron-left fas framenav",
    );
    const nextButton = this.linkToMonth(
      this.nextMonth(),
      this.nextYear(),
      "fa-chevron-right fas framenav",
    );
    const inviteBadge =
      this.state.invites.length > 0 ? (
        <span title="Friend Requests" className="badge">
          {this.state.invites.length}
        </span>
      ) : null;
    const nav = (
      <DesktopOnly>
        <nav>
          <NavLink to={`${appPrefix}/categories`} activeClassName="active">
            Categories
          </NavLink>
          <NavLink to={`${appPrefix}/transactions`} activeClassName="active">
            Transactions
          </NavLink>
          {this.state.friends.length > 0 || _.size(this.state.debts) > 0 ? (
            <NavLink to={`${appPrefix}/debts`} activeClassName="active">
              Friends
            </NavLink>
          ) : null}
          <NavLink
            className="right"
            to={`/app/account`}
            activeClassName="active"
          >
            Account{inviteBadge}
          </NavLink>
        </nav>
      </DesktopOnly>
    );
    return (
      <div>
        <header>
          <div className="inner">
            <h1>
              {prevButton}
              <Link to={appPrefix} className="title">
                {this.monthName() + " " + this.year()}
              </Link>
              {nextButton}
            </h1>
            {nav}
          </div>
        </header>
        <main>
          <Switch>
            <Route path={"/app/:month/:year/categories"}>
              <Switch>
                <Route
                  path={"/app/:month/:year/categories/:id/:name"}
                  // tslint:disable jsx-no-lambda
                  render={(props) => (
                    <CategoryPage
                      frame={this.state.frame}
                      transactions={this.state.transactions.filter(
                        (t) => t.category === props.match.params.id,
                      )}
                      categoryHistory={
                        this.state.history[props.match.params.id]
                      }
                      onChangeCategory={this.onChangeCategory.bind(this)}
                      onDeleteCategory={this.onDeleteCategory.bind(this)}
                      onUpdateTransaction={this.onUpdateTransaction.bind(this)}
                      onDeleteTransaction={this.onDeleteTransaction.bind(this)}
                      {...props}
                    />
                  )}
                />
                <Route
                  render={(props) => (
                    <Categories
                      {...props}
                      month={this.month()}
                      year={this.year()}
                      frame={this.state.frame}
                      onAddCategory={this.onAddCategory.bind(this)}
                      onChangeCategory={this.onChangeCategory.bind(this)}
                      onDeleteCategory={this.onDeleteCategory.bind(this)}
                      onNewIncome={this.onNewIncome.bind(this)}
                    />
                  )}
                />
              </Switch>
            </Route>
            <Route
              path={"/app/:month/:year/transactions"}
              render={() => transactions}
            />
            <Route path={"/app/:month/:year/debts"} render={() => debts} />

            <Route
              exact={true}
              from="/app/:month/:year"
              render={() => (
                <MobileQuery
                  mobile={
                    <Switch>
                      <Redirect
                        from={"/app/:month/:year"}
                        to={"/app/:month/:year/transactions/add-transaction"}
                      />
                    </Switch>
                  }
                  desktop={
                    <Switch>
                      <Redirect
                        from={"/app/:month/:year"}
                        to={"/app/:month/:year/categories"}
                      />
                    </Switch>
                  }
                />
              )}
            />
            <Route path={"/app/add-transaction"} render={() => null} />
          </Switch>
        </main>
        <MobileOnly>
          <footer>
            <ControlledPoplet
              open={this.state.addTxnOpen}
              onRequestClose={this.closeAddTxn}
              onRequestOpen={this.openAddTxn}
              className="add-transaction-button"
              text={<span className="fa-plus-circle fas icon" />}
            >
              <h2>Add Transaction</h2>
              <TxEntry
                onAddTransaction={this.onAddTransaction}
                defaultDate={this.newTxDate()}
                friends={this.state.friends || []}
                categories={this.state.frame.categories || []}
              />
            </ControlledPoplet>
            <Link to={`${appPrefix}/categories`} className="link">
              Home
            </Link>
            <Link to={`${appPrefix}/transactions`} className="link">
              Transactions
            </Link>
            {this.state.friends.length > 0 || _.size(this.state.debts) > 0 ? (
              <Link to={`${appPrefix}/debts`} className="link">
                Friends
              </Link>
            ) : null}
          </footer>
        </MobileOnly>
      </div>
    );
  }
}
