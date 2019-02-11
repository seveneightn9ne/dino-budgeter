import _ from "lodash";
import * as React from "react";
import Money from "../shared/Money";
import { Friend, Payment, Charge, UserId, FrameIndex } from "../shared/types";
import { ControlledPoplet } from "./components/poplet";
import * as util from "./util";
import { Payment as APIPayment } from "../shared/api";

interface Props {
    index: FrameIndex;
    me: Friend;
    friends: Friend[];
    pendingFriends: Friend[];
    invites: Friend[];
    debts: {[email: string]: {
        balance: Money,
        payments: (Payment|Charge)[],
    }};
    onPayment: (email: string, pmt: Payment|Charge) => void;
}

type State = {
    paymentOpen: boolean,
    payment_amount: string,
    payment_youPay: boolean,
    payment_memo: string,

    chargeOpen: boolean,
    charge_amount: string,
    charge_youCharge: boolean,
    charge_memo: string,

    collapsePayments: {[uid: string]: boolean},
    latestFrame: {[uid: string]: FrameIndex},
};

type UiFriend = {
    name?: string,
    email: string,
    debt: {
        balance: Money,
        payments: (Payment|Charge)[],
    },
    pending?: true,
    invite?: true,
    uid: UserId,
};

export default class Friends extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        const friends = this.allFriends(props);
        this.state = {
            paymentOpen: false,
            payment_youPay: true,
            payment_amount: '',
            payment_memo: '',
            chargeOpen: false,
            charge_youCharge: true,
            charge_amount: '',
            charge_memo: '',
            collapsePayments: _.fromPairs(_.map(friends, f => [f.uid, false])),
            latestFrame: _.fromPairs(_.map(friends, f => [f.uid, props.index])),
        }
    }

    selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => 
        e.currentTarget.select();

    openPayment = () => this.setState({
        paymentOpen: true,
        payment_youPay: true,
        payment_amount: '',
        payment_memo: '',
    });
    closePayment = () => this.setState({paymentOpen: false});
    openCharge = () => this.setState({
        chargeOpen: true,
        charge_youCharge: true,
        charge_amount: '',
        charge_memo: '',
    });
    closeCharge = () => this.setState({chargeOpen: false});

    onSubmitPayment = (f: UiFriend) => (e: React.FormEvent) =>
        this.onSubmitInner(e, f.email, f.uid, this.state.payment_amount, this.state.payment_youPay, this.state.payment_memo, true);

    onSubmitCharge = (f: UiFriend) => (e: React.FormEvent) => 
        this.onSubmitInner(e, f.email, f.uid, this.state.charge_amount, this.state.charge_youCharge, this.state.charge_memo, false);

    onSubmitInner = (e: React.FormEvent, email: string, uid: UserId, amountStr: string, youPay: boolean, memo: string, isPayment: boolean) => {
        e.preventDefault();
        const frame = this.props.index;
        let amount = new Money(amountStr);
        if (!amount.isValid()) {
            return;
        }
        util.apiFetch({
            api: APIPayment,
            body: {
                email, amount, youPay, isPayment, memo, frame,
            },
        }).then(() => {
            if (isPayment) {
                const payment: Payment = {
                    type: 'payment',
                    payer: youPay ? this.props.me.uid : uid,
                    payee: youPay ? uid : this.props.me.uid,
                    amount, memo, frame,
                    date: new Date(),
                }
                this.props.onPayment(email, payment);
            } else {
                const charge: Charge = {
                    type: 'charge',
                    debtor: youPay ? this.props.me.uid : uid,
                    debtee: youPay ? uid : this.props.me.uid,
                    amount, memo, frame,
                    date: new Date(),
                }
                this.props.onPayment(email, charge);

            }
            this.closePayment();
            this.closeCharge();
        });
    }
    allFriends = (props = this.props) => {
        let allFriends: UiFriend[] = props.friends.map(f => ({
            name: f.name,
            email: f.email,
            debt: props.debts[f.email] || {balance: Money.Zero, payments: []},
            uid: f.uid,
        }));
        allFriends = allFriends.concat(props.pendingFriends.map(f => ({
            email: f.email,
            debt: props.debts[f.email] || {balance: Money.Zero, payments: []},
            pending: true as true,
            uid: f.uid,
        })));
        allFriends = allFriends.concat(props.invites.map(f => ({
            email: f.email,
            debt: props.debts[f.email] || {balance: Money.Zero, payments: []},
            invite: true as true,
            uid: f.uid,
        })));
        return allFriends;
    }

    toggleCollapse = (uid: UserId) => () => {
        const newState = !this.state.collapsePayments[uid];
        this.setState({collapsePayments: {...this.state.collapsePayments, [uid]: newState}});
    }

    loadMore = (f: UiFriend) => () => {
        const payments = _.sortBy(this.props.debts[f.email].payments.filter(p => p.frame < this.state.latestFrame[f.uid]), 'frame');
        if (payments.length ==  0) {
            console.error("This is impossible");
            return;
        }
        this.setState({latestFrame: {...this.state.latestFrame, [f.uid]: payments[0].frame}});
    }

    displayName = (friend: UiFriend) => {
        return friend.name || friend.email;
    }

    renderPayment = (f: UiFriend) => {
        return <ControlledPoplet
            open={this.state.paymentOpen} onRequestOpen={this.openPayment} onRequestClose={this.closePayment}
            text={<span><span className="fa-plus-circle fas"></span> Payment</span>}>
            <h2>New Payment</h2>
            <form onSubmit={this.onSubmitPayment(f)}>
                <label>Amount: <input type="text" size={6} onFocus={this.selectOnFocus}
                    value={this.state.payment_amount} onChange={util.cc(this, "payment_amount")} /></label>
                <label>Memo: <input type="text" value={this.state.payment_memo} onChange={util.cc(this, "payment_memo")} /></label>
                <div className="section" style={{clear: "both"}}>
                    <label className="nostyle"><input type="radio" name="payer" value="0" checked={this.state.payment_youPay}
                        onChange={(e) => this.setState({payment_youPay: e.target.checked})} /> You're paying {this.displayName(f)}</label>
                    <label className="nostyle"><input type="radio" name="payer" value="1" checked={!this.state.payment_youPay}
                        onChange={(e) => this.setState({payment_youPay: !e.target.checked})} /> {this.displayName(f)} is paying you</label>
                </div>
                <input className="button" type="submit" value="Save" />
            </form>
        </ControlledPoplet>
    }

    renderCharge = (f: UiFriend) => {
        return <ControlledPoplet
            open={this.state.chargeOpen} onRequestOpen={this.openCharge} onRequestClose={this.closeCharge}
            text={<span><span className="fa-plus-circle fas"></span> Charge</span>}>
            <h2>New Charge</h2>
            <form onSubmit={this.onSubmitCharge(f)}>
                <label>Amount: <input type="text" size={6} onFocus={this.selectOnFocus}
                    value={this.state.charge_amount} onChange={util.cc(this, "charge_amount")} /></label>
                <label>Memo: <input type="text" value={this.state.charge_memo} onChange={util.cc(this, "charge_memo")} /></label>
                <div className="section" style={{clear: "both"}}>
                    <label className="nostyle"><input type="radio" name="payer" value="1" checked={this.state.charge_youCharge}
                        onChange={(e) => this.setState({charge_youCharge: e.target.checked})} /> {this.displayName(f)} owes you</label>
                    <label className="nostyle"><input type="radio" name="payer" value="0" checked={!this.state.charge_youCharge}
                        onChange={(e) => this.setState({charge_youCharge: !e.target.checked})} /> You owe {this.displayName(f)}</label>
                </div>
                <input className="button" type="submit" value="Save" />
            </form>
        </ControlledPoplet>
    }

    render() {
        // TODO - want friendship last-active to sort the friendships.
       
        const rows = this.allFriends().map(f => {
            const displayName = f.name || f.email;
            const email = displayName !== f.email ? 
                <div className="friend-email">{f.email}</div> : null;
            const debt = f.debt.balance.cmp(Money.Zero) == 0 ? null :
                f.debt.balance.cmp(Money.Zero) > 0 ?
                    <div className="friend-debt">
                        you owe {f.debt.balance.formatted()}
                    </div> :
                    <div className="friend-debt">
                        owes you {f.debt.balance.negate().formatted()}
                    </div>;
            const payment = this.renderPayment(f);
            const charge = this.renderCharge(f);
            const payments = f.debt.payments.filter(p => p.frame >= this.state.latestFrame[f.uid]).map(payment => {
                const text = payment.type == 'payment' ? (payment.payer == this.props.me.uid ? 
                    `You paid ${displayName} ${payment.amount.formatted()}`:
                    `${displayName} paid you ${payment.amount.formatted()}`):
                    (payment.debtor == this.props.me.uid ? 
                        `You charged ${displayName} ${payment.amount.formatted()}` :
                        `${displayName} charged you ${payment.amount.formatted()}`); 
                return <tr key={payment.date.toString()+payment.memo+payment.amount.string()}>
                    <td>{text}</td>
                    <td>{payment.memo}</td>
                    <td>{util.yyyymmdd(payment.date)}</td>
                </tr>
            });
            const collapsePaymentButton = this.state.collapsePayments[f.uid] ?
                <div className="friend-collapse fa-chevron-right fas" onClick={this.toggleCollapse(f.uid)}></div> :
                <div className="friend-collapse fa-chevron-down fas" onClick={this.toggleCollapse(f.uid)}></div>;
            const paymentsTable = this.state.collapsePayments[f.uid] ? null : 
                payments.length == 0 ? null : 
                <div className="friend-table-container"><table className="friend-table"><tbody>
                    <tr><th></th><th>Memo</th><th>Date</th></tr>
                    {payments}
                </tbody></table></div>;
            const paymentsLoadMore = this.state.collapsePayments[f.uid] ? null :
                payments.length == this.props.debts[f.email].payments.length ? null :
                <div className="friend-more clickable" onClick={this.loadMore(f)}>Load older payments</div>;
            return (<div key={f.email}><div className="friend-row">
                {payments.length == 0 ? null : collapsePaymentButton}
                <div className="friend-title">
                    <div className="friend-name">{displayName}</div>
                    {email}
                </div>
                {debt}
                <div className="friend-actions">
                    <div className="friend-pay">
                        {payment}
                    </div>
                    <div className="friend-charge">
                        {charge}
                    </div>
                </div>
            </div>
            {paymentsTable}
            {paymentsLoadMore}
            </div>);
        });
        return <div className="friends">
            {rows}
        </div>;
    }
}
