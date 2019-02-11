import * as _ from "lodash";
import * as React from "react";
import { getTransactionAIs } from "../shared/ai";
import { Category, CategoryId, Frame, Friend, GroupId, Transaction, TransactionId } from "../shared/types";
import AIComponent from "./ai";
import { ClickToEditDate, ClickToEditDropdown, ClickToEditMoney, ClickToEditText } from "./components/clicktoedit";
import { MobileQuery } from "./components/media";
import { ControlledPoplet } from "./components/poplet";
import SplitPoplet from "./splitpoplet";
import TxEntry from "./txentry";
import * as util from "./util";
import { DeleteTransaction, TransactionDate, TransactionDescription, TransactionCategory, TransactionAmount } from "../shared/api";

interface Props {
    month: number;
    year: number;
    frame: Frame;
    transactions: Transaction[];
    categories: Category[];
    friends: Friend[];
    newTxDate: Date;
    gid: GroupId;
    onUpdateTransaction: (txn: Transaction) => void;
    onDeleteTransaction: (id: TransactionId) => void;
    onAddTransaction: (txn: Transaction) => void;
}

type State = {
    popletOpen: boolean;
};

export default class Transactions extends React.Component<Props, State> {
    state = {
        popletOpen: false,
    }

    delete(id: TransactionId): boolean {
        util.apiFetch({
            api: DeleteTransaction,
            body: {id},
        }).then(() => {
            this.props.onDeleteTransaction(id);
        });
        return true;
    }

    categoryName(cid: CategoryId): string {
        return this.categoryMap().get(cid);
    }

    categoryMap(): Map<string, string> {
        const map = new Map();
        this.props.categories.forEach(c => {
            map.set(c.id, c.name);
        });
        return map;
    }

    onAddTransaction(t: Transaction) {
        this.props.onAddTransaction(t);
        this.closePoplet();
    }

    closePoplet = () => this.setState({popletOpen: false});
    openPoplet = () => this.setState({popletOpen: true});

    render() {
        const ais = getTransactionAIs(
            this.props.frame, this.props.transactions).map(ai =>
            <AIComponent ai={ai} key={ai.message()} />);

        const rowsDesktop = _.sortBy(this.props.transactions, ["date"]).reverse().map((tx) => <tr className="hoverable" key={tx.id}>
            <td className="del">
                <span className="deleteCr clickable fa-times fas" onClick={() => this.delete(tx.id)}></span>
            </td>
            <td className="date"><ClickToEditDate value={tx.date}
                api={TransactionDate}
                onChange={date =>
                    this.props.onUpdateTransaction({...tx, date})}
                postKey="date"
                postData={{id: tx.id}}
            /></td>
            <td className="stretch"><ClickToEditText
                api={TransactionDescription}
                value={tx.description}
                size={20}
                onChange={description =>
                    this.props.onUpdateTransaction({...tx, description})}
                postKey="description"
                postData={{id: tx.id}}
            /></td>
            <td className={tx.category ? "category" : "category highlighted"}>
            <ClickToEditDropdown
                api={TransactionCategory}
                value={tx.category || ""}
                zeroValue="Uncategorized"
                values={this.categoryMap()}
                onChange={cid => this.props.onUpdateTransaction({...tx, category: cid})}
                postKey="category"
                postData={{id: tx.id}}
            /></td>
            <td className="amount">{tx.split ? tx.amount.formatted() :
                <ClickToEditMoney
                    api={TransactionAmount}
                    value={tx.amount}
                    onChange={amount =>
                        this.props.onUpdateTransaction({...tx, amount})}
                    postKey="amount"
                    postData={{id: tx.id}}
            />}</td>
            <td className="split">
                {tx.split ? <SplitPoplet transaction={tx} onUpdateTransaction={this.props.onUpdateTransaction} /> : null}
            </td></tr>);

        const rowsMobile = _.sortBy(this.props.transactions, ["date"]).reverse().map((tx) =>
            <MobileTransactionRow key={tx.id} tx={tx} onUpdateTransaction={this.props.onUpdateTransaction}
                onDeleteTransaction={this.props.onDeleteTransaction} categories={this.props.categories}
                friends={this.props.friends} categoryName={this.categoryName.bind(this)} />);

        return <div className="transactions">
            {ais}
            <MobileQuery desktop={
                <table><tbody>
                    <tr><th></th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr>
                    <tr><td></td><td colSpan={5}>
                    <ControlledPoplet open={this.state.popletOpen} onRequestClose={this.closePoplet} onRequestOpen={this.openPoplet}
                        text={<span><span className="fa-plus-circle fas"></span> Transaction</span>}>
                        <TxEntry onAddTransaction={this.onAddTransaction.bind(this)} defaultDate={this.props.newTxDate}
                            categories={this.props.categories} friends={this.props.friends} />
                    </ControlledPoplet></td></tr>
                    {rowsDesktop}
                </tbody></table>
            } mobile={rowsMobile} />
        </div>;
    }
}

interface MobileRowProps {
    tx: Transaction;
    categories: Category[];
    friends: Friend[];
    onUpdateTransaction: (tx: Transaction) => void;
    onDeleteTransaction: (tid: TransactionId) => void;
    categoryName: (cid: CategoryId) => string;
}
class MobileTransactionRow extends React.PureComponent<MobileRowProps, {open: boolean}> {
    state = {open: false};
    open = () => this.setState({open: true});
    close = () => this.setState({open: false});

    onSave = (tx: Transaction) => {
        this.setState({open: false});
        this.props.onUpdateTransaction(tx);
    }
    render() {
        const tx = this.props.tx;
        const monthName = util.MONTHS[tx.date.getMonth()].substr(0, 3);
        const row = <div key={tx.id} className="hoverable tx-mobile-row">
            <div className="tx-mobile-date">
                <div className="tx-mobile-month">{monthName}</div>
                <div className="tx-mobile-day">{tx.date.getDate()}</div>
            </div>
            <div className="tx-mobile-stretch">
                <div className="tx-mobile-category">{this.props.categoryName(tx.category) || <span className="highlighted">Uncategorized</span>}</div>
                <div className="tx-mobile-desc">{tx.description}</div>
            </div>
            <div className="tx-mobile-right">
                {tx.split ? <span className="fas fa-user-friends" /> : null}
                <span className="tx-mobile-amount">{tx.amount.formatted()}</span>
            </div>
        </div>;
        return <ControlledPoplet text={row} clickable={false} open={this.state.open} onRequestClose={this.close} onRequestOpen={this.open}>
            <div className="transactions editing">
                <h2>Edit Transaction</h2>
                <TxEntry categories={this.props.categories} friends={this.props.friends}
                    transaction={this.props.tx} onUpdateTransaction={this.onSave}
                    onDeleteTransaction={(t: Transaction) => this.props.onDeleteTransaction(t.id)} />
            </div>
        </ControlledPoplet>
    }
}
