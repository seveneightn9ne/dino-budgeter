import { History, Location } from "history";
import _ from "lodash";
import * as React from "react";
import Money from "../shared/Money";
import { Friend } from "../shared/types";
import { ControlledPoplet } from "./components/poplet";
import * as util from "./util";
import { Payment } from "../shared/api";

interface Props {
    friends: Friend[];
    pendingFriends: Friend[];
    invites: Friend[];
    debts: {[email: string]: Money};
    location: Location;
    history: History;
    onPayment: (email: string, amount: Money) => void;
}

type State = {
    paymentOpen: boolean,
    payment_amount: string,
    payment_youPay: boolean,

    chargeOpen: boolean,
    charge_amount: string,
    charge_youCharge: boolean,
};

export default class Friends extends React.Component<Props, State> {
    state = {
        paymentOpen: false,
        payment_youPay: true,
        payment_amount: '',
        chargeOpen: false,
        charge_youCharge: true,
        charge_amount: '',
    }

    selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => 
        e.currentTarget.select();

    openPayment = () => this.setState({
        paymentOpen: true,
        payment_youPay: true,
        payment_amount: '',
    });
    closePayment = () => this.setState({paymentOpen: false});
    openCharge = () => this.setState({
        chargeOpen: true,
        charge_youCharge: true,
        charge_amount: '',
    });
    closeCharge = () => this.setState({chargeOpen: false});

    onSubmitPayment = (email: string) => (e: React.FormEvent) =>
        this.onSubmitInner(e, email, this.state.payment_amount, this.state.payment_youPay, true);

    onSubmitCharge = (email: string) => (e: React.FormEvent) => 
        this.onSubmitInner(e, email, this.state.charge_amount, this.state.charge_youCharge, true);

    onSubmitInner = (e: React.FormEvent, email: string, amountStr: string, youPay: boolean, isPayment: boolean) => {
        e.preventDefault();
        let amount = new Money(amountStr);
        if (!amount.isValid()) {
            return;
        }
        util.apiFetch({
            api: Payment,
            body: {
                email, amount, youPay, isPayment,
            },
            location: this.props.location,
            history: this.props.history,
        }).then(() => {
            if (!youPay) {
                amount = amount.negate();
            }
            if (!isPayment) {
                amount = amount.negate();
            }
            this.props.onPayment(email, amount);
            this.closePayment();
            this.closeCharge();
        });
    }
    allFriends = () => {
        let allFriends: {
            name?: string,
            email: string,
            debt: Money,
            pending?: true,
            invite?: true,
        }[] = this.props.friends.map(f => ({
            name: f.name,
            email: f.email,
            debt: this.props.debts[f.email] || Money.Zero,
        }));
        allFriends = allFriends.concat(this.props.pendingFriends.map(f => ({
            email: f.email,
            debt: this.props.debts[f.email] || Money.Zero,
            pending: true as true,
        })));
        allFriends = allFriends.concat(this.props.invites.map(f => ({
            email: f.email,
            debt: this.props.debts[f.email] || Money.Zero,
            invite: true as true,
        })));
        return allFriends;
    }

    render() {
        // TODO - want friendship last-active to sort the friendships.
       
        const rows = this.allFriends().map(f => {
            const displayName = f.name || f.email;
            const email = displayName !== f.email ? 
                <div className="friend-email">{f.email}</div> : null;
            const debt = f.debt.cmp(Money.Zero) == 0 ? null :
                f.debt.cmp(Money.Zero) > 0 ?
                    <div className="friend-debt">
                        you owe {f.debt.formatted()}
                    </div> :
                    <div className="friend-debt">
                        owes you {f.debt.negate().formatted()}
                    </div>;
            const payment = <ControlledPoplet
                open={this.state.paymentOpen} onRequestOpen={this.openPayment} onRequestClose={this.closePayment}
                text={<span><span className="fa-plus-circle fas"></span> Payment</span>}>
                <h2>New Payment</h2>
                <form onSubmit={this.onSubmitPayment(f.email)}>
                    <label>Amount: <input type="text" size={6} onFocus={this.selectOnFocus}
                        value={this.state.payment_amount} onChange={util.cc(this, "payment_amount")} /></label>
                    <div className="section" style={{clear: "both"}}>
                        <label className="nostyle"><input type="radio" name="payer" value="0" checked={this.state.payment_youPay}
                            onChange={(e) => this.setState({payment_youPay: e.target.checked})} /> You're paying {displayName}</label>
                        <label className="nostyle"><input type="radio" name="payer" value="1" checked={!this.state.payment_youPay}
                            onChange={(e) => this.setState({payment_youPay: !e.target.checked})} /> {displayName} is paying you</label>
                    </div>
                    <input className="button" type="submit" value="Save" />
                </form>
            </ControlledPoplet>
            const charge = <ControlledPoplet
                open={this.state.chargeOpen} onRequestOpen={this.openCharge} onRequestClose={this.closeCharge}
                text={<span><span className="fa-plus-circle fas"></span> Charge</span>}>
                <h2>New Charge</h2>
                <form onSubmit={this.onSubmitCharge(f.email)}>
                    <label>Amount: <input type="text" size={6} onFocus={this.selectOnFocus}
                        value={this.state.charge_amount} onChange={util.cc(this, "charge_amount")} /></label>
                    <div className="section" style={{clear: "both"}}>
                        <label className="nostyle"><input type="radio" name="payer" value="1" checked={this.state.charge_youCharge}
                            onChange={(e) => this.setState({charge_youCharge: e.target.checked})} /> {displayName} owes you</label>
                        <label className="nostyle"><input type="radio" name="payer" value="0" checked={!this.state.charge_youCharge}
                            onChange={(e) => this.setState({charge_youCharge: !e.target.checked})} /> You owe {displayName}</label>
                    </div>
                    <input className="button" type="submit" value="Save" />
                </form>
            </ControlledPoplet>
            return (<div className="friend-row" key={f.email}>
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
            </div>);
        });
        return <div className="friends">
            {rows}
        </div>;
    }
}
