import React, { useState } from "react";
import { Link, Redirect, RouteComponentProps } from "react-router-dom";
import { CategoryBudget, CategoryName } from "../shared/api";
import * as categories from "../shared/categories";
import Money from "../shared/Money";
import { Category, CategoryId, Frame as FrameType, Transaction, TransactionId } from "../shared/types";
import { ClickToEditMoney, ClickToEditText } from "./components/clicktoedit";
import { Histogram } from "./components/histogram";
import { MobileQuery } from "./components/media";
import { ProgressBar } from "./components/progressbar";
import Transactions from "./transactions";

interface Props extends RouteComponentProps<{ month: string, year: string, id: string, name: string }> {
    frame: FrameType;
    transactions: Transaction[];
    categoryHistory: Array<{ budget: Money, spending: Money }>;
    onChangeCategory: (c: Category) => void;
    onDeleteCategory: (c: CategoryId) => void;
    onUpdateTransaction: (t: Transaction) => void;
    onDeleteTransaction: (id: TransactionId) => void;
}

/** shows the details page for a category */
const CategoryPage: React.SFC<Props> = (props) => {
    const [enableInteractivity, setEnableInteractivity] = useState(false);
    const [isFirstRender, setIsFirstRender] = useState(true);
    // Needed because changes to state should not trigger this
    if (isFirstRender) {
        setTimeout(() => {
            setEnableInteractivity(true);
        }, 500);

        setIsFirstRender(false);
    }

    const category = props.frame.categories.filter((c) => c.id === props.match.params.id)[0];
    const spending = category.balance.minus(category.budget).negate();

    if (props.match.params.name !== category.name) {
        const { month, year, id } = props.match.params;
        return <Redirect to={`/app/${month}/${year}/categories/${id}/${category.name}`} />;
    }

    return (<div>
        <h2>
            <Link
                to={`/app/${props.match.params.month}/${props.match.params.year}/categories`}
                className="fa-chevron-left fas catnav left-edge"
            />
            <ClickToEditText
                editable={enableInteractivity}
                size={40}
                api={CategoryName}
                value={category.name}
                // tslint:disable-next-line jsx-no-lambda
                onChange={(newName) => props.onChangeCategory({ ...category, name: newName })}
                postData={{
                    id: category.id,
                    frame: props.frame.index,
                }}
                postKey="name"
            />
        </h2>

        {/*
        <div className="blobs">
            <Blob title="Budgeted" amount={category.budget.formatted()} />
            <BlobOp op="-" />
            <Blob title="Spent" amount={spending.formatted()} />
            <BlobOp op="=" />
            <Blob title="Balance" amount={category.balance.formatted()} bold={true} />
        </div>
        */}

        <h3>Spending this month: {spending.formatted()} / <ClickToEditMoney
            size={6}
            api={CategoryBudget}
            value={category.budget}
            onChange={onUpdateBudget(props.onChangeCategory, category)}
            postData={{
                id: category.id,
                frame: category.frame,
            }}
            postKey="amount"
        /></h3>
        <ProgressBar
            amount={spending}
            total={category.budget}
            height={20}
            frame={props.frame.index}
            className="category-page-progress"
        />

        <h3>Spending history</h3>
        <MobileQuery desktop={histogramWithSize(props, 6)} mobile={histogramWithSize(props, 3)} />

        {props.transactions.length === 0 ? "There are no transactions this month." :
            <div>
                <h3>Transactions</h3>
                <Transactions
                    disableAdd={true}
                    disableEdit={!enableInteractivity}
                    frame={props.frame}
                    transactions={props.transactions}
                    categories={props.frame.categories}
                    onUpdateTransaction={props.onUpdateTransaction}
                    onDeleteTransaction={props.onDeleteTransaction}
                />
            </div>}
    </div>);
};

const histogramWithSize = (props: Props, s: number) => <Histogram
    month={Number(props.match.params.month) - 1}
    data={histogramData(props.categoryHistory, s)}
    height={200}
    className="category-page-histogram"
/>;

const histogramData = (h: Array<{ budget: Money, spending: Money }>, s: number) => {
    let data = h.slice(h.length - s);
    while (
        data.length > 1
        && data[0].budget.cmp(Money.Zero) === 0
        && data[0].spending.cmp(Money.Zero) === 0
    ) {
        data = data.slice(1);
    }
    return data;
}

const onUpdateBudget = (onChangeCategory: (c: Category) => void, category: Category) => (newBudget: Money) => {
    const newCategory = { ...category };
    newCategory.budget = newBudget;
    newCategory.balance = categories.updateBalanceWithBudget(
        category, newBudget);
    onChangeCategory(newCategory);
}

export default CategoryPage;
