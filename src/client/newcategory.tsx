import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { fromSerialized } from "../shared/categories";
import { Category, FrameIndex } from "../shared/types";
import * as util from "./util";

interface NewCategoryProps {
    frame: FrameIndex;
    onAddCategory: (category: Category) => void;
}
interface NewCategoryState {
    expanded: boolean;
    value: string;
}

class NewCategory extends React.Component<RouteComponentProps<NewCategoryProps> & NewCategoryProps, NewCategoryState> {

    state = {expanded: false, value: ""};

    expand(): boolean {
        this.setState({expanded: true});
        return true; // stop propagation
    }

    updateValue(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({value: event.target.value});
    }

    submit(event: React.FormEvent): void {
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

    render() {
        if (!this.state.expanded) {
            return <span onClick={() => this.expand()} className="clickable new-category"><span className="fa-plus-circle fas"></span> Category</span>;
        }
        return <form onSubmit={this.submit.bind(this)} onBlur={() => this.setState({expanded: false})}>
            <input type="text" placeholder="New Category" autoFocus
                value={this.state.value} onChange={(e) => this.updateValue(e)} />
            <input type="submit" disabled={!this.state.value} value="Add" />
        </form>;
    }
}

export default withRouter(NewCategory);
