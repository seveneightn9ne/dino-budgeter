import React, {useState, useEffect} from "react";

/**
 * Initially, props.save should be 0.
 * Whenever you save (want the check mark to flash), update the props.save to Date.now().
 */
export const FadeCheck: React.SFC<{save: number}> = (props) => {
    const [timer, setTimer] = useState(0);
    const [justSavedName, setJustSavedName] = useState(false);

    // Whenever props.save changes...
    useEffect(() => {
        if (props.save != 0) {
            setJustSavedName(true);
            const timer = setTimeout(() => {
                setJustSavedName(false);
            }, 1200) as any;
            setTimer(timer);
        }

        return () => {
            clearInterval(timer);
        }
    }, [props.save]);

    const fadeCheckCls = "fa-check-circle fas fadecheck " + (justSavedName ? "appear" : "hide");
    return <span className={fadeCheckCls} />;

}