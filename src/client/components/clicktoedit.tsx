import * as React from 'react';
import {Money} from '../../shared/types';
import { fromYyyymmdd, yyyymmdd } from '../util';

interface ClickToEditProps<T> {
    value: T;
    onChange: (newVal: T) => void;
    size?: number;
    className?: string;
    postTo: string;
    postData?: {[key: string]: any};
    postKey: string;
}
interface ClickToEditState {
    editing: boolean;
    newValue?: string;
    newValueErr?: boolean;
}

abstract class ClickToEdit<T> extends React.Component<ClickToEditProps<T>, ClickToEditState> {

    static defaultProps = {
        validateChange: (val: string) => true,
        formatDisplay: (val: string) => val,
        postTransform: (val: string) => val,
        size: 4,
        className: '',
        postData: {},
        type: 'text',
    }

    constructor(props: ClickToEditProps<T>) {
        super(props);
        this.state = {
            editing: false,
        }
    }

    abstract type: string;
    abstract validateChange(val: T): boolean;
    abstract postTransform(val: T): string;
    abstract fromInput(val: string): T;
    abstract formatDisplay(val: T): string;
    abstract toInput(val: T): string;

    edit(): void {
        this.setState({editing: true, newValue: ''});
    }

    endEdit(): void {
        this.setState({editing: false});
    }

    updateValue(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({newValue: event.target.value, newValueErr: false});
    }

    saveNewValue(event: React.FormEvent): void{
        const newValue = this.fromInput(this.state.newValue);
        if (!this.validateChange(newValue)) {
            this.setState({newValueErr: true});
        }
        fetch(this.props.postTo, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                ...this.props.postData,
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
            ? <form onBlur={this.endEdit.bind(this)} onSubmit={this.saveNewValue.bind(this)}>
                <input type={this.type} size={this.props.size} autoFocus={true}
                    placeholder={this.toInput(this.props.value)} value={this.state.newValue} 
                    onChange={(e) => this.updateValue(e)} />
                <input type="submit" value="Save" style={{display: 'none'}} />
                </form>
            : <span className="clickable" onClick={this.edit.bind(this)}>{this.formatDisplay(this.props.value)}</span>;
        return <span className={this.props.className}>{val}</span>;
    }
}

export class ClickToEditText extends ClickToEdit<string> {
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

export class ClickToEditMoney extends ClickToEdit<Money> {
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

export class ClickToEditDate extends ClickToEdit<Date> {
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
}