import * as React from "react";
import { AddCategory } from "../shared/api";
import { Category, FrameIndex } from "../shared/types";
import KeyPress from "./components/keypress";
import * as util from "./util";

interface NewCategoryProps {
  frame: FrameIndex;
  onAddCategory: (category: Category) => void;
}
interface NewCategoryState {
  expanded: boolean;
  value: string;
}

export default class NewCategory extends KeyPress<
  NewCategoryProps & NewCategoryProps,
  NewCategoryState
> {
  public state = { expanded: false, value: "" };

  public expand = () => {
    this.setState({ expanded: true });
    return true; // stop propagation
  }

  public collapse = () => {
    this.unRegisterKeyPress();
    this.setState({ expanded: false });
  }

  public updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ value: event.target.value });
  }

  public submit = (event: React.FormEvent) => {
    util
      .apiFetch({
        api: AddCategory,
        body: {
          frame: this.props.frame,
          name: this.state.value,
        },
      })
      .then((response) => {
        this.props.onAddCategory(response);
        this.setState({ expanded: false, value: "" });
      });
    event.preventDefault();
  }

  public onEscape = () => {
    this.collapse();
  }

  public render() {
    if (!this.state.expanded) {
      return (
        <span onClick={this.expand} className="clickable new-category">
          <span className="fa-plus-circle fas"></span> Category
        </span>
      );
    }
    return (
      <form onSubmit={this.submit}>
        <span
          className="new-category-close clickable fa-times fas"
          onClick={this.collapse}
        />
        <input
          onFocus={this.registerKeyPress}
          onBlur={this.unRegisterKeyPress}
          type="text"
          placeholder="New Category"
          autoFocus={true}
          value={this.state.value}
          onChange={this.updateValue}
        />
        <input type="submit" disabled={!this.state.value} value="Add" />
      </form>
    );
  }
}
