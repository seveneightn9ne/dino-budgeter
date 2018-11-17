import * as React from "react";
import { AI } from "../shared/ai";
import Poplet from "./components/poplet";

interface AIProps {
    ai: AI;
}

export default class AIComponent extends React.Component<AIProps, {}> {
    private poplet: React.RefObject<Poplet>;
    constructor(props: AIProps) {
        super(props);
        this.poplet = React.createRef();
    }
    close() {
        this.poplet.current ? this.poplet.current.close() : null;
    }
    do() {
        if (this.props.ai.action.type != "popup") {
            return;
        }
        this.props.ai.action.do().then(() => {
            if (this.poplet.current) {
                this.poplet.current.close();
            }
        });
    }
    render() {
        let cta = null;
        if (this.props.ai.action) {
            switch (this.props.ai.action.type) {
                case "popup": {
                    cta = <Poplet className="right" text={this.props.ai.cta} ref={this.poplet}>
                        <h2>{this.props.ai.action.title}</h2>
                        <p>{this.props.ai.action.body}</p>
                        <button className="button" onClick={() => this.do()}>{this.props.ai.action.confirm || "Confirm"}</button>
                        <button className="button" onClick={() => this.close()}>{this.props.ai.action.cancel || "Cancel"}</button>
                    </Poplet>;
                    break;
                }
                case "redirect": {
                    // TODO
                }
            }
        }
        return <div className="ai"><span className="fa-star fas"></span>{this.props.ai.message()}{cta}</div>;
    }
}
