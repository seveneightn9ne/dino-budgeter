import * as React from "react";
import { Category } from "../shared/types";
import CategoryRow, { CategoryRowProps } from "./categoryrow";

export default class CategorySection extends React.Component<
  CategoryRowProps,
  {}
> {
  private children = (): Category[] => {
    return this.props.categories.filter(
      (c) => c.parent === this.props.category.id,
    );
  };

  public render() {
    const children = this.children();
    if (children.length === 0) {
      return <CategoryRow {...this.props} />;
    }

    return this.renderChildren();
  }

  private renderChildren() {
    const children = this.children()
      .map((c) => ({
        ...this.props,
        category: c,
        key: c.id,
      }))
      .map((props) => <CategoryRow key={props.key} {...props} />);
    return <React.Fragment>{children}</React.Fragment>;
  }
}
