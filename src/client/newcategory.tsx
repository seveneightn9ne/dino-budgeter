import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { fromSerialized } from "../shared/categories";
import { Category, FrameIndex } from "../shared/types";
import * as util from "./util";
import KeyPress from "./components/keypress";

interface NewCategoryProps {
    frame: FrameIndex;
    onAddCategory: (category: Category) => void;
}
interface NewCategoryState {
    expanded: boolean;
    value: string;
}

class NewCategory extends KeyPress<RouteComponentProps<NewCategoryProps> & NewCategoryProps, NewCategoryState> {

    state = {expanded: false, value: ""};

    expand = () => {
        this.setState({expanded: true});
        return true; // stop propagation
    }

    collapse = () => {
        this.unRegisterKeyPress();
        this.setState({expanded: false});
    }

    updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({value: event.target.value});
    }

    submit = (event: React.FormEvent) => {
        util.apiPost({
            path: "/api/category",
            body: {
                frame: this.props.frame,
                name: this.state.value,
            },
            location: this.props.location,
            history: this.props.history,
        }).then(response => {
            this.props.onAddCategory(fromSerialized(response.category));
            this.setState({expanded: false, value: ""});
        });
        event.preventDefault();
    }

    onEscape = () => {
        this.collapse();
    }

    render() {
        if (!this.state.expanded) {
            return <span onClick={this.expand} className="clickable new-category"><span className="fa-plus-circle fas"></span> Category</span>;
        }
        return <form onSubmit={this.submit}>
            <span className="new-category-close clickable fa-times fas" onClick={this.collapse} />
            <input onFocus={this.registerKeyPress} onBlur={this.unRegisterKeyPress} type="text" placeholder="New Category" autoFocus
                value={this.state.value} onChange={this.updateValue} />
            <input type="submit" disabled={!this.state.value} value="Add" />
        </form>;
    }
}

export default withRouter(NewCategory);
