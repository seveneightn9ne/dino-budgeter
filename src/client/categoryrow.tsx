import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category, CategoryId } from '../shared/types';
import TxEntry from './txentry'
import * as frames from '../shared/frames';

interface CategoryRowProps {
    category: Category;
    onDeleteCategory: (id: CategoryId) => void;
}
interface CategoryRowState {}

export default class CategoryRow extends React.Component<CategoryRowProps, CategoryRowState> {

    delete(): boolean {
        fetch('/api/category', {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                id: this.props.category.id,
            }),
        }).then(response => {
            this.props.onDeleteCategory(this.props.category.id);
        });
        return true;
    }

    render() {
        return <tr key={this.props.category.id}>
            <td><a href="#" onClick={() => this.delete()}>X</a></td>
            <td>{this.props.category.name}</td>
        </tr>;
    }
}
