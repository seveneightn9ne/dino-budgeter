import * as React from "react";
import Media from "react-media";

export class MobileOnly extends React.Component<{}, {}> {
  public render() {
    return <MobileQuery mobile={this.props.children} desktop={null} />;
  }
}

export class DesktopOnly extends React.Component<{}, {}> {
  public render() {
    return <MobileQuery mobile={null} desktop={this.props.children} />;
  }
}

export class MobileQuery extends React.Component<
  { mobile: React.ReactNode; desktop: React.ReactNode },
  {}
> {
  public render() {
    return (
      <Media query="(max-width: 599px)">
        {(isMobile: boolean) =>
          isMobile ? this.props.mobile : this.props.desktop
        }
      </Media>
    );
  }
}
