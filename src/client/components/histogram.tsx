
import * as React from "react";
import Money from "../../shared/Money";
import * as util from "../util";

export const Histogram: React.SFC<{
    month: number,
    data: Array<{ budget: Money, spending: Money }>,
    height: number,
    className?: string,
}> = (props) => {
    const { month, data, height, className } = props;

    if (data.length === 0) {
        return null;
    }

    const max = data.reduce((m: Money, c: { budget: Money, spending: Money }): Money => {
        const maxHere = c.budget.cmp(c.spending) > 0 ? c.budget : c.spending;
        return m.cmp(maxHere) > 0 ? m : maxHere;
    }, Money.Zero);

    const monthName = (i: number) => {
        // i:               0         1           2           3
        // length:          4
        // length - i - 1:  3         2           1           0
        // m: month - $0:   m-3       m-2         m-1         m
        let monthIndex = month - (data.length - i - 1);
        if (monthIndex < 0) {
            monthIndex += util.MONTHS.length;
        }
        return util.MONTHS[monthIndex];
    };

    const heightPct = (m: Money) => {
        let pct = m.dividedBy(max).times(new Money(100)).string();
        if (max.cmp(Money.Zero) === 0 && m.cmp(Money.Zero) === 0) {
            pct = "0";
        }
        return pct;
    }

    const grams = data.map(({ budget, spending }, i) => {
        let color = "green";
        if (spending.cmp(budget) > 0) {
            color = "red";
        }
        return <div className="histogram-item" key={`${budget.string()}-${spending.string()}-${monthName(i)}`}>
            <div className="histogram-bars">
                <div className="histogram-bar-total spending" style={{ height: height - 20 }}>
                    <div className={`histogram-bar-filled ${color}`} style={{ height: `${heightPct(spending)}%` }} />
                </div>
                <div className="histogram-bar-total budget" style={{ height: height - 20 }}>
                    <div className="histogram-bar-filled" style={{ height: `${heightPct(budget)}%` }} />
                </div>
            </div>
            <div className="histogram-label">
                <div className="histogram-label-month">
                    {monthName(i)}
                </div>
                <div className="histogram-label-amount">
                    {spending.formatted()} / {budget.formatted()}
                </div>
            </div>
        </div>;
    });

    return <div className={`histogram ${className || ""}`}>
        {grams}
    </div>;
}