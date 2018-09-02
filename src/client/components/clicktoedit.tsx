import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category, CategoryId } from '../../shared/types';

interface ClickToEditProps {
    value: string;
    validateChange?: (newVal: string) => boolean;
    onChange: (newVal: string) => void;
    size?: number;
    formatDisplay?: (value: string) => string;
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

export default class ClickToEdit extends React.Component<ClickToEditProps, ClickToEditState> {

    static defaultProps = {
        validateChange: (val: string) => true,
        formatDisplay: (val: string) => val,
        size: 4,
        className: '',
        postData: {},
    }

    constructor(props: ClickToEditProps) {
        super(props);
        this.state = {
            editing: false,
        }
    }

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
        console.log("save new value");
        const newValue = this.state.newValue;
        if (!this.props.validateChange(newValue)) {
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
                [this.props.postKey]: newValue,
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
        const formatDisplay = this.props.formatDisplay ? this.props.formatDisplay : (s: string) => s;
        const val = (this.state.editing) 
            ? <form onBlur={this.endEdit.bind(this)} onSubmit={this.saveNewValue.bind(this)}>
                <input type="text" size={this.props.size || 4} autoFocus={true}
                    placeholder={this.props.value} value={this.state.newValue} 
                    onChange={(e) => this.updateValue(e)} />
                </form>
            : <span className="clickable" onClick={this.edit.bind(this)}>{formatDisplay(this.props.value)}</span>;
        return <span className={this.props.className}>{val}</span>;
    }
}
