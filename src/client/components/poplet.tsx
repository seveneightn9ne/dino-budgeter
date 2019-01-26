import * as React from "react";

interface PopletProps {
    text: React.ReactNode;
    title?: string;
    className?: string;
}

interface ControlledProps extends PopletProps {
    open: boolean;
    onRequestOpen: () => void;
    onRequestClose: () => void;
}

export class ControlledPoplet extends React.Component<ControlledProps, {}> {

    clickInner = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
    }

    render(): JSX.Element {
        let className = "poplet";
        if (this.props.className) className += " " + this.props.className;
        const pop = <div className="poplet-background" onClick={this.props.onRequestClose}>
            <div className={className} onClick={(e) => this.clickInner(e)}>
                <span className="close clickable fa-times fas" onClick={this.props.onRequestClose} />
                {this.props.children}
            </div>
        </div>;
        return <span className={this.props.className}><span title={this.props.title} className="clickable" onClick={this.props.onRequestOpen}>
            {this.props.text}</span>
            {this.props.open ? pop : null}
        </span>;

    }
}

// Nobody uses this because everyone needs to close the poplet sometimes
export class AutoPoplet extends React.Component<PopletProps, {open: boolean}> {
    state = {
        open: false,
    };

    private close = () => {
        this.setState({open: false});
    }

    private open() {
        this.setState({open: true});
    }

    render(): JSX.Element {
        return <ControlledPoplet 
            {...this.props}
            open={this.state.open}
            onRequestClose={this.close}
            onRequestOpen={this.open}
        />
    }
}