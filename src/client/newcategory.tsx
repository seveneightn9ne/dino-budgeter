import * as React from "react";
import { AddCategory } from "../shared/api";
import { Category, FrameIndex } from "../shared/types";
import { CategoryMap } from "./category_utils";
import KeyPress from "./components/keypress";
import * as util from "./util";

interface NewCategoryProps {
  frame: FrameIndex;
  onAddCategory: (category: Category) => void;
  categories: Category[];
}
interface NewCategoryState {
  expanded: boolean;
  value: string;
  parent: string;
}

export default class NewCategory extends KeyPress<
  NewCategoryProps & NewCategoryProps,
  NewCategoryState
> {
  public state = { expanded: false, value: "", parent: "" };

  public expand = () => {
    this.setState({ expanded: true });
    return true; // stop propagation
  };

  public collapse = () => {
    this.unRegisterKeyPress();
    this.setState({ expanded: false });
  };

  public updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ value: event.target.value });
  };

  private updateParent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ parent: e.target.value });
  };

  public submit = (event: React.FormEvent) => {
    util
      .apiFetch({
        api: AddCategory,
        body: {
          frame: this.props.frame,
          name: this.state.value,
          parent: this.state.parent || undefined,
        },
      })
      .then((response) => {
        this.props.onAddCategory(response);
        this.setState({ expanded: false, value: "", parent: "" });
      });
    event.preventDefault();
  };

  public onEscape = () => {
    this.collapse();
  };

  public render() {
    if (!this.state.expanded) {
      return (
        <span onClick={this.expand} className="clickable new-category">
          <span className="fa-plus-circle fas"></span> Category
        </span>
      );
    }
    const categoryOptions = new CategoryMap({
      categories: this.props.categories,
      zeroValue: "Nest under...",
    }).options();
    return (
      <form onSubmit={this.submit}>
        <span
          className="new-category-close clickable fa-times fas"
          onClick={this.collapse}
        />
        <input
          onFocus={this.registerKeyPress}
          type="text"
          placeholder="New Category"
          autoFocus={true}
          value={this.state.value}
          onChange={this.updateValue}
        />
        <select value={this.state.parent} onChange={this.updateParent}>
          {categoryOptions}
        </select>
        <input type="submit" disabled={!this.state.value} value="Add" />
      </form>
    );
  }
}
