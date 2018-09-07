import * as React from 'react';
import {Money} from '../../shared/types';
import { fromYyyymmdd, yyyymmdd } from '../util';

interface ClickToEditProps<T> {
    value: T;
    onChange: (newVal: T) => void;
    className?: string;
    postTo: string;
    postData?: {[key: string]: any};
    postKey: string;
}
interface ClickToEditInputProps<T> extends ClickToEditProps<T> {
    size?: number;
}
interface ClickToEditDropdownProps extends ClickToEditProps<string> {
    values: Map<string, string>;
}

interface ClickToEditState {
    editing: boolean;
    newValue?: string;
    newValueErr?: boolean;
}

abstract class ClickToEdit<T,P extends ClickToEditProps<T>> extends React.Component<P, ClickToEditState> {

    static defaultProps = {
        size: 4,
        className: '',
        postData: {},
        type: 'text',
    }

    constructor(props: P) {
        super(props);
        this.state = {
            editing: false,
        }
    }
    abstract postTransform(val: T): string;
    abstract validateChange(val: T): boolean;
    abstract fromInput(val: string): T;
    abstract formatDisplay(val: T): string;
    abstract renderInput(): JSX.Element;

    edit(): void {
        this.setState({editing: true, newValue: ''});
    }

    endEdit(): void {
        this.setState({editing: false});
    }

    updateValue(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void {
        this.setState({newValue: event.target.value, newValueErr: false});
    }

    saveNewValue(event: React.FormEvent): void{
        const newValue = this.fromInput(this.state.newValue);
        if (!this.validateChange(newValue)) {
            this.setState({newValueErr: true});
            return;
        }
        // Why did I need to pull out and type postData?
        const postData: {[key: string]: any} = this.props.postData;
        fetch(this.props.postTo, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                ...postData,
                [this.props.postKey]: this.postTransform(newValue),
            }),
        }).then(result => {
            if (result.status != 200) {
                this.setState({newValueErr: true});
            } else {
                this.props.onChange(newValue);
                this.setState({editing: false});
            }
        });
        event.preventDefault();
    }

    render() {
        const val = (this.state.editing)
            ? <form className="cte" onBlur={this.endEdit.bind(this)} onSubmit={this.saveNewValue.bind(this)}>
                {this.renderInput()}
                <input type="submit" value="Save" style={{display: 'none'}} />
                </form>
            : <span className="clickable formatted" onClick={this.edit.bind(this)}>{this.formatDisplay(this.props.value)}</span>;
        return <span className={this.props.className}>{val}</span>;
    }
}

abstract class ClickToEditInput<T> extends ClickToEdit<T, ClickToEditInputProps<T>> {
    abstract type: string;
    abstract toInput(val: T): string;
    renderInput() {
        return <input type={this.type} size={this.props.size} autoFocus={true}
            placeholder={this.toInput(this.props.value)} value={this.state.newValue}
            onChange={(e) => this.updateValue(e)} />;
    }
}

export class ClickToEditText extends ClickToEditInput<string> {
    type = 'text';
    validateChange(val: string): boolean {
        return true;
    }
    postTransform(val: string): string {
        return val;
    }
    fromInput(val: string): string {
        return val;
    }
    formatDisplay(val: string): string {
        return val;
    }
    toInput(val: string): string {
        return val;
    }
}

export class ClickToEditMoney extends ClickToEditInput<Money> {
    type = 'text';
    validateChange(val: Money): boolean {
        return val.isValid();
    }
    postTransform(val: Money): string {
        return val.string();
    }
    fromInput(val: string): Money {
        return new Money(val);
    }
    formatDisplay(val: Money): string {
        return val.formatted();
    }
    toInput(val: Money): string {
        return val.string();
    }
}

export class ClickToEditDate extends ClickToEditInput<Date> {
    type = 'date';
    validateChange(val: Date): boolean {
        return !isNaN(val.valueOf());
    }
    postTransform(val: Date): string {
        return val.valueOf().toString();
    }
    fromInput(val: string): Date {
        return fromYyyymmdd(val);
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

export class ClickToEditDropdown extends ClickToEdit<string, ClickToEditDropdownProps> {
    validateChange(val: string): boolean {
        return this.props.values.get(val) != undefined;
    }
    postTransform(val: string): string {
        return val;
    }
    fromInput(val: string): string {
        return val;
    }
    formatDisplay(val: string): string {
        return this.props.values.get(val);
    }
    renderInput() {
        const options: JSX.Element[] = [];
        this.props.values.forEach((display, val) =>
            options.push(<option key={val} value={val}>{display}</option>));
        return <select autoFocus onChange={(e) => this.updateValue(e)} value={this.props.value}>
            {options}
        </select>;
    }
}
