import * as React from "react";
import Money from "../../shared/Money";
import { fromYyyymmdd, yyyymmdd } from "../util";
import * as util from "../util";
import { API2, EmptyResponse } from "../../shared/api";

interface ClickToEditProps<Request extends object, K extends keyof Request, V extends Request[K]> {
    value: V;
    onChange: (newVal: V) => void;
    className?: string;
    api: API2<Request, EmptyResponse|{}>; // The |{} is a hack because typescript doesn't correctly infer the Response type of API2s with an emptySchema.
    postData?: Pick<Request, Exclude<keyof Request, K>>;
    postKey: K;
    open?: boolean;
    onProvisionalChange?: (newVal: V) => void;
}
interface ClickToEditInputProps<Request extends object, K extends keyof Request, V extends Request[K]> extends ClickToEditProps<Request, K, V> {
    size?: number;
}
type Value<Request extends object, K extends keyof Request, V> = Request[K] extends V ? Request[K] : any;
interface ClickToEditDropdownProps<Request extends object, K extends keyof Request> extends ClickToEditProps<Request, K, Value<Request, K, string>> {
    zeroValue: string;
    values: Map<string, string>;
    postTransform?: (val: string) => string;
}

interface ClickToEditState {
    editing: boolean;
    newValue?: string;
    newValueErr?: boolean;
}

abstract class ClickToEdit<Request extends object, K extends keyof Request, V extends Request[K], P extends ClickToEditProps<Request, K, V>> extends React.Component<P, ClickToEditState> {

    static defaultProps = {
        size: 4,
        className: "",
        postData: {},
        type: "text",
    };

    constructor(props: P) {
        super(props);
        this.state = {
            editing: !!props.open,
        };
    }
    abstract validateChange(val: V): boolean;
    abstract fromInput(val: string): V;
    abstract formatDisplay(val: V): string;
    abstract renderInput(): JSX.Element;
    abstract blur(): void;
    abstract saveStyle: React.CSSProperties;
    abstract getInitialValue(): string;

    postTransform(v: V): V {
        return v;
    }

    edit(): void {
        this.setState({editing: true, newValue: this.getInitialValue()});
    }

    endEdit(): void {
        this.setState({editing: !!this.props.open});
    }

    updateValue(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, cb?: () => void): void {
        if (this.props.onProvisionalChange) {
            this.props.onProvisionalChange(this.fromInput(event.target.value));
        }
        this.setState({newValue: event.target.value, newValueErr: false}, cb);
    }

    saveNewValue(event?: React.FormEvent): void {
        console.log("Save new value");
        if (event) event.preventDefault();
        const newValue = this.fromInput(this.state.newValue);
        if (!this.validateChange(newValue)) {

            this.setState({newValueErr: true});
            return;
        }
        const body: Request = {
            ...(this.props.postData as object)
        } as Request;
        body[this.props.postKey] = this.postTransform(newValue);
        util.apiFetch({
            api: this.props.api,
            body,
        }).then(() => {
            this.props.onChange(newValue);
            this.endEdit();
        }).catch((err) => {
            console.error(err);
            this.setState({newValueErr: true});
        });
    }

    render() {
        const val = (this.state.editing)
            ? <form className="cte" onBlur={this.blur.bind(this)} onSubmit={this.saveNewValue.bind(this)}>
                {this.renderInput()}
                <input type="submit" value="Save" style={this.saveStyle} />
                </form>
            : <span className="clickable editable formatted" onClick={this.edit.bind(this)}>{this.formatDisplay(this.props.value)}</span>;
        return <span className={this.props.className}>{val}</span>;
    }
}

abstract class ClickToEditInput<Request extends object, K extends keyof Request, V extends Request[K]> extends ClickToEdit<Request, K, V, ClickToEditInputProps<Request, K, V>> {
    abstract type: string;
    abstract toInput(val: V): string;
    saveStyle = {display: "none"};
    blur(): void {
        this.endEdit();
    }
    getInitialValue() {
        return "";
    }
    renderInput() {
        return <input type={this.type} size={this.props.size} autoFocus={true}
            placeholder={this.toInput(this.props.value)} value={this.state.newValue}
            onChange={(e) => this.updateValue(e)} />;
    }
}

export class ClickToEditText<Request extends object, K extends keyof Request> extends ClickToEditInput<Request, K, Value<Request, K, string>> {
    type = "text";
    validateChange(_val: string): boolean {
        return true;
    }
    fromInput(val: string): Value<Request, K, string> {
        return val as Value<Request, K, string>;
    }
    formatDisplay(val: string): string {
        return val;
    }
    toInput(val: string): string {
        return val;
    }
}

//export const ClickToEditText = withRouter(ClickToEditTextBare);

export class ClickToEditMoney<Request extends object, K extends keyof Request> extends ClickToEditInput<Request, K, Value<Request, K, Money>> {
    type = "text";
    validateChange(val: Money): boolean {
        return val.isValid();
    }
    fromInput(val: string): Value<Request, K, Money> {
        return new Money(val) as Value<Request, K, Money>;
    }
    formatDisplay(val: Money): string {
        return val.formatted();
    }
    toInput(val: Money): string {
        return val.string();
    }
}

//export const ClickToEditMoney = withRouter(ClickToEditMoneyBare);

export class ClickToEditNumber<Request extends object, K extends keyof Request> extends ClickToEditInput<Request, K, Value<Request, K, number>> {
    type = "number";
    validateChange(val: number): boolean {
        return !isNaN(val);
    }
    fromInput(val: string): Value<Request, K, number> {
        return Number(val) as Value<Request, K, number>;
    }
    formatDisplay(val: number): string {
        return val.toPrecision(3);
    }
    toInput(val: number): string {
        return val.toPrecision(3);
    }
}
//export const ClickToEditNumber = withRouter(ClickToEditNumberBare);

export class ClickToEditDate<Request extends object, K extends keyof Request> extends ClickToEditInput<Request, K, Value<Request, K, Date>> {
    type = "date";
    validateChange(val: Date): boolean {
        return !isNaN(val.valueOf());
    }
    fromInput(val: string): Value<Request, K, Date> {
        return fromYyyymmdd(val) as Value<Request, K, Date>;
    }
    formatDisplay(val: Date): string {
        return `${val.getMonth() + 1}/${val.getDate()}/${val.getFullYear()}`;
    }
    toInput(val: Date): string {
        return yyyymmdd(val);
    }
    renderInput() {
        return <input type={this.type} size={this.props.size} autoFocus={true}
            placeholder={this.toInput(this.props.value)} value={this.state.newValue}
            onChange={(e) => this.updateValue(e)} />;
    }
}
//export const ClickToEditDate = withRouter(ClickToEditDateBare);


//type CTEDP<R, K extends keyof R> = ClickToEditDropdownProps<R, K> & RouteComponentProps<ClickToEditDropdownProps<R, K>>;
export class ClickToEditDropdown<Request extends object, K extends keyof Request> extends ClickToEdit<Request, K, Value<Request, K, string>, ClickToEditDropdownProps<Request, K>> {
    saveStyle = {display: "none"};
    constructor(props: ClickToEditDropdownProps<Request, K>) {
        super(props);
        this.state = {...this.state, newValue: this.getInitialValue(props)};
    }
    getInitialValue(props = this.props) {
        return props.value || "";
    }
    blur(): void {

    }
    validateChange(val: string): boolean {
        return this.props.values.get(val) != undefined;
    }
    postTransform(val: Value<Request, K, string>): Value<Request, K, string> {
        if (this.props.postTransform) {
            return this.props.postTransform(val) as Value<Request, K, string>;
        }
        return val;
    }
    fromInput(val: string): Value<Request, K, string> {
        return val as Value<Request, K, string>;
    }
    formatDisplay(val: string): string {
        if (val == "") {
            return this.props.zeroValue;
        }
        return this.props.values.get(val);
    }
    onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value == "") {
            return;
        }
        this.updateValue(e, () => {
            this.saveNewValue();
        });
    }
    renderInput() {
        const options: JSX.Element[] = [
            <option key="" value="">{this.props.zeroValue}</option>
        ];
        this.props.values.forEach((display, val) =>
            options.push(<option key={val} value={val}>{display}</option>));
        return <select autoFocus onChange={this.onChange} value={this.state.newValue}>
            {options}
        </select>;
    }
}
//export const ClickToEditDropdown = withRouter(ClickToEditDropdownBare);
