import React, { useState } from "react";
import { Link, Redirect, RouteComponentProps } from "react-router-dom";
import { CategoryName } from "../shared/api";
import Money from "../shared/Money";
import { Category, CategoryId, Frame as FrameType, Transaction, TransactionId } from "../shared/types";
import { ClickToEditText } from "./components/clicktoedit";
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

    const histogramWithSize = (s: number) => <Histogram
        month={Number(props.match.params.month) - 1}
        data={props.categoryHistory.slice(props.categoryHistory.length - s)}
        height={200}
        className="category-page-histogram"
    />;

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

        <h3>Spending this month: {spending.formatted()} / {category.budget.formatted()}</h3>
        <ProgressBar
            amount={spending}
            total={category.budget}
            height={20}
            frame={props.frame.index}
            className="category-page-progress"
        />

        <h3>Spending history</h3>
        <MobileQuery desktop={histogramWithSize(6)} mobile={histogramWithSize(3)} />

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

export default CategoryPage;
