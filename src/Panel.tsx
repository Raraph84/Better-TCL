import { useEffect, useState, type ReactNode } from "react";
import { Sheet } from "react-modal-sheet";

type PanelProps = {
    title: string;
    open: boolean;
    onClose: () => void;
    children?: ReactNode;
};

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 768px)");
        const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    return isMobile;
};

export const Panel = ({ title, open, onClose, children }: PanelProps) => {
    const isMobile = useIsMobile();

    const content = (
        <>
            <div className="panel-header">
                <h2 className="panel-title">{title}</h2>
                <button className="panel-close" onClick={onClose} aria-label="Fermer le panel">
                    ✕
                </button>
            </div>
            <div className="panel-content">{children}</div>
        </>
    );

    if (isMobile) {
        return (
            <Sheet isOpen={open} onClose={onClose} detent="content">
                <Sheet.Container>
                    <Sheet.Content>
                        <div className="panel">{content}</div>
                    </Sheet.Content>
                </Sheet.Container>
            </Sheet>
        );
    }

    return <div className={`panel panel-desktop${open ? " panel-open" : ""}`}>{content}</div>;
};
