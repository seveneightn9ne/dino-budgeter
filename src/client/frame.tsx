import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import { Link } from 'react-router-dom'
import {Frame as FrameType, Category, CategoryId, Money} from '../shared/types';
import TxEntry from './txentry'
import NewCategory from './newcategory';
import CategoryRow from './categoryrow';
import * as frames from '../shared/frames';
import * as util from './util';
import { AI, getAIs } from '../shared/ai';
import AIComponent from './ai';
import ClickToEdit from './components/clicktoedit';

type FrameProps = RouteComponentProps<{month: string, year: string}>;
interface FrameState {
    frame?: FrameType;
    budgeted?: Money;
    setIncome: string;
    setIncomeErr?: boolean;
}

/** /app/:month/:year */
export default class Frame extends React.Component<FrameProps, FrameState> {
    private month: number;
    private year: number;
    private monthName: string;
    private index: number;

    constructor(props: FrameProps) {
      super(props);
      this.month = Number(props.match.params.month) - 1;
      this.year = Number(props.match.params.year);
      this.monthName = util.MONTHS[this.month];
      this.index = frames.index(this.month, this.year);
      this.state = {setIncome: ''};
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

    calculateBudgeted(categories: Category[]): Money {
        return categories.reduce((a, b) => a.plus(b.budget), Money.Zero);
    }

    // TODO update the frame in the background.

    initializeFrame(): Promise<FrameType> {
        const path = '/api/frame/' + this.month + '/' + this.year;
        return fetch(path).then((response) => {
            return response.json();
        }).then(response => {
            const frame = frames.fromSerialized(response);
            const budgeted = this.calculateBudgeted(frame.categories);
            this.setState({frame, budgeted});
            return frame;
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
        this.setState({frame: newFrame});
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

    onAddTransaction(amount: Money, cid: CategoryId) {
        const newFrame = {...this.state.frame};
        newFrame.balance = this.state.frame.balance.minus(amount);
        newFrame.categories = newFrame.categories.map(c => {
            const newBalance = c.balance.minus(amount);
            if (c.id == cid) {
                return {...c, balance: newBalance};
            }
            return c;
        });
        this.setState({
            frame: newFrame,
        });
    }

    onChangeIncome(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({setIncome: event.target.value, setIncomeErr: false});
    }

    onSetIncome(event: React.FormEvent) {
        const setIncome = new Money(this.state.setIncome);
        if (!setIncome.isValid(false /** allowNegative **/)) {
            this.setState({setIncomeErr: true});
            event.preventDefault();
            return;
        }
        fetch('/api/income', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                frame: this.state.frame.index,
                income: setIncome,
            }),
        }).then(() => {
            const newFrame = {...this.state.frame};
            newFrame.balance = frames.updateBalanceWithIncome(newFrame.balance, newFrame.income, setIncome);
            newFrame.income = setIncome;
            this.setState({frame: newFrame});
        });
        event.preventDefault();
    }

    onNewIncome(newIncomeStr: string) {
        const setIncome = new Money(newIncomeStr);
        const newFrame = {...this.state.frame};
        newFrame.balance = frames.updateBalanceWithIncome(newFrame.balance, newFrame.income, setIncome);
        newFrame.income = setIncome;
        this.setState({frame: newFrame});
    }

    render() {
        if (!this.state.frame) {
            return null;
        }

        console.log(this.state.frame);

        if (this.state.frame.income.cmp(Money.Zero) == 0) {
            const className = this.state.setIncomeErr ? "error" : "";
            return <div className="splash">
                <p>What is your total expected income for {this.monthName}?</p>
                <form onSubmit={this.onSetIncome.bind(this)}>
                    <input className={className} type="number" placeholder="0.00"
                        value={this.state.setIncome} 
                        onChange={this.onChangeIncome.bind(this)} />
                    <input type="submit" value="Continue" />
                </form>
            </div>;
        }

        const cs = this.state.frame.categories.map(c => 
            <CategoryRow key={c.id} category={c} 
                onDeleteCategory={this.onDeleteCategory.bind(this)}
                onChangeCategory={this.onChangeCategory.bind(this)} />
        );
        const ais = this.getAIs().map(ai => <AIComponent ai={ai} key={ai.message()} />);
        // income - spent = balance;
        // spent = income - balance;
        const income = <ClickToEdit
            value={this.state.frame.income.string()}
            formatDisplay={(s) => new Money(s).formatted()}
            validateChange={(s) => new Money(s).isValid()}
            onChange={this.onNewIncome.bind(this)}
            postTo="/api/income"
            postData={{frame: this.state.frame.index}}
            postKey="income"
        />;
        return <div>
            <h1>{this.monthName + ' ' + this.year}</h1>
            <div><b>Income: {income}
                {' - '} <Link to={`/app/transactions/${this.month+1}/${this.year}`}>
                    Spent: {this.state.frame.income.minus(this.state.frame.balance).formatted()}
                </Link>
                {' = '} Balance: {this.state.frame.balance.formatted()}</b></div>
            {ais}
            <NewCategory frame={this.state.frame.index} onAddCategory={this.onAddCategory.bind(this)} />
            <table><tbody>
                {cs}
            </tbody></table>
            <TxEntry frame={this.index} onAddTransaction={this.onAddTransaction.bind(this)}
                categories={this.state.frame.categories} />
        </div>;
    }
}