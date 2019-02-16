import * as React from "react";
import { Link, RouteComponentProps } from "react-router-dom";
import { AI, getAIs } from "../shared/ai";
import { ApiRequest, Income } from "../shared/api";
import * as frames from "../shared/frames";
import Money from "../shared/Money";
import { Category, CategoryId, Frame as FrameType } from "../shared/types";
import AIComponent from "./ai";
import CategoryRow from "./categoryrow";
import { Blob, BlobOp } from "./components/blob";
import { ClickToEditMoney } from "./components/clicktoedit";
import NewCategory from "./newcategory";

interface Props extends RouteComponentProps<{ month: number, year: number }> {
    month: number;
    year: number;
    frame: FrameType;
    onAddCategory: (c: Category) => void;
    onChangeCategory: (c: Category) => void;
    onDeleteCategory: (c: CategoryId) => void;
    onNewIncome: (newIncome: Money) => void;
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
            setIncome: "",
        };
    }

    public render() {
        const cs = this.props.frame.categories.map((c) => (
            <CategoryRow
                key={c.id}
                category={c}
                categories={this.props.frame.categories}
                match={this.props.match}
                budgetLeftover={frames.unbudgeted(this.props.frame)}
                onDeleteCategory={this.props.onDeleteCategory}
                onChangeCategory={this.props.onChangeCategory}
            />
        ));
        const ais = this.getAIs().map((ai) => <AIComponent ai={ai} key={ai.message()} />);
        // income - spent = balance;
        // spent = income - balance;
        const income = (
            <ClickToEditMoney<ApiRequest<typeof Income>, "income">
                api={Income}
                size={6}
                value={this.props.frame.income}
                onChange={this.props.onNewIncome}
                postData={{ frame: this.props.frame.index }}
                postKey="income"
            />);
        let rollover = null;
        const rolloverAmt = this.props.frame.balance.minus(this.props.frame.income).plus(this.props.frame.spending);
        switch (rolloverAmt.cmp(Money.Zero)) {
            case 1: {
                const amt = rolloverAmt.formatted();
                rollover = [
                    <BlobOp key="+" op="+" />,
                    <Blob key={amt} title="last month" amount={amt} />,
                ];
                break;
            }
            case -1: {
                const amt = rolloverAmt.negate().formatted();
                rollover = [
                    <BlobOp key="-" op="-" />,
                    <Blob key={amt} title="last month" amount={amt} />,
                ];
                break;
            }
        }

        const transactionLink = (
            <Link className="spent" to={`/app/${this.props.month + 1}/${this.props.year}/transactions`}>
                {this.props.frame.spending.formatted()}
            </Link>
        );

        return (
            <div>
                <div className="blobs">
                    <Blob title="Income" amount={income} />
                    {rollover}
                    <BlobOp op="-" />
                    <Blob title="Spent" amount={transactionLink} />
                    <BlobOp op="=" />
                    <Blob title="Balance" amount={this.props.frame.balance.formatted()} bold={true} />
                </div>
                {ais}
                <table className="categories" cellPadding={0} cellSpacing={0} ><tbody>
                    <tr>
                        <th />
                        <th className="stretch">Category</th>
                        <th className="progress-td" />
                        <th>Budget</th>
                        <th>Spending</th>
                        <th>Balance</th>
                    </tr>
                    <tr><td /><td colSpan={4}>
                        <NewCategory frame={this.props.frame.index} onAddCategory={this.props.onAddCategory} />
                    </td></tr>
                    {cs}
                </tbody></table></div>
        );
    }

    private getAIs(): AI[] {
        return getAIs(this.props.frame);
    }
}
