import React, {useState} from "react";

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

function stopPropagation(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation;
}

export const ControlledPoplet: React.SFC<ControlledProps> = (props) => {
    let className = "poplet";
    if (props.className) className += " " + props.className;
    const pop = <div className="poplet-background" onClick={props.onRequestClose}>
        <div className={className} onClick={stopPropagation}>
            <span className="close clickable fa-times fas" onClick={props.onRequestClose} />
            {props.children}
        </div>
    </div>;
    const clickable = props.clickable === false ? "" : "clickable"
    return <span className={props.className}><span title={props.title} className={clickable} onClick={props.onRequestOpen}>
        {props.text}</span>
        {props.open ? pop : null}
    </span>;
}


export function useControlPoplet() {
    const [isOpen, setIsOpen] = useState(null);
  
    return {
        isOpen: isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false)
    };
  }

// Nobody uses this because everyone needs to close the poplet sometimes
export const AutoPoplet: React.SFC<PopletProps> = (props) => {
    const {isOpen, open, close} = useControlPoplet();
    return <ControlledPoplet 
        {...props}
        open={isOpen}
        onRequestClose={close}
        onRequestOpen={open}
    />
}