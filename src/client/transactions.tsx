import _ from "lodash";
import * as React from "react";
import { getTransactionAIs } from "../shared/ai";
import {
  DeleteTransaction,
  TransactionAmount,
  TransactionCategory,
  TransactionDate,
  TransactionDescription,
} from "../shared/api";
import Money from "../shared/Money";
import {
  Category,
  CategoryId,
  Frame,
  Friend,
  Transaction,
  TransactionId,
} from "../shared/types";
import AIComponent from "./ai";
import {
  ClickToEditDate,
  ClickToEditDropdown,
  ClickToEditMoney,
  ClickToEditText,
} from "./components/clicktoedit";
import { MobileQuery } from "./components/media";
import { ControlledPoplet } from "./components/poplet";
import SplitPoplet from "./splitpoplet";
import TxEntry from "./txentry";
import * as util from "./util";

interface BaseProps {
  frame: Frame;
  transactions: Transaction[];
  categories: Category[];
  newTxn?: TransactionId;
  onUpdateTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: TransactionId) => void;
}

interface PropsForPage extends BaseProps {
  newTxDate: Date;
  friends: Friend[];
  onAddTransaction: (txn: Transaction) => void;
}

interface PropsForCategory extends BaseProps {
  disableAdd: true;
  disableEdit: boolean;
}

type Props = PropsForPage | PropsForCategory;

interface State {
  popletOpen: boolean;
}

function shouldHighlight(tx: Transaction): boolean {
  return !tx.category && tx.amount.cmp(Money.Zero) !== 0;
}

export default class Transactions extends React.Component<Props, State> {
  public state: State = {
    popletOpen: false,
  };

  public componentDidMount() {
    window.scrollTo(0,0)
  }

  private delete = (id: TransactionId, event: React.MouseEvent): boolean => {
    event.stopPropagation();
    if (this.disableEdit()) {
      return;
    }
    util
      .apiFetch({
        api: DeleteTransaction,
        body: { id },
      })
      .then(() => {
        this.props.onDeleteTransaction(id);
      });
    return true;
  }

  private disableEdit = (): boolean => {
    return "disableEdit" in this.props && this.props.disableEdit;
  }

  private categoryName(cid: CategoryId): string {
    return this.categoryMap().get(cid);
  }

  private categoryMap(): Map<string, string> {
    const map = new Map();
    this.props.categories.forEach((c) => {
      map.set(c.id, c.name);
    });
    return map;
  }

  private onAddTransaction(t: Transaction) {
    if (!("disableAdd" in this.props)) {
      this.props.onAddTransaction(t);
      this.closePoplet();
    }
  }

  private closePoplet = () => this.setState({ popletOpen: false });
  private openPoplet = () => this.setState({ popletOpen: true });

  public render() {
    const ais = getTransactionAIs(
      this.props.frame,
      this.props.transactions,
    ).map((ai) => <AIComponent ai={ai} key={ai.message()} />);

    const editable = !this.disableEdit();

    const rowsDesktop = _.sortBy(this.props.transactions, ["date"])
      .reverse()
      .map((tx) => (
        <tr
          className={`hoverable ${
            this.props.newTxn === tx.id ? "new" : "not-new"
          }`}
          key={tx.id}
        >
          <td className="del">
            <span
              className="deleteCr clickable fa-times fas"
              onClick={(e) => this.delete(tx.id, e)}
            ></span>
          </td>
          <td className="date">
            <ClickToEditDate
              value={tx.date}
              editable={editable}
              api={TransactionDate}
              onChange={(date) => this.props.onUpdateTransaction({ ...tx, date })}
              postKey="date"
              postData={{ id: tx.id }}
            />
          </td>
          <td className="stretch">
            <ClickToEditText
              editable={editable}
              api={TransactionDescription}
              value={tx.description}
              size={20}
              onChange={(description) =>
                this.props.onUpdateTransaction({ ...tx, description })
              }
              postKey="description"
              postData={{ id: tx.id }}
            />
          </td>
          <td
            className={
              shouldHighlight(tx) ? "category highlighted" : "category"
            }
          >
            <ClickToEditDropdown
              editable={editable}
              api={TransactionCategory}
              value={tx.category || ""}
              zeroValue="Uncategorized"
              values={this.categoryMap()}
              onChange={(cid) =>
                this.props.onUpdateTransaction({ ...tx, category: cid })
              }
              postKey="category"
              postData={{ id: tx.id }}
            />
          </td>
          <td className="amount">
            {tx.split ? (
              tx.amount.formatted()
            ) : (
              <ClickToEditMoney
                editable={editable}
                api={TransactionAmount}
                value={tx.amount}
                onChange={(amount) =>
                  this.props.onUpdateTransaction({ ...tx, amount })
                }
                postKey="amount"
                postData={{ id: tx.id }}
              />
            )}
          </td>
          <td className="split">
            {tx.split ? (
              <SplitPoplet
                transaction={tx}
                onUpdateTransaction={this.props.onUpdateTransaction}
              />
            ) : null}
          </td>
        </tr>
      ));

    const rowsMobile = _.sortBy(this.props.transactions, ["date"])
      .reverse()
      .map((tx) => (
        <MobileTransactionRow
          editable={editable}
          key={tx.id}
          tx={tx}
          new={tx.id === this.props.newTxn}
          onUpdateTransaction={this.props.onUpdateTransaction}
          onDeleteTransaction={this.props.onDeleteTransaction}
          categories={this.props.categories}
          categoryName={this.categoryName.bind(this)}
        />
      ));

    return (
      <div className="transactions">
        {ais}
        <MobileQuery
          desktop={
            <table>
              <tbody>
                <tr>
                  <th></th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
                {"disableAdd" in this.props ? null : (
                  <tr>
                    <td></td>
                    <td colSpan={5}>
                      <ControlledPoplet
                        open={this.state.popletOpen}
                        onRequestClose={this.closePoplet}
                        onRequestOpen={this.openPoplet}
                        text={
                          <span>
                            <span className="fa-plus-circle fas"></span>{" "}
                            Transaction
                          </span>
                        }
                      >
                        <TxEntry
                          onAddTransaction={this.onAddTransaction.bind(this)}
                          defaultDate={this.props.newTxDate}
                          categories={this.props.categories}
                          friends={this.props.friends}
                        />
                      </ControlledPoplet>
                    </td>
                  </tr>
                )}
                {rowsDesktop}
              </tbody>
            </table>
          }
          mobile={rowsMobile}
        />
      </div>
    );
  }
}

interface MobileRowProps {
  tx: Transaction;
  categories: Category[];
  editable: boolean;
  new: boolean;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tid: TransactionId) => void;
  categoryName: (cid: CategoryId) => string;
}
class MobileTransactionRow extends React.PureComponent<
  MobileRowProps,
  { open: boolean }
> {
  public state = { open: false };
  public open = () => {
    if (this.props.editable) {
      this.setState({ open: true });
    }
  }
  public close = () => this.setState({ open: false });

  public onSave = (tx: Transaction) => {
    this.setState({ open: false });
    this.props.onUpdateTransaction(tx);
  }
  public render() {
    const tx = this.props.tx;
    const monthName = util.MONTHS[tx.date.getMonth()].substr(0, 3);
    const newClass = this.props.new ? "new" : "not-new";
    const row = (
      <div key={tx.id} className={`hoverable tx-mobile-row ${newClass}`}>
        <div className="tx-mobile-date">
          <div className="tx-mobile-month">{monthName}</div>
          <div className="tx-mobile-day">{tx.date.getDate()}</div>
        </div>
        <div className="tx-mobile-stretch">
          <div className="tx-mobile-category">
            {this.props.categoryName(tx.category) || (
              <span className={shouldHighlight(tx) ? "highlighted" : ""}>
                Uncategorized
              </span>
            )}
          </div>
          <div className="tx-mobile-desc">{tx.description}</div>
        </div>
        <div className="tx-mobile-right">
          {tx.split ? <span className="fas fa-user-friends" /> : null}
          <span className="tx-mobile-amount">{tx.amount.formatted()}</span>
        </div>
      </div>
    );
    return (
      <ControlledPoplet
        text={row}
        clickable={false}
        open={this.state.open}
        onRequestClose={this.close}
        onRequestOpen={this.open}
      >
        <div className="transactions editing">
          <h2>Edit Transaction</h2>
          <TxEntry
            categories={this.props.categories}
            transaction={this.props.tx}
            onUpdateTransaction={this.onSave}
            onDeleteTransaction={(t: Transaction) =>
              this.props.onDeleteTransaction(t.id)
            }
          />
        </div>
      </ControlledPoplet>
    );
  }
}
