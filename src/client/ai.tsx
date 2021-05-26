import * as React from "react";
import { AI, ChooseCategory } from "../shared/ai";
import { BudgetingMove } from "../shared/api";
import Money from "../shared/Money";
import { Category, CategoryId } from "../shared/types";
import { enforceExhaustive } from "../shared/util";
import { CategoryMap } from "./category_utils";
import { ClickToEditDropdown } from "./components/clicktoedit";
import { ControlledPoplet } from "./components/poplet";

interface GenericAIProps {
  ai: AI<null>;
}
interface ChooseCategoryProps {
  ai: AI<ChooseCategory>;
  categories: Category[];
  onChangeCategory: (c: Category) => void;
  onAddToSavings: (amt: Money) => void;
}
type AIProps = GenericAIProps | ChooseCategoryProps;

export default class AIComponent<
  Props extends AIProps = GenericAIProps
> extends React.Component<Props, { popletOpen: boolean }> {
  public state = {
    popletOpen: false,
  };
  public render() {
    const cta = this.renderCTA();
    return (
      <div className="ai">
        <span className="fa-star fas" />
        {this.props.ai.message()}
        {cta}
      </div>
    );
  }

  protected renderCTA(): JSX.Element {
    if (!this.props.ai.action) {
      return null;
    }
    throw Error(
      "rendering CTA with unknown action type: " + this.props.ai.action.type,
    );
  }
}

export class CategoryAI extends AIComponent<ChooseCategoryProps> {
  protected renderCTA(): JSX.Element {
    return (
      <ControlledPoplet
        className="right"
        text={this.props.ai.cta}
        open={this.state.popletOpen}
        onRequestClose={this.close}
        onRequestOpen={this.open}
      >
        <h2>{this.props.ai.action.title}</h2>

        <Dropdown
          ai={this.props.ai}
          cs={this.props.categories}
          onSendBalance={this.onSendBalance}
        />
      </ControlledPoplet>
    );
  }

  private onSendBalance = (destination: CategoryId | "savings") => {
    this.close(); // the prop changes should close this anyway
    const balance = this.props.ai.action.subtype.balance;

    if (destination === "savings") {
      this.props.onAddToSavings(balance);
    } else {
      const cs = this.props.categories.filter((c) => c.id === destination);
      if (cs.length !== 1) {
        throw Error(
          "onSendBalance called with bad destination: " + destination,
        );
      }
      const cat = { ...cs[0] };
      console.log(
        "Modifying balance of category from " +
          cat.balance.string() +
          " and budget " +
          cat.budget.string(),
      );
      console.log("Adding " + balance.string());
      cat.budget = cat.budget.plus(balance);
      cat.balance = cat.balance.plus(balance);
      console.log(
        "ResulT: balance:" +
          cat.balance.string() +
          " budget: " +
          cat.budget.string(),
      );
      this.props.onChangeCategory(cat);
    }
  }

  private open = () => this.setState({ popletOpen: true });
  private close = () => this.setState({ popletOpen: false });
}

function Dropdown(props: {
  ai: AI<ChooseCategory>;
  cs: Category[];
  onSendBalance: (d: string) => void;
}) {
  switch (props.ai.action.subtype.type) {
    case "sendBalance": {
      return (
        <ClickToEditDropdown
          open={true}
          values={categoryMap(props.cs)}
          value=""
          api={BudgetingMove}
          postKey="to"
          postData={{
            from: "",
            frame: props.ai.frame,
            amount: props.ai.action.subtype.balance,
          }}
          onChange={props.onSendBalance}
        />
      );
    }
    default:
      enforceExhaustive(props.ai.action.subtype.type);
  }
}

function categoryMap(cs: Category[]) {
  return new CategoryMap({
    categories: cs,
    formatCat: (c) => c.name,
    zeroValue: "Choose category...",
    extraItems: [["savings", "🏦 Savings"]],
  });
}
