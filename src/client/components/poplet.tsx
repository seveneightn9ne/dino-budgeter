import * as React from "react";

interface Props {
    text: React.ReactNode;
    title?: string;
    className?: string;
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

    clickOuter() {
        this.close();
    }

    clickInner(event: React.MouseEvent<HTMLElement>) {
        event.stopPropagation();
    }

    render(): JSX.Element {
        let className = "poplet";
        if (this.props.className) className += " " + this.props.className;
        const pop = <div className="poplet-background" onClick={() => this.clickOuter()}>
            <div className={className} onClick={(e) => this.clickInner(e)}>
                <span className="close clickable fa-times fas" onClick={() => this.close()} />
                {this.props.children}
            </div>
        </div>;
        return <span className={this.props.className}><span title={this.props.title} className="clickable" onClick={this.open.bind(this)}>
            {this.props.text}</span>
            {this.state.open ? pop : null}
        </span>;

    }
}