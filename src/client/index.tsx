import * as React from 'react';
import * as ReactDOM from 'react-dom';

import './index.css';

class HelloMessage extends React.Component<any, any> {
    render() {
        return (
        <div>
            Hello {this.props.name}
        </div>
        );
    }
}
  
ReactDOM.render(
    <HelloMessage name="Miles" />,
    document.getElementById('root') as HTMLElement
);