import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Category, CategoryId, Money} from '../shared/types';
import TxEntry from './txentry'
import NewCategory from './newcategory';
import CategoryRow from './categoryrow';
import * as frames from '../shared/frames';
import * as util from './util';

type FrameProps = RouteComponentProps<{month: string, year: string}>;
interface FrameState {
    frame?: FrameType;
    budgeted?: Money;
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
      this.state = {};
    }

    componentDidMount() {
        this.initializeFrame();
    }

    calculateBudgeted(categories: Category[]): Money {
        return categories.reduce((a, b) => util.add(a, b.budget), "0");
    }

    // TODO update the frame in the background.

    initializeFrame(): Promise<FrameType> {
        const path = '/api/frame/' + this.month + '/' + this.year;
        return fetch(path).then((response) => {
            return response.json();
        }).then(response => {
            const frame = response as FrameType;
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
        this.setState({frame: newFrame});
    }

    onAddTransaction(amount: Money, cid: CategoryId) {
        const newFrame = {...this.state.frame};
        newFrame.balance = util.subtract(this.state.frame.balance, amount);
        newFrame.categories = newFrame.categories.map(c => {
            const newBalance = util.subtract(c.balance, amount);
            if (c.id == cid) {
                return {...c, balance: newBalance};
            }
            return c;
        });
        this.setState({
            frame: newFrame,
        });
    }

    render() {
        if (!this.state.frame) {
            return null;
        }
        const cs = this.state.frame.categories.map(c => 
            <CategoryRow key={c.id} category={c} 
                onDeleteCategory={this.onDeleteCategory.bind(this)}
                onChangeCategory={this.onChangeCategory.bind(this)} />
        );
        console.log(this.state.frame);
        return <div>
            <h1>{this.monthName + ' ' + this.year}</h1>
            <p><b>Balance: {util.formatMoney(this.state.frame.balance)}
                Income: {util.formatMoney(this.state.frame.income)}
                Budgeted: {util.formatMoney(this.state.budgeted)}</b></p>
            <NewCategory frame={this.state.frame.index} onAddCategory={this.onAddCategory.bind(this)} />
            <table><tbody>
                {cs}
            </tbody></table>
            <TxEntry frame={this.index} onAddTransaction={this.onAddTransaction.bind(this)}
                categories={this.state.frame.categories} />
        </div>;
    }
}