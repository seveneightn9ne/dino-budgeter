import * as React from "react";
import { AI } from "../shared/ai";
import { ControlledPoplet } from "./components/poplet";

interface AIProps {
    ai: AI;
}

export default class AIComponent extends React.Component<AIProps, {popletOpen: boolean}> {
    state = {
        popletOpen: false,
    }
    close = () => this.setState({popletOpen: false});
    open = () => this.setState({popletOpen: true});

    do = () => {
        if (this.props.ai.action.type != "popup") {
            return;
        }
        this.props.ai.action.do().then(this.close);
    }
    render() {
        let cta = null;
        if (this.props.ai.action) {
            switch (this.props.ai.action.type) {
                case "popup": {
                    cta = <ControlledPoplet className="right" text={this.props.ai.cta} open={this.state.popletOpen} onRequestClose={this.close} onRequestOpen={this.open}>
                        <h2>{this.props.ai.action.title}</h2>
                        <p>{this.props.ai.action.body}</p>
                        <button className="button" onClick={() => this.do()}>{this.props.ai.action.confirm || "Confirm"}</button>
                        <button className="button" onClick={() => this.close()}>{this.props.ai.action.cancel || "Cancel"}</button>
                    </ControlledPoplet>;
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
