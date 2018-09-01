import * as React from 'react';
import { AI } from '../shared/ai';

interface AIProps {
    ai: AI;
}

export default class AIComponent extends React.Component<AIProps, {}> {
    render() {
        return <div className="ai">{this.props.ai.message()}</div>
    }
}