import * as React from 'react';

export default class TxEntry extends React.Component<any, any> {
    render() {
        return <div>
            <label>Amount:</label>
            <input name="amount"/>
            <label>Description:</label>
            <input name="amount"/>
            <button>Add</button>
        </div>;
    }
}
