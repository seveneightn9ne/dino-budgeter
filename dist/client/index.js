"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const ReactDOM = __importStar(require("react-dom"));
require("./index.css");
class HelloMessage extends React.Component {
    render() {
        return (React.createElement("div", null,
            "Hello ",
            this.props.name));
    }
}
ReactDOM.render(React.createElement(HelloMessage, { name: "Miles" }), document.getElementById('root'));
//# sourceMappingURL=index.js.map