
import * as React from "react";
import Money from "../../shared/Money";
import * as util from "../util";

export const Histogram: React.SFC<{
    month: number,
    data: Money[],
    height: number,
    className?: string,
}> = (props) => {
    let { data } = props;
    const { month, height, className } = props;

    // Strip the oldest 0's off the data. Oldest is first.
    while (data.length > 0 && data[0].cmp(Money.Zero) === 0) {
        data = data.slice(1);
    }

    if (data.length === 0) {
        return null;
    }

    const max = data.reduce((m1, m2) => m1.cmp(m2) > 0 ? m1 : m2);
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

    const grams = data.map((amount, i) => {
        let heightPct = amount.dividedBy(max).times(new Money(100)).string();
        if (max.cmp(Money.Zero) === 0 && amount.cmp(Money.Zero) === 0) {
            heightPct = "0";
        }
        return <div className="histogram-item" key={`${amount.formatted()}-${monthName(i)}`}>
            <div className="histogram-bar-total" style={{ height: height - 20 }}>
                <div className="histogram-bar-filled" style={{ height: `${heightPct}%` }} />
            </div>
            <div className="histogram-label">
                {monthName(i)}
            </div>
        </div>;
    });

    return <div className={`histogram ${className || ""}`}>
        {grams}
    </div>;
}