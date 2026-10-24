import type { ReactNode } from "react";

type PanelProps = {
    title: string;
    open: boolean;
    onClose: () => void;
    children?: ReactNode;
};

export const Panel = ({ title, open, onClose, children }: PanelProps) => {
    return (
        <div className={`panel${open ? " panel-open" : ""}`}>
            <div className="panel-header">
                <h2 className="panel-title">{title}</h2>
                <button className="panel-close" onClick={onClose} aria-label="Fermer le panel">
                    ✕
                </button>
            </div>
            <div className="panel-content">{children}</div>
        </div>
    );
};