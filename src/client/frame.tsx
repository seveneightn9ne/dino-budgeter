import * as React from 'react';
import {Frame as FrameType, Money } from '../shared/types';

interface FrameProps {
    frame: FrameType;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatMoney(money: Money): string {
    let dollars: string = money;
    let cents = "00";
    if (money.indexOf(".") > -1) {
        [dollars, cents] = money.split(".");
    }
    if (cents.length < 2) {
        cents = cents + "0";
    }
    return "$" + dollars + "." + cents;
}

export default class Frame extends React.Component<FrameProps, {}> {
    private monthName: string;
    private incomeFormatted: string;
    constructor(props: FrameProps) {
      super(props);
      this.monthName = MONTHS[props.frame.month];
      this.incomeFormatted = formatMoney(props.frame.income);
      this.state = {};
    }

    render() {
        return <div>
            <h1>{this.monthName + ' ' + this.props.frame.year}</h1>
            <p><b>Budgeted: {this.incomeFormatted}</b></p>
            <p>Your categories will show up here.</p>
        </div>;
    }
}
