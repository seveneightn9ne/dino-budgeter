import * as _ from "lodash";
import * as React from "react";
import { Redirect, Route, RouteComponentProps, Switch } from "react-router";
import { Link, NavLink } from "react-router-dom";
import { AI, getAIs } from "../shared/ai";
import * as frames from "../shared/frames";
import Money from "../shared/Money";
import { getBalanceDelta } from "../shared/transactions";
import { Category, CategoryId, Frame as FrameType, FrameIndex, Friend, Transaction, TransactionId } from "../shared/types";
import Categories from "./categories";
import { DesktopOnly, MobileOnly } from "./components/media";
import Friends from "./friends";
import Transactions from "./transactions";
import TxEntry from "./txentry";
import * as util from "./util";

type FrameProps = RouteComponentProps<{month: string, year: string}>;
interface FrameState {
    initialized: boolean;
    me?: Friend;
    frame?: FrameType;
    budgeted?: Money;
    setIncome: string;
    setIncomeErr?: boolean;
    transactions?: Transaction[];
    invites?: Friend[];
    friends?: Friend[];
    pendingFriends?: Friend[];
    debts?: {[email: string]: Money};
    modal?: Transaction;
}

/** /app/:month/:year */
export default class Frame extends React.Component<FrameProps & RouteComponentProps<FrameProps>, FrameState> {

    state: FrameState = {
        initialized: false,
        setIncome: "",
    };

    month = (props = this.props) => Number(props.match.params.month) - 1;
    year = (props = this.props) =>  Number(props.match.params.year);
    monthName = () => util.MONTHS[this.month()];
    index = (props = this.props) => frames.index(this.month(props), this.year(props));
    newTxDate = () => {
      const newTxDate = new Date();
      if (newTxDate.getFullYear() != this.year() || newTxDate.getMonth() != this.month()) {
        // frame is not the current frame
        newTxDate.setFullYear(this.year());
        newTxDate.setMonth(this.month());
        newTxDate.setDate(1);
      }
      return newTxDate;
    }
    prevMonth = () => (this.month() - 1) % 12;
    prevYear = () => (this.prevMonth() == 11) ? this.year() - 1 : this.year();
    nextMonth = () => (this.month() + 1) % 12;
    nextYear = () => (this.nextMonth() == 0) ? this.year() + 1 : this.year();

    todayFrame(): FrameIndex {
        const today = new Date();
        return frames.index(today.getMonth(), today.getFullYear());
    }

    getAIs(): AI[] {
        if (!this.state.frame) {
            return [];
        }
        return getAIs(this.state.frame);
    }

    componentDidMount() {
        this.initializeFrame();
    }

    componentDidUpdate(prevProps: FrameProps) {
        if (prevProps.match.params.month != this.props.match.params.month ||
            prevProps.match.params.year != this.props.match.params.year) {
            this.initializeFrame();
        }
    }

    calculateBudgeted(categories: Category[]): Money {
        return categories.reduce((a, b) => a.plus(b.budget), Money.Zero);
    }

    // TODO update the frame in the background.

    initializeFrame(props = this.props): Promise<void> {
        const index = this.index(props);
        return util.initializeState(this, index, "frame", "transactions", "invites", "friends", "debts", "pendingFriends", "me").then(() => {
            this.setState({budgeted: this.calculateBudgeted(this.state.frame.categories)});
        });
    }

    onAddCategory(category: Category) {
        const newFrame = {...this.state.frame};
        const newCategories = [...this.state.frame.categories];
        newCategories.push(category);
        newFrame.categories = newCategories;
        this.setState({frame: newFrame});
    }

    onDeleteCategory(id: CategoryId) {
        const newFrame = {...this.state.frame};
        const newCategories = this.state.frame.categories.filter(c => c.id != id);
        newFrame.categories = newCategories;
        const budgeted = this.calculateBudgeted(newCategories);
        this.setState({frame: newFrame, budgeted});
    }

    onChangeCategory(newCategory: Category) {
        const newFrame = {...this.state.frame};
        const newCategories: Category[] = this.state.frame.categories.map(c => {
            if (c.id == newCategory.id) {
                return newCategory;
            } else {
                return c;
            }
        });
        newFrame.categories = newCategories;
        const budgeted = this.calculateBudgeted(newCategories);
        this.setState({frame: newFrame, budgeted});
    }

    onAddTransaction(t: Transaction) {
        const newFrame = {...this.state.frame};
        if (t.frame == this.state.frame.index) {
            newFrame.balance = this.state.frame.balance.minus(t.amount);
            newFrame.spending = this.state.frame.spending.plus(t.amount);
            newFrame.categories = newFrame.categories.map(c => {
                if (c.id == t.category) {
                    const newBalance = c.balance.minus(t.amount);
                    return {...c, balance: newBalance};
                }
                return c;
            });
        } else if (t.frame < this.state.frame.index) {
            newFrame.balance = this.state.frame.balance.minus(t.amount);
        }
        const transactions = [...this.state.transactions, t];
        const debts = {...this.state.debts};
        if (t.split) {
            const prevBalance = debts[t.split.with.email] || Money.Zero;
            debts[t.split.with.email] = prevBalance.plus(getBalanceDelta(this.state.me.uid, null, t));
        }
        this.setState({
            frame: newFrame,
            transactions, debts
        });
    }

    onUpdateTransaction(t: Transaction) {
        const oldTransaction = this.state.transactions.filter(otherT => otherT.id == t.id)[0];
        let newFrame = this.state.frame;
        if (oldTransaction.category != t.category) {
            const newCategories = this.state.frame.categories.map(c => {
                // Remove the old transaction amount from the old category
                if (c.id == oldTransaction.category) {
                    return {...c, balance: c.balance.plus(oldTransaction.amount)};
                }
                // Add the new transaction amount to the new category
                if (c.id == t.category) {
                    return {...c, balance: c.balance.minus(t.amount)};
                }
                return c;
            });
            newFrame = {...this.state.frame, categories: newCategories};
        } else if (t.category && oldTransaction.amount != t.amount) {
            // Update the category balance
            const newCategories = this.state.frame.categories.map(c => {
                if (c.id == t.category) {
                    return {...c, balance: c.balance.plus(oldTransaction.amount).minus(t.amount)};
                }
                return c;
            });
            newFrame = {...this.state.frame, categories: newCategories};
        }
        const transactions = this.state.transactions.map(otherT => {
            if (t.id == otherT.id) {
                return t;
            }
            return otherT;
        });
        const debts = {...this.state.debts};
        if (t.split) {
            const prevBalance = debts[t.split.with.email] || Money.Zero;
            debts[t.split.with.email] = prevBalance.plus(getBalanceDelta(this.state.me.uid, oldTransaction, t));
        }
        this.setState({transactions, frame: newFrame, debts, modal: undefined});
    }

    onDeleteTransaction(id: TransactionId) {
        const transaction = this.state.transactions.filter(otherT => otherT.id == id)[0];
        const transactions = this.state.transactions.filter(t => t.id != id);
        const frame = {...this.state.frame, categories:
            this.state.frame.categories.map(category => {
                if (transaction.category == category.id) {
                    return {...category, balance: category.balance.plus(transaction.amount)};
                }
                return category;
            })};
        const debts = {...this.state.debts};
        if (transaction.split) {
            const prevBalance = debts[transaction.split.with.email] || Money.Zero;
            debts[transaction.split.with.email] = prevBalance.plus(getBalanceDelta(this.state.me.uid, transaction, null));
            this.setState({debts});
        }
        this.setState({transactions, frame, debts, modal: undefined});
    }

    onChangeIncome(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({setIncome: event.target.value, setIncomeErr: false});
    }

    onSetIncome(event: React.FormEvent) {
        const setIncome = new Money(this.state.setIncome);
        if (!setIncome.isValid(false /* allowNegative */)) {
            this.setState({setIncomeErr: true});
            event.preventDefault();
            return;
        }
        util.apiPost({
            path: "/api/income",
            body: {
                frame: this.state.frame.index,
                income: setIncome,
            },
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            const newFrame = {...this.state.frame};
            newFrame.balance = frames.updateBalanceWithIncome(newFrame.balance, newFrame.income, setIncome);
            newFrame.income = setIncome;
            this.setState({frame: newFrame});
        });
        event.preventDefault();
    }

    onNewIncome(setIncome: Money) {
        const newFrame = {...this.state.frame};
        newFrame.balance = frames.updateBalanceWithIncome(newFrame.balance, newFrame.income, setIncome);
        newFrame.income = setIncome;
        this.setState({frame: newFrame});
    }

    onPayment = (email: string, amount: Money) => {
        const newDebt = this.state.debts[email].minus(amount);
        this.setState({debts: {...this.state.debts, [email]: newDebt}});
    }

    render() {
        if (!this.state.initialized) {
            return null;
        }

        if (this.state.modal) {
            return <div className="transactions editing">
                <h1>Edit Transaction <span className="close clickable fa-times fas" onClick={() => this.setState({modal: undefined})} /></h1>
                <TxEntry categories={this.state.frame.categories} friends={this.state.friends}
                    location={this.props.location} history={this.props.history}
                    transaction={this.state.modal} onUpdateTransaction={this.onUpdateTransaction.bind(this)}
                    onDeleteTransaction={(t: Transaction) => this.onDeleteTransaction(t.id)} />
            </div>;
        }

        if (this.state.frame.income.cmp(Money.Zero) == 0 && this.state.frame.index >= this.todayFrame()) {
            const className = this.state.setIncomeErr ? "error" : "";
            return <div className="splash">
                <p>What is your total expected income for {this.monthName()}?</p>
                <form onSubmit={this.onSetIncome.bind(this)}>
                    <input className={className} type="number" placeholder="0.00"
                        value={this.state.setIncome}
                        onChange={this.onChangeIncome.bind(this)} />
                    <input type="submit" value="Continue" />
                </form>
            </div>;
        }

        const categories = <Categories month={this.month()} year={this.year()}
            frame={this.state.frame}
            onAddCategory={this.onAddCategory.bind(this)}
            onChangeCategory={this.onChangeCategory.bind(this)}
            onDeleteCategory={this.onDeleteCategory.bind(this)}
            onNewIncome={this.onNewIncome.bind(this)} />;

        const appPrefix = `/app/${this.month() + 1}/${this.year()}`;

        const transactions = (this.state.transactions == undefined) ? null :
            <Transactions transactions={this.state.transactions}
                onUpdateTransaction={this.onUpdateTransaction.bind(this)}
                onDeleteTransaction={this.onDeleteTransaction.bind(this)}
                onAddTransaction={this.onAddTransaction.bind(this)}
                onEditTransaction={(t) => this.setState({modal: t})}
                month={this.month()} year={this.year()} frame={this.state.frame}
                newTxDate={this.newTxDate()} gid={this.state.frame.gid}
                categories={this.state.frame.categories}
                friends={this.state.friends}
                location={this.props.location} history={this.props.history} />;

        const debts = <Friends debts={this.state.debts} friends={this.state.friends}
            pendingFriends={this.state.pendingFriends} invites={this.state.invites} onPayment={this.onPayment}
            location={this.props.location} history={this.props.history} />;

        const prevButton = <Link to={`/app/${this.prevMonth() + 1}/${this.prevYear()}`} className="fa-chevron-left fas framenav" />;
        const nextButton = <Link to={`/app/${this.nextMonth() + 1}/${this.nextYear()}`} className="fa-chevron-right fas framenav" />;
        const inviteBadge = this.state.invites.length > 0 ? <span title="Friend Requests" className="badge">{this.state.invites.length}</span> : null;
        const nav = <DesktopOnly><nav>
            <NavLink to={`${appPrefix}/categories`} activeClassName="active">Categories</NavLink>
            <NavLink to={`${appPrefix}/transactions`} activeClassName="active">Transactions</NavLink>
            {this.state.friends.length > 0 || _.size(this.state.debts) > 0 ?
                <NavLink to={`${appPrefix}/debts`} activeClassName="active">Friends</NavLink>
            : null}
            <NavLink className="right" to={`/app/account`} activeClassName="active">Account{inviteBadge}</NavLink>
        </nav></DesktopOnly>;
        return <div>
            <header><div className="inner">
                <h1>{prevButton}{this.monthName() + " " + this.year()}{nextButton}</h1>
                {nav}
            </div></header>
            <main>
            <Switch>
                <Redirect exact from="/app/:month/:year" to="/app/:month/:year/categories" />
                <Route path={"/app/:month/:year/categories"} render={() => categories} />
                <Route path={"/app/:month/:year/transactions"} render={() => transactions} />
                <Route path={"/app/:month/:year/debts"} render={() => debts} />
                <Route path={"/app/add-transaction"} render={() => null} />
            </Switch>
            </main>
            <MobileOnly>
                <footer>
                    <Link to="/app/add-transaction" className="add-transaction-button">
                        <span className="fa-plus-circle fas icon" />
                    </Link>
                    <Link to={`${appPrefix}/categories`} className="link">Home</Link>
                    <Link to={`${appPrefix}/transactions`} className="link">Transactions</Link>
                    {this.state.friends.length > 0 || _.size(this.state.debts) > 0 ?
                        <Link to={`${appPrefix}/debts`} className="link">Friends</Link>
                    : null}
                </footer>
            </MobileOnly>
        </div>;
    }
}
