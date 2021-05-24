import React, { useState, useEffect } from "react";

interface PopletProps {
  text: React.ReactNode;
  title?: string;
  className?: string;
  clickable?: boolean;
}

interface ControlledProps extends PopletProps {
  open: boolean;
  onRequestOpen: () => void;
  onRequestClose: () => void;
}

const stopPropagation = (event: React.MouseEvent<HTMLElement>) =>
  event.stopPropagation();

const onRequestOpen = (props: ControlledProps) => (
  e: React.MouseEvent<any>,
) => {
  e.stopPropagation();
  props.onRequestOpen();
};

const escFunction = (props: ControlledProps) => {
  return (e: KeyboardEvent) => {
    if(props.open && e.key=='Escape'||e.key=='Esc'||e.keyCode==27) {
        props.onRequestClose();
        e.preventDefault();
        return false;
    }
  }
}

export const ControlledPoplet: React.SFC<ControlledProps> = (props) => {

  useEffect(() => {
    const esc = escFunction(props);
    document.addEventListener("keydown", esc, false);
    return () => {
      document.removeEventListener("keydown", esc, false);
    };
  }, [props.open]);

  let className = "poplet";
  if (props.className) {
    className += " " + props.className;
  }
  const pop = (
    <div className="poplet-background" onClick={props.onRequestClose}>
      <div className={className} onClick={stopPropagation}>
        <span
          className="close clickable fa-times fas"
          onClick={props.onRequestClose}
        />
        {props.children}
      </div>
    </div>
  );
  const clickable = props.clickable === false ? "" : "clickable";
  const onClick = onRequestOpen(props);
  return (
    <span className={props.className}>
      <span title={props.title} className={clickable} onClick={onClick}>
        {props.text}
      </span>
      {props.open ? pop : null}
    </span>
  );
};

export function useControlPoplet() {
  const [isOpen, setIsOpen] = useState(null);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}

// Nobody uses this because everyone needs to close the poplet sometimes
export const AutoPoplet: React.SFC<PopletProps> = (props) => {
  const { isOpen, open, close } = useControlPoplet();
  return (
    <ControlledPoplet
      {...props}
      open={isOpen}
      onRequestClose={close}
      onRequestOpen={open}
    />
  );
};
