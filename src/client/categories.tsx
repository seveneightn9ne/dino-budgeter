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

    blob(title: string, amount: JSX.Element | string, bold = false){
        return <div className={'blob' + (bold ? ' bold' : '')}>
            <div className="title">{title}</div>
            <div className="amount">{amount}</div>
            </div>;
    }
    blobOp(operator: string) {
        return <div className="blob-op">{operator}</div>
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
        let rollover = null;
        const rolloverAmt = this.props.frame.balance.minus(this.props.frame.income).plus(this.props.frame.spending);
        switch (rolloverAmt.cmp(Money.Zero)) {
            case 1: 
                rollover = [this.blobOp('+'),this.blob("last month", rolloverAmt.formatted())];
                break;
            case -1:
                rollover = [this.blobOp('-'),this.blob("last month", rolloverAmt.negate().formatted())];
                break;
        }

        const transactionLink = <Link to={`/app/${this.props.month+1}/${this.props.year}/transactions`}>
            {this.props.frame.spending.formatted()}</Link>;
        
        return <div><div className="blobs">{this.blob("Income", income)}
                {rollover}
                {this.blobOp('-')}
                {this.blob('Spent', transactionLink)}
                {this.blobOp('=')}
                {this.blob('Balance', this.props.frame.balance.formatted(), true/**bold**/)}
                </div>
            {ais}
            <table className="categories" cellPadding={0} cellSpacing={0} ><tbody>
                <tr><th></th><th className="stretch">Category</th><th>Budget</th><th>Spending</th><th>Balance</th></tr>
                <tr><td></td><td colSpan={4}><NewCategory frame={this.props.frame.index} onAddCategory={this.props.onAddCategory} /></td></tr>
                {cs}
            </tbody></table></div>;
    }
}