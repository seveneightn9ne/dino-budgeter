import * as React from "react";
import { Category } from "../shared/types";
import _ from "lodash";

interface Props {
  categories: Category[],
  filterCat?: (cat: Category) => boolean,
  formatCat?: (cat: Category) => string,
  zeroValue: string,
  extraItems?: [string, string][],
}

const defaults = {
  filterCat: (_: Category) => true,
  formatCat: (c: Category) => c.name,
  extraItems: [] as [string, string][],
}

export class CategoryMap {
    private map = new Map();
    constructor(private props: Props) {
        this.props = _.defaults(props, defaults);
        this.props.categories.forEach((cat) => {
            this.map.set(cat.id, this.props.formatCat(cat));
        });
    }

    public get(id: string) {
        if (id === "") {
          return this.props.zeroValue;
        }
        return this.map.get(id);
    }

    public options(): JSX.Element[] {
        const options: JSX.Element[] = [
          <option key="" value="">{this.props.zeroValue}</option>,
        ];
        this.props.extraItems.forEach(([id, value]) => {
          options.push(
            <option key={id} value={id}>{value}</option>
          );
        });
        this.props.categories
          .filter(this.props.filterCat)
          .filter((c) => !c.parent) // Only root categories
          .forEach((cat) => this.addOptionTree(cat, options));
        return options;
    }

    private addOptionTree(root: Category, options: JSX.Element[], depth = 0) {
      const prefix = "\u00A0\u00A0\u00A0\u00A0".repeat(depth);
      const title = prefix + this.props.formatCat(root);
      console.log(`Depth: ${depth}; Title: ${title}`);
      options.push(
        <option key={root.id} value={root.id} style={{textIndent: 10*depth}}>
          {title}
        </option>,
      );
      this.props.categories
        .filter(this.props.filterCat)
        .filter((c) => c.parent === root.id) // children of root
        .forEach((c) => this.addOptionTree(c, options, depth + 1));
    }
}