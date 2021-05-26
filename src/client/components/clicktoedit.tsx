import * as React from "react";
import { API, EmptyResponse } from "typescript-json-api/dist/shared/api";
import Money from "../../shared/Money";
import { formatDate } from "../../shared/util";
import { CategoryMap } from "../category_utils";
import * as util from "../util";

interface ClickToEditProps<
  Request extends object,
  K extends keyof Request,
  V extends Request[K]
> {
  value: V;
  onChange: (newVal: V) => void;
  className?: string;
  textClassName?: string;
  // The |{} is a hack because typescript doesn't correctly infer the Response type of API2s with an emptySchema.
  api: API<Request, EmptyResponse | {}>;
  postData?: Pick<Request, Exclude<keyof Request, K>>;
  postKey: K;
  open?: boolean;
  onProvisionalChange?: (newVal: V) => void;
  editable?: boolean;
  displayValue?: V;
  prefixOnEdit?: string;
}

interface ClickToEditInputProps<
  Request extends object,
  K extends keyof Request,
  V extends Request[K]
> extends ClickToEditProps<Request, K, V> {
  size?: number;
}

type Value<
  Request extends object,
  K extends keyof Request,
  V
> = Request[K] extends V ? Request[K] : any;

interface ClickToEditDropdownProps<
  Request extends object,
  K extends keyof Request
> extends ClickToEditProps<Request, K, Value<Request, K, string>> {
  values: CategoryMap;
  postTransform?: (val: string) => string;
}

interface ClickToEditState {
  editing: boolean;
  eventListener?: (e: KeyboardEvent) => boolean;
  newValue?: string;
  newValueErr?: boolean;
}

abstract class ClickToEdit<
  Request extends object,
  K extends keyof Request,
  V extends Request[K],
  P extends ClickToEditProps<Request, K, V>
> extends React.Component<P, ClickToEditState> {
  protected abstract saveStyle: React.CSSProperties;
  protected abstract blur: () => void;

  constructor(props: P) {
    super(props);
    if (props.open) {
      this.installEscapeListener();
    }
    this.state = {
      editing: !!props.open,
    };
  }

  public componentWillUnmount() {
    this.uninstallEscapeListener();
  }


  public render() {
    const prefix = this.state.editing && this.props.prefixOnEdit ?
      <span className="cte-prefix">{this.props.prefixOnEdit}</span> : null;
    const val = this.state.editing ? (
        <form className="cte" onBlur={this.blur} onSubmit={this.saveNewValue}>
          {this.renderInput()}
          <input type="submit" value="Save" style={this.saveStyle} />
        </form>
    ) : (
      <span className={"clickable editable formatted " + (this.props.textClassName || "")} onClick={this.edit}>
        {this.formatDisplay(this.props.displayValue || this.props.value)}
      </span>
    );
    return (
      <React.Fragment>
        {prefix}
        <span className={this.props.className} onClick={this.captureClicks}>
          {val}
        </span>
      </React.Fragment>
    );
  }

  protected abstract validateChange(val: V): boolean;
  protected abstract fromInput(val: string): V;
  protected abstract formatDisplay(val: V): string;
  protected abstract renderInput(): JSX.Element;
  protected abstract getInitialValue(): string;

  protected postTransform(v: V): V {
    return v;
  }

  protected edit = (e: React.MouseEvent<any>): void => {
    e.stopPropagation();
    if (this.props.editable === false) {
      return;
    }
    this.installEscapeListener();
    this.setState({ editing: true, newValue: this.getInitialValue() });
  }

  protected endEdit(): void {
    this.uninstallEscapeListener()
    this.setState({ editing: !!this.props.open });
  }

  private installEscapeListener() {
    const escFunction = (e: KeyboardEvent) => {
      if(e.key=='Escape'||e.key=='Esc'||e.keyCode==27) {
        this.blur()
        e.preventDefault();
        return false;
      }
    }
    document.addEventListener("keydown", escFunction, false);
    this.setState({eventListener: escFunction});
  }

  private uninstallEscapeListener() {
    if (this.state.eventListener) {
      document.removeEventListener("keydown", this.state.eventListener, false);
    }
  }

  protected updateValue(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    cb?: () => void,
  ): void {
    if (this.props.onProvisionalChange) {
      this.props.onProvisionalChange(this.fromInput(event.target.value));
    }
    this.setState({ newValue: event.target.value, newValueErr: false }, cb);
  }

  protected saveNewValue = (event?: React.FormEvent): void => {
    if (event) {
      event.preventDefault();
    }
    const newValue = this.fromInput(this.state.newValue);
    if (!this.validateChange(newValue)) {
      this.setState({ newValueErr: true });
      return;
    }
    const body: Request = {
      ...(this.props.postData as object),
    } as Request;
    body[this.props.postKey] = this.postTransform(newValue);
    util
      .apiFetch({
        api: this.props.api,
        body,
      })
      .then(() => {
        this.props.onChange(newValue);
        this.endEdit();
      })
      .catch((err) => {
        console.error(err);
        this.setState({ newValueErr: true });
      });
  }

  private captureClicks = (e: React.MouseEvent<any>) => e.stopPropagation();
}

abstract class ClickToEditInput<
  Request extends object,
  K extends keyof Request,
  V extends Request[K]
> extends ClickToEdit<Request, K, V, ClickToEditInputProps<Request, K, V>> {
  public abstract type: string;
  public abstract toInput(val: V): string;
  public saveStyle = { display: "none" };
  public blur = (): void => {
    this.endEdit();
  }
  public getInitialValue() {
    return "";
  }
  public renderInput() {
    return (
      <input
        type={this.type}
        size={this.props.size}
        autoFocus={true}
        placeholder={this.toInput(this.props.value)}
        value={this.state.newValue}
        onChange={(e) => this.updateValue(e)}
      />
    );
  }
}

export class ClickToEditText<
  Request extends object,
  K extends keyof Request
> extends ClickToEditInput<Request, K, Value<Request, K, string>> {
  public type = "text";
  public validateChange(_val: string): boolean {
    return true;
  }
  public fromInput(val: string): Value<Request, K, string> {
    return val as Value<Request, K, string>;
  }
  public formatDisplay(val: string): string {
    return val;
  }
  public toInput(val: string): string {
    return val;
  }
}

// export const ClickToEditText = withRouter(ClickToEditTextBare);

export class ClickToEditMoney<
  Request extends object,
  K extends keyof Request
> extends ClickToEditInput<Request, K, Value<Request, K, Money>> {
  public type = "text";
  public validateChange(val: Money): boolean {
    return val.isValid();
  }
  public fromInput(val: string): Value<Request, K, Money> {
    return new Money(val) as Value<Request, K, Money>;
  }
  public formatDisplay(val: Money): string {
    return val.formatted();
  }
  public toInput(val: Money): string {
    return val.string();
  }
}

// export const ClickToEditMoney = withRouter(ClickToEditMoneyBare);

export class ClickToEditNumber<
  Request extends object,
  K extends keyof Request
> extends ClickToEditInput<Request, K, Value<Request, K, number>> {
  public type = "number";
  public validateChange(val: number): boolean {
    return !isNaN(val);
  }
  public fromInput(val: string): Value<Request, K, number> {
    return Number(val) as Value<Request, K, number>;
  }
  public formatDisplay(val: number): string {
    return val.toPrecision(3);
  }
  public toInput(val: number): string {
    return val.toPrecision(3);
  }
}
// export const ClickToEditNumber = withRouter(ClickToEditNumberBare);

export class ClickToEditDate<
  Request extends object,
  K extends keyof Request
> extends ClickToEditInput<Request, K, Value<Request, K, Date>> {
  public type = "date";
  public validateChange(val: Date): boolean {
    return !isNaN(val.valueOf());
  }
  public fromInput(val: string): Value<Request, K, Date> {
    return util.fromYyyymmdd(val) as Value<Request, K, Date>;
  }
  public formatDisplay(val: Date): string {
    return formatDate(val);
  }
  public toInput(val: Date): string {
    return util.yyyymmdd(val);
  }
  public renderInput() {
    return (
      <input
        type={this.type}
        size={this.props.size}
        autoFocus={true}
        placeholder={this.toInput(this.props.value)}
        value={this.state.newValue}
        onChange={(e) => this.updateValue(e)}
      />
    );
  }
}
// export const ClickToEditDate = withRouter(ClickToEditDateBare);

// type CTEDP<R, K extends keyof R> = ClickToEditDropdownProps<R, K> & RouteComponentProps<ClickToEditDropdownProps<R, K>>;
export class ClickToEditDropdown<
  Request extends object,
  K extends keyof Request
> extends ClickToEdit<
  Request,
  K,
  Value<Request, K, string>,
  ClickToEditDropdownProps<Request, K>
> {
  public saveStyle = { display: "none" };
  constructor(props: ClickToEditDropdownProps<Request, K>) {
    super(props);
    this.state = { ...this.state, newValue: this.getInitialValue(props) };
  }
  public getInitialValue(props = this.props) {
    return props.value || "";
  }
  public blur = (): void => {};

  public validateChange(val: string): boolean {
    return this.props.values.get(val) != undefined;
  }
  public postTransform(
    val: Value<Request, K, string>,
  ): Value<Request, K, string> {
    if (this.props.postTransform) {
      return this.props.postTransform(val) as Value<Request, K, string>;
    }
    return val;
  }
  public fromInput(val: string): Value<Request, K, string> {
    return val as Value<Request, K, string>;
  }
  public formatDisplay(val: string): string {
    return this.props.values.get(val);
  }
  public onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value == "") {
      return;
    }
    this.updateValue(e, () => {
      this.saveNewValue();
    });
  }
  public renderInput() {
    const options = this.props.values.options();
    return (
      <select
        autoFocus={true}
        onChange={this.onChange}
        value={this.state.newValue}
      >
        {options}
      </select>
    );
  }
}
// export const ClickToEditDropdown = withRouter(ClickToEditDropdownBare);
