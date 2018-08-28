import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money } from '../shared/types';
<<<<<<< HEAD
import TxEntry from './txentry'
=======
import * as frames from '../shared/frames';
>>>>>>> categories show up

type FrameProps = RouteComponentProps<{month: string, year: string}>;
interface FrameState {
    frame?: FrameType;
    incomeFormatted?: string;
}

/** /app/:month/:year */
export default class Frame extends React.Component<FrameProps, FrameState> {
    private month: number;
    private year: number;
    private monthName: string;
    constructor(props: FrameProps) {
      super(props);
      this.month = Number(props.match.params.month) - 1;
      this.year = Number(props.match.params.year);
      this.monthName = MONTHS[this.month];
      this.state = {};
    }

    componentDidMount() {
        this.initializeFrame();
    }

    initializeFrame(): Promise<FrameType> {
        const path = '/api/frame/' + this.month + '/' + this.year;
        return fetch(path).then((response) => {
            return response.json();
        }).then(response => {
            const frame = response as FrameType;
            const incomeFormatted = formatMoney(frame.income);
            this.setState({frame, incomeFormatted});
            return frame;
        });
    }

    render() {
        if (!this.state.frame) {
            return null;
        }
        const cs = this.state.frame.categories.map(c => 
            <div key={c.id}>{c.name}</div>
        );
        console.log(this.state.frame);
        return <div>
            <h1>{this.monthName + ' ' + this.year}</h1>
            <p><b>Budgeted: {this.state.incomeFormatted}</b></p>
            <p>Your categories will show up here.</p>
            <TxEntry />
        </div>;
    }
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