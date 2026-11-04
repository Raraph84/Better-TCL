import { useEffect, useRef, useState, type ReactNode } from "react";

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
    const [panelHeight, setPanelHeight] = useState<number>(0);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMobile || !open) return;

        const header = panelRef.current?.querySelector(".panel-header")!;
        const content = panelRef.current?.querySelector(".panel-content")!;

        let panelHeight = 0;
        const updatePanelHeight = (height: number) => {
            panelHeight = height;
            setPanelHeight(height);
        };

        const presets = [0, header.clientHeight, window.innerHeight * 0.4, window.innerHeight * 0.95];
        updatePanelHeight(presets[2]!);

        let grabbed = false;
        let lastY = 0;
        let lastTime = 0;
        let velocity = 0;
        let rafId = 0;

        const startInertia = (initialVelocity: number) => {
            let v = initialVelocity;
            let pos = content.scrollTop;
            const max = content.scrollHeight - content.clientHeight;
            let last = performance.now();

            const step = (now: number) => {
                const dt = now - last;
                last = now;

                pos = Math.min(Math.max(pos + v * dt, 0), max);
                content.scrollTop = pos;
                v *= Math.exp(-dt / 325);

                if (Math.abs(v) < 0.02 || pos === 0 || pos === max) return;
                rafId = requestAnimationFrame(step);
            };
            rafId = requestAnimationFrame(step);
        };

        const handleTouchStart = (event: TouchEvent) => {
            cancelAnimationFrame(rafId);
            grabbed = true;
            lastY = event.touches[0]!.clientY;
            lastTime = event.timeStamp;
            velocity = 0;
        };
        const handleTouchMove = (event: TouchEvent) => {
            if (!grabbed) return;

            const deltaY = lastY - event.touches[0]!.clientY;
            const deltaTime = event.timeStamp - lastTime;
            lastY = event.touches[0]!.clientY;
            lastTime = event.timeStamp;
            velocity = 0.8 * (deltaY / deltaTime) + 0.2 * velocity;

            event.preventDefault();
            if (
                panelHeight !== presets[presets.length - 1] ||
                content.scrollHeight === content.clientHeight ||
                !content.contains(event.target as Node) ||
                (deltaY < 0 && content.scrollTop === 0)
            )
                updatePanelHeight(Math.min(panelHeight + deltaY, presets[presets.length - 1]!));
            else content.scrollTop += deltaY;
        };
        const handleTouchEnd = (event: TouchEvent) => {
            if (!grabbed) return;
            grabbed = false;

            if (
                panelHeight !== presets[presets.length - 1] ||
                content.scrollHeight === content.clientHeight ||
                !content.contains(event.target as Node)
            ) {
                const closestPreset = presets.reduce((prev, curr) =>
                    Math.abs(curr - panelHeight) < Math.abs(prev - panelHeight) ? curr : prev
                );
                updatePanelHeight(closestPreset);
                if (closestPreset === 0) onClose();
            } else startInertia(velocity);
        };

        panelRef.current?.addEventListener("touchstart", handleTouchStart);
        panelRef.current?.addEventListener("touchmove", handleTouchMove);
        panelRef.current?.addEventListener("touchend", handleTouchEnd);
        return () => {
            panelRef.current?.removeEventListener("touchstart", handleTouchStart);
            panelRef.current?.removeEventListener("touchmove", handleTouchMove);
            panelRef.current?.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isMobile, open, title]);

    return (
        <div
            ref={panelRef}
            className={`panel ${isMobile ? "panel-mobile" : "panel-desktop"}${open ? " panel-open" : ""}`}
            style={isMobile ? { height: panelHeight } : {}}
        >
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
