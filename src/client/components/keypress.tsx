import * as React from "react";

export default class KeyPress<P = {}, S = {}, SS = any> extends React.Component<P, S, SS> {

    onEscape: () => void;

    componentWillUnmount(){
        this.unRegisterKeyPress();
    }

    registerKeyPress = () => {
        document.addEventListener("keypress", this.onKeyPress, false);
    }

    unRegisterKeyPress = () => {
        document.removeEventListener("keypress", this.onKeyPress, false);
    }

    onKeyPress = (event: KeyboardEvent) => {
        if (this.onEscape && event.key == "Escape") {
            this.onEscape();
        }
    }
}
