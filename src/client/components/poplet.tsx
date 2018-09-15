import * as React from 'react';

interface Props {
    text: React.ReactNode;
    title?: string;
}
interface State {
    open: boolean;
}

export default class Poplet extends React.Component<Props, State> {
    state = {
        open: false,
    };

    // Called by ref
    close() {
        this.setState({open: false});
    }

    open() {
        this.setState({open: true});
    }

    render(): JSX.Element {
        const pop = <div className="poplet-background">
            <div className="poplet">
                {this.props.children}
            </div>
        </div>
        return <span><span title={this.props.title} className="clickable" onClick={this.open.bind(this)}>
            {this.props.text}</span>
            {this.state.open ? pop : null}
        </span>;

    }
}