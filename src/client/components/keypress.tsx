import * as React from "react";

export default class KeyPress<P = {}, S = {}, SS = any> extends React.Component<
  P,
  S,
  SS
> {
  public onEscape: () => void;

  public componentWillUnmount() {
    this.unRegisterKeyPress();
  }

  public registerKeyPress = () => {
    document.addEventListener("keypress", this.onKeyPress, false);
  }

  public unRegisterKeyPress = () => {
    document.removeEventListener("keypress", this.onKeyPress, false);
  }

  public onKeyPress = (event: KeyboardEvent) => {
    if (this.onEscape && event.key == "Escape") {
      this.onEscape();
    }
  }
}
