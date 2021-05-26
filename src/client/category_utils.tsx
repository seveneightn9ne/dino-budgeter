import * as React from "react";
import { Category } from "../shared/types";
import _ from "lodash";

interface Props {
  categories: Category[],
  filterCat?: (cat: Category) => boolean,
  formatCat: (cat: Category) => string,
  zeroValue: string,
  extraItems?: [string, string][],
}

const defaults = {
  filterCat: (_: Category) => true,
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
        this.props.categories.filter(this.props.filterCat).forEach((cat) =>
          options.push(
            <option key={cat.id} value={cat.id}>
              {this.props.formatCat(cat)}
            </option>,
          ),
        );
        return options;
    }
}