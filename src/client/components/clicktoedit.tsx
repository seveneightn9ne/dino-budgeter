import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category, CategoryId } from '../../shared/types';

interface ClickToEditProps {
    value: string;
    validateChange?: (newVal: string) => Promise<boolean>;
    onChange: (newVal: string) => void;
    size?: number;
    formatDisplay?: (value: string) => string;
    className?: string;
}
interface ClickToEditState {
    editing: boolean;
    newValue?: string;
    newValueErr?: boolean;
}

export default class ClickToEdit extends React.Component<ClickToEditProps, ClickToEditState> {

    constructor(props: ClickToEditProps) {
        super(props);
        this.state = {
            editing: false,
        }
    }

    edit(): boolean {
        this.setState({editing: true, newValue: ''});
        return true;
    }

    endEdit(): void {
        this.setState({editing: false});
    }

    updateValue(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({newValue: event.target.value, newValueErr: false});
    }

    async saveNewValue(event: React.FormEvent): Promise<void> {
        const newValue = this.state.newValue;
        if (!await this.props.validateChange(newValue)) {
            this.setState({newValueErr: true});
        } else {
            this.setState({editing: false});
        }
        event.preventDefault();
    }

    render() {
        const formatDisplay = this.props.formatDisplay ? this.props.formatDisplay : (s: string) => s;
        const val = (this.state.editing) 
            ? <form onBlur={this.endEdit.bind(this)} onSubmit={this.saveNewValue.bind(this)}>
                <input type="text" size={this.props.size || 4} autoFocus={true}
                    placeholder={this.props.value} value={this.state.newValue} 
                    onChange={(e) => this.updateValue(e)} />
                <input type="submit" value="Save" /></form>
            : <a href="#" onClick={() => this.edit()}>{formatDisplay(this.props.value)}</a>;
        return <span className={this.props.className}>{val}</span>;
    }
}
