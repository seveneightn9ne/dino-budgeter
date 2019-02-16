
import * as React from "react";

export const Blob: React.SFC<{ title: string, amount: JSX.Element | string, bold?: boolean }> = (props) => (
    <div className={"blob" + (props.bold ? " bold" : "")}>
        <div className="title">{props.title}</div>
        <div className="amount">{props.amount}</div>
    </div>);

export const BlobOp: React.SFC<{ op: string }> = (props) =>
    <div className="blob-op">{props.op}</div>;
