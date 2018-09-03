import * as React from 'react';
import { Link } from 'react-router-dom'
import {Frame as FrameType, Category, CategoryId, Money} from '../shared/types';
import NewCategory from './newcategory';
import CategoryRow from './categoryrow';
import { AI, getAIs } from '../shared/ai';
import AIComponent from './ai';
import {ClickToEditMoney} from './components/clicktoedit';

interface Props {
    month: number;
    year: number;
    frame: FrameType;
    onAddCategory: (c: Category) => void,
    onChangeCategory: (c: Category) => void,
    onDeleteCategory: (c: CategoryId) => void,
    onNewIncome: (newIncome: Money) => void,
}
interface State {
    budgeted?: Money;
    setIncome: string;
    setIncomeErr?: boolean;
}

/** shows the categories list on the home page */
export default class Categories extends React.Component<Props, State> {

    constructor(props: Props) {
      super(props);
      this.state = {
          setIncome: '',
      }
    }

    getAIs(): AI[] {
        return getAIs(this.props.frame);
    }

    calculateBudgeted(categories: Category[]): Money {
        return categories.reduce((a, b) => a.plus(b.budget), Money.Zero);
    }

    render() {
        const cs = this.props.frame.categories.map(c => 
            <CategoryRow key={c.id} category={c} 
                onDeleteCategory={this.props.onDeleteCategory}
                onChangeCategory={this.props.onChangeCategory} />
        );
        const ais = this.getAIs().map(ai => <AIComponent ai={ai} key={ai.message()} />);
        // income - spent = balance;
        // spent = income - balance;
        const income = <ClickToEditMoney
            value={this.props.frame.income}
            onChange={this.props.onNewIncome}
            postTo="/api/income"
            postData={{frame: this.props.frame.index}}
            postKey="income"
        />;
        return <div><div><b>Income: {income}
                {' - '} <Link to={`/app/${this.props.month+1}/${this.props.year}/transactions`}>
                    Spent: {this.props.frame.income.minus(this.props.frame.balance).formatted()}
                </Link>
                {' = '} Balance: {this.props.frame.balance.formatted()}</b></div>
            {ais}
            <NewCategory frame={this.props.frame.index} onAddCategory={this.props.onAddCategory} />
            <table><tbody>
                {cs}
            </tbody></table></div>;
    }
}