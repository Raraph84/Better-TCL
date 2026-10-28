import { useEffect, useState } from "react";
import { Panel } from "./Panel.js";

export const LinePanel = ({
    line,
    setPanel,
    setForcedLines
}: {
    line: any;
    setPanel: (panel: { type: any; data: any } | null) => void;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const [fullLine, setFullLine] = useState<any>(null);
    const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");

    useEffect(() => {
        if (!line) return;
        setFullLine(null);
        setForcedLines([line.id]);
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines/" + line.id)
            .then((res) => res.json())
            .then((res) => setFullLine(res));
        return () => setForcedLines(null);
    }, [line]);

    const stops = fullLine?.stops.filter((stop: any) => stop.direction === direction);

    return (
        <Panel title={"Ligne " + (fullLine?.shortName ?? line?.shortName)} open={line} onClose={() => setPanel(null)}>
            <button
                className="direction"
                onClick={() => setDirection(direction === "outbound" ? "inbound" : "outbound")}
            >
                <span>
                    Direction
                    <br />
                    {stops?.[stops.length - 1].name}
                </span>
                <i className="fa-solid fa-repeat" />
            </button>
            <div className="stops">
                {stops?.map((stop: any) => (
                    <button key={stop.id} className="stop" onClick={() => setPanel({ type: "stop", data: stop })}>
                        {stop.name}
                    </button>
                ))}
            </div>
        </Panel>
    );
};

export const StopPanel = ({
    stop,
    setPanel,
    setForcedLines
}: {
    stop: any;
    setPanel: (panel: { type: any; data: any } | null) => void;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const [fullStop, setFullStop] = useState<any>(null);

    useEffect(() => {
        if (!stop) return;
        setFullStop(null);
        setForcedLines([]);
        fetch(import.meta.env.VITE_SERVER_HOST + "/stops/" + stop.id)
            .then((res) => res.json())
            .then((res) => {
                setFullStop(res);
                setForcedLines(res.lines.map((line: any) => line.id));
            });
        return () => setForcedLines(null);
    }, [stop]);

    return (
        <Panel title={"Arrêt " + (fullStop?.name ?? stop?.name)} open={stop} onClose={() => setPanel(null)}>
            <div className="lines">
                {fullStop?.lines.map((line: any) => (
                    <button key={line.id} className="line" onClick={() => setPanel({ type: "line", data: line })}>
                        Ligne {line.shortName}
                    </button>
                ))}
            </div>
        </Panel>
    );
};

export const TripPanel = ({
    trip,
    setPanel,
    setForcedLines
}: {
    trip: any;
    setPanel: (panel: { type: any; data: any } | null) => void;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const [fullTrip, setFullTrip] = useState<any>(null);

    useEffect(() => {
        if (!trip) return;
        setFullTrip(trip);
        setForcedLines([trip.line.id]);
        return () => setForcedLines(null);
    }, [trip]);

    return (
        <Panel
            title={"Service - Ligne " + (trip?.line?.shortName ?? fullTrip?.line.shortName)}
            open={trip}
            onClose={() => setPanel(null)}
        >
            <button onClick={() => setPanel({ type: "line", data: trip?.line })}>Voir la ligne</button>
        </Panel>
    );
};
