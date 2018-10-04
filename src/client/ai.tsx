import * as React from 'react';
import { AI } from '../shared/ai';
import Poplet from './components/poplet';

interface AIProps {
    ai: AI;
}

export default class AIComponent extends React.Component<AIProps, {}> {
    render() {
        let cta = null;
        if (this.props.ai.action) {
            switch (this.props.ai.action.type) {
                case 'popup': {
                    cta = <Poplet className="right" text={this.props.ai.cta}>
                        <h2>{this.props.ai.action.title}</h2>
                        <p>{this.props.ai.action.body}</p>
                        <button className="button">{this.props.ai.action.confirm || 'Confirm'}</button>
                        <button className="button">{this.props.ai.action.cancel || 'Cancel'}</button>
                    </Poplet>;
                    break;
                }
                case 'redirect': {
                    // TODO
                }
            }
        }
        return <div className="ai"><span className="fa-star fas"></span>{this.props.ai.message()}{cta}</div>
    }
}
