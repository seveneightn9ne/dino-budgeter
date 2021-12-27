import _ from "lodash";
import * as React from "react";
import * as api from "../shared/api";
import { index } from "../shared/frames";
import Money from "../shared/Money";
import { distributeTotal } from "../shared/transactions";
import {
  Category,
  CategoryId,
  Friend,
  Share,
  Transaction,
} from "../shared/types";
import { CategoryMap } from "./category_utils";
import {
  allowEmpty,
  ccec,
  ErrorState,
  handleError,
  nonNegativeMoneyError,
  render as renderError,
  validate,
} from "./errors";
import * as util from "./util";

interface NewTxProps {
  onAddTransaction: (transaction: Transaction) => void;
  categories: Category[];
  friends: Friend[];
  defaultDate: Date;
}

interface UpdateTxProps {
  categories: Category[];
  transaction: Transaction;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
}

type Props = NewTxProps | UpdateTxProps;

interface TxEntryState extends ErrorState<typeof errorDefs> {
  amount: string;
  description: string;
  category: string;
  date: string;
  splitting: boolean;
  splitWith: string;
  yourShare: string;
  theirShare: string;
  youPaid: boolean;
}

interface SubmitData {
  amount: Money;
  total: Money;
  category: CategoryId;
  date: Date;
  frame: number;
  myShare: Share;
  theirShare: Share;
  otherAmount: Money;
}

function isUpdate(props: Props): props is UpdateTxProps {
  return "transaction" in props;
}

/**
 * Possible Error on Save Transaction
 * Amount could be NaN or <0
 * Shares could be nonnumeric or <0
 * Unexpected 400
 * Unexpected 5xx
 */

const errorDefs = {
  amount: nonNegativeMoneyError("amount", "Amount"),
  yourShare: allowEmpty(nonNegativeMoneyError("yourShare", "Your share")),
  theirShare: allowEmpty(nonNegativeMoneyError("theirShare", "Their share")),
};

export default class TxEntry extends React.Component<Props, TxEntryState> {
  constructor(props: Props) {
    super(props);
    this.state = this.initializeState(props);
  }

  public initializeState(props: Props): TxEntryState {
    if (isUpdate(props)) {
      const amount = props.transaction.split
        ? props.transaction.amount
            .plus(props.transaction.split.otherAmount)
            .string()
        : props.transaction.amount.string();
      return {
        amount,
        description: props.transaction.description,
        category: props.transaction.category || "",
        date: util.yyyymmdd(props.transaction.date),
        splitting: !!props.transaction.split,
        splitWith: props.transaction.split
          ? props.transaction.split.with.uid
          : this.defaultSplitWith(),
        yourShare: props.transaction.split
          ? props.transaction.split.myShare.string()
          : "1",
        theirShare: props.transaction.split
          ? props.transaction.split.theirShare.string()
          : "1",
        youPaid: props.transaction.split
          ? props.transaction.split.payer != props.transaction.split.with.uid
          : true,
        error: "",
        errors: {},
      };
    } else {
      return {
        amount: "",
        description: "",
        category: "",
        date: util.yyyymmdd(props.defaultDate),
        splitting: false,
        splitWith: this.defaultSplitWith(),
        yourShare: "1",
        theirShare: "1",
        youPaid: true,
        error: "",
        errors: {},
      };
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (
      isUpdate(prevProps) &&
      isUpdate(this.props) &&
      prevProps.transaction != this.props.transaction
    ) {
      // New transaction - recompute all state
      this.setState(this.initializeState(this.props));
    } else if (
      !isUpdate(prevProps) &&
      !isUpdate(this.props) &&
      prevProps.friends != this.props.friends &&
      this.state.splitWith == ""
    ) {
      // Friends have loaded - recompute default split now that we have friends
      this.setState({
        splitWith: this.defaultSplitWith(),
      });
    }
  }

  public defaultSplitWith() {
    if (isUpdate(this.props)) {
      const split = this.props.transaction.split;
      return split ? split.with.uid : "";
    }
    return this.props.friends.length > 0 ? this.props.friends[0].uid : "";
  }

  public delete(t: Transaction): boolean {
    util
      .apiFetch({
        api: api.DeleteTransaction,
        body: { id: t.id },
      })
      .then(() => {
        isUpdate(this.props) && this.props.onDeleteTransaction(t);
      })
      .catch(handleError(this));
    return true;
  }

  public handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const data = this.prepareSubmission();
    if (!data) {
      return;
    }
    if (isUpdate(this.props)) {
      this.submitForUpdate(this.props, data);
    } else {
      this.submitForAdd(this.props, data);
    }
  }

  public prepareSubmission(): SubmitData | false {
    if (!validate(errorDefs, this)) {
      return false;
    }
    let amount = new Money(this.state.amount);
    const total = new Money(this.state.amount);
    const category = this.state.category;
    const date = util.fromYyyymmdd(this.state.date);
    const frame = index(date.getMonth(), date.getFullYear());
    let myShare: Share;
    let theirShare: Share;
    let otherAmount: Money;
    if (this.state.splitting) {
      myShare = new Share(this.state.yourShare);
      theirShare = new Share(this.state.theirShare);
      [amount, otherAmount] = distributeTotal(amount, myShare, theirShare);
    }
    return {
      amount,
      total,
      category,
      date,
      frame,
      myShare,
      theirShare,
      otherAmount,
    };
  }

  public submitForUpdate(props: UpdateTxProps, data: SubmitData) {
    const newTransaction = { ...props.transaction };
    // Updating an existing transaction...
    const initialState = this.initializeState(props);
    const work: Array<Promise<any>> = [];

    const tasks = [
      this.submitUpdateSplit,
      this.submitUpdateDescription,
      this.submitUpdateDate,
      this.submitUpdateCategory,
      this.submitUpdateAmount,
    ];
    tasks.forEach((task) => {
      const promise = task(props, initialState, newTransaction, data);
      if (promise) {
        work.push(promise);
      }
    });

    Promise.all(work).then(() => {
      isUpdate(this.props) && this.props.onUpdateTransaction(newTransaction);
    });
  }

  public submitUpdateSplit = (
    props: UpdateTxProps,
    initialState: TxEntryState,
    newTransaction: Transaction,
    data: SubmitData,
  ) => {
    const { myShare, theirShare, amount, otherAmount, total } = data;

    if (
      !(
        props.transaction.split &&
        (this.state.amount != initialState.amount ||
          this.state.theirShare != initialState.theirShare ||
          this.state.yourShare != initialState.yourShare ||
          this.state.youPaid != initialState.youPaid)
      )
    ) {
      return null;
    }

    // Update newTransaction
    newTransaction.split = {
      ...newTransaction.split,
      myShare,
      theirShare,
      otherAmount,
      // XXX: using "0" because I don't know my own uid.
      payer: this.state.youPaid ? "0" : newTransaction.split.with.uid,
    };
    newTransaction.amount = amount;

    // Post the data
    return util
      .apiFetch({
        api: api.TransactionSplit,
        body: {
          tid: props.transaction.id,
          sid: props.transaction.split.id,
          total,
          myShare,
          theirShare,
          iPaid: this.state.youPaid,
        },
      })
      .catch(handleError(this));
  }

  public submitUpdateDescription = (
    _props: UpdateTxProps,
    initialState: TxEntryState,
    newTransaction: Transaction,
    _data: SubmitData,
  ) => {
    if (this.state.description == initialState.description) {
      return null;
    }
    newTransaction.description = this.state.description;
    return util
      .apiFetch({
        api: api.TransactionDescription,
        body: {
          description: newTransaction.description,
          id: newTransaction.id,
        },
      })
      .catch(handleError(this));
  }

  public submitUpdateDate = (
    _props: UpdateTxProps,
    initialState: TxEntryState,
    newTransaction: Transaction,
    data: SubmitData,
  ) => {
    if (this.state.date == initialState.date) {
      return null;
    }
    newTransaction.date = data.date;
    return util
      .apiFetch({
        api: api.TransactionDate,
        body: {
          date: data.date,
          id: newTransaction.id,
        },
      })
      .catch(handleError(this));
  }

  public submitUpdateCategory = (
    _props: UpdateTxProps,
    initialState: TxEntryState,
    newTransaction: Transaction,
    data: SubmitData,
  ) => {
    if (this.state.category == initialState.category) {
      return null;
    }
    newTransaction.category = data.category;
    return util
      .apiFetch({
        api: api.TransactionCategory,
        body: {
          category: data.category,
          id: newTransaction.id,
        },
      })
      .catch(handleError(this));
  }

  public submitUpdateAmount = (
    props: UpdateTxProps,
    initialState: TxEntryState,
    newTransaction: Transaction,
    data: SubmitData,
  ) => {
    if (this.state.amount == initialState.amount || props.transaction.split) {
      return null;
    }
    newTransaction.amount = data.amount;
    return util
      .apiFetch({
        api: api.TransactionAmount,
        body: {
          amount: data.amount,
          id: newTransaction.id,
        },
      })
      .catch(handleError(this));
  }

  public submitForAdd = (props: NewTxProps, data: SubmitData) => {
    const {
      amount,
      frame,
      category,
      date,
      myShare,
      theirShare,
      otherAmount,
    } = data;
    const onAddTransaction = props.onAddTransaction;
    const split = this.state.splitting
      ? {
          with: this.state.splitWith,
          myShare,
          theirShare,
          otherAmount,
          iPaid: this.state.youPaid,
        }
      : undefined;
    // Saving a new transaction...
    util
      .apiFetch({
        api: api.AddTransaction,
        body: {
          frame,
          amount,
          description: this.state.description,
          date,
          category,
          split,
        },
      })
      .then((transaction) => {
        // Not clearing date & category
        this.setState({
          amount: "",
          description: "",
          splitting: false,
          splitWith: this.defaultSplitWith(),
          yourShare: "1",
          theirShare: "1",
          youPaid: true,
        });
        onAddTransaction(transaction);
      })
      .catch(handleError(this));
  }

  public openSplitSection = () => {
    this.setState({ splitting: true });
  }
  public closeSplitSection = () => {
    this.setState({ splitting: false });
  }

  public selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  }

  public onPayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ youPaid: e.target.value === "0" });
  }

  public renderSplitSection = () => {
    // You can remove a split iff it's a new transaction.
    const closeButton = isUpdate(this.props) ? null : (
      <span
        className="close clickable fa-times fas"
        onClick={this.closeSplitSection}
      />
    );
    return (
      <div>
        <label>
          Split with:{" "}
          {isUpdate(this.props) ? (
            this.props.transaction.split.with.name ||
            this.props.transaction.split.with.email
          ) : (
            <select
              onChange={util.cc(this, "splitWith")}
              value={this.state.splitWith}
            >
              {this.props.friends.map((f) => (
                <option key={f.uid}>{f.name || f.email}</option>
              ))}
            </select>
          )}
          {closeButton}
        </label>
        <label className="first half">
          Your share:{" "}
          <input
            type="text"
            value={this.state.yourShare}
            onChange={ccec(this, "yourShare")}
            size={1}
            className="center"
            onFocus={this.selectOnFocus}
          />
          {renderError(this.state.errors.yourShare)}
        </label>
        <label className="half">
          Their share:{" "}
          <input
            type="text"
            value={this.state.theirShare}
            onChange={ccec(this, "theirShare")}
            size={1}
            className="center"
            onFocus={this.selectOnFocus}
          />
          {renderError(this.state.errors.theirShare)}
        </label>
        <div className="section" style={{ clear: "both" }}>
          <label className="nostyle">
            <input
              type="radio"
              name="payer"
              value="0"
              checked={this.state.youPaid}
              onChange={this.onPayerChange}
            />{" "}
            You paid
          </label>
          <label className="nostyle">
            <input
              type="radio"
              name="payer"
              value="1"
              checked={!this.state.youPaid}
              onChange={this.onPayerChange}
            />{" "}
            They paid
          </label>
        </div>
      </div>
    );
  }

  public render(): JSX.Element {
    const categoryOptions = new CategoryMap({
      categories: this.props.categories,
      zeroValue: "Uncategorized",
    }).options();
    // Show the splitting option if you're adding and have friends, or if you're updating a split transaction.
    const splitting = (isUpdate(this.props) ? (
      this.props.transaction.split
    ) : (
      this.props.friends.length > 0
    )) ? (
      this.state.splitting ? (
        this.renderSplitSection()
      ) : (
        <span className="section clickable" onClick={this.openSplitSection}>
          Split transaction...
        </span>
      )
    ) : null;
    return (
      <div className="txentry">
        <form onSubmit={this.handleSubmit}>
          <label>
            {isUpdate(this.props) && this.props.transaction.split
              ? "Total"
              : "Amount"}
            :{" "}
            <input
              autoFocus={true}
              className="center"
              value={this.state.amount}
              onChange={ccec(this, "amount")}
              size={6}
            />
            {renderError(this.state.errors.amount)}
          </label>
          <label>
            Description:{" "}
            <input
              value={this.state.description}
              onChange={util.cc(this, "description")}
            />
          </label>
          <label>
            <input
              type="date"
              value={this.state.date}
              onChange={util.cc(this, "date")}
            />
          </label>
          <label>
            <select
              onChange={util.cc(this, "category")}
              value={this.state.category}
            >
              {categoryOptions}
            </select>
          </label>
          {splitting}
          <label>
            <input className="button nomargin" type="submit" value="Save" />
            {isUpdate(this.props) ? (
              <button
                className="button"
                onClick={() =>
                  isUpdate(this.props) && this.delete(this.props.transaction)
                }
              >
                Delete
              </button>
            ) : null}
            {renderError(this.state.error)}
          </label>
        </form>
      </div>
    );
  }
}
