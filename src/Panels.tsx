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
            <div className="section-title">Arrêts</div>
            <button
                className="button direction"
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
    const [showPreviousStops, setShowPreviousStops] = useState(false);

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

    const nextStops = fullStop?.nextStops.filter((stop: any) => showPreviousStops || stop.time >= Date.now());

    return (
        <Panel title={"Arrêt " + (fullStop?.name ?? stop?.name)} open={stop} onClose={() => setPanel(null)}>
            {fullStop?.parent && (
                <button className="button" onClick={() => setPanel({ type: "stop", data: fullStop.parent })}>
                    Voir l'arrêt parent
                </button>
            )}

            <div className="section-title">Lignes</div>
            <div className="lines">
                {fullStop?.lines.map((line: any) => (
                    <button key={line.id} onClick={() => setPanel({ type: "line", data: line })} className="double">
                        <span>Ligne {line.shortName}</span>
                        <span>
                            {line.directions.map((direction: any) => (
                                <div key={direction.direction}>{direction.name}</div>
                            ))}
                        </span>
                    </button>
                ))}
            </div>

            <div className="section-title">Passages</div>
            {fullStop?.nextStops.some((stop: any) => stop.time < Date.now()) && (
                <button className="button" onClick={() => setShowPreviousStops(!showPreviousStops)}>
                    {showPreviousStops ? "Masquer les passages précédents" : "Afficher les passages précédents"}
                </button>
            )}
            <div className="next-stops">
                {nextStops?.map((nextStop: any, i: number) => {
                    const time = `${new Date(nextStop.time).getHours().toString().padStart(2, "0")}:${new Date(nextStop.time).getMinutes().toString().padStart(2, "0")}`;
                    const line = fullStop.lines.find((l: any) => l.id === nextStop.line);
                    const direction = line?.directions.find((d: any) => d.direction === nextStop.direction);
                    return (
                        <button key={i}>
                            <span>
                                <div>Ligne {line.shortName}</div>
                                <div>Vers {direction.name}</div>
                            </span>
                            <span>{time}</span>
                        </button>
                    );
                })}
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
            <button className="button" onClick={() => setPanel({ type: "line", data: trip?.line })}>
                Voir la ligne
            </button>
        </Panel>
    );
};
