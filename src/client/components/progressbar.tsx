import * as React from "react";
import * as frames from "../../shared/frames";
import Money from "../../shared/Money";
import { FrameIndex } from "../../shared/types";

export const ProgressBar: React.SFC<{
  amount: Money;
  total: Money;
  frame: FrameIndex;
  className?: string;
  small?: boolean;
}> = (props) => {
  let pct = props.amount
    .dividedBy(props.total)
    .times(new Money(100))
    .string();
  let className = "green";
  const height = props.small ? 10 : 20;
  if (props.total.cmp(Money.Zero) === 0 && props.amount.cmp(Money.Zero) === 0) {
    // 0 out of 0 is 0, not 100.
    pct = "0";
  } else if (props.total.cmp(props.amount) < 0) {
    // over 100% omg
    pct = "100";
    className = "red";
  } else if (props.total.minus(props.amount).cmp(new Money(1)) < 0) {
    // Less than $1 from full
    className = "yellow";
  }
  let gauge;
  const now = new Date();
  const useGauge =
    frames.index(now.getMonth(), now.getFullYear()) === props.frame;
  if (useGauge) {
    const gaugePct = (100 * Math.min(now.getDate(), 30)) / 30;
    if (className === "green" && gaugePct < Number(pct)) {
      className = "yellow";
    }
    if (!props.small) {
      let style: React.CSSProperties = {
        left: `${gaugePct}%`,
        borderLeftWidth: 2,
      };
      const width = props.small ? 0 : 2;
      if (gaugePct > 50) {
        style = {
          right: `${100 - gaugePct}%`,
          borderRightWidth: width,
        };
      }
      style.paddingTop = height + 3;
      gauge = (
        <div className="progress-gauge" style={style}>
          today
        </div>
      );
    }
  }
  if (props.small) {
    className += " small";
  }
  // const hoverText = `${props.amount.formatted()} / ${props.total.formatted()}`;
  return (
    <div
      className={`progress-bar ${className} ${props.className || ""}`}
      style={{ height }}
    >
      <div className="progress" style={{ width: `${pct}%` }}>
        {/*<span className="progress-text">{hoverText}</span>*/}
        {gauge}
      </div>
    </div>
  );
};
