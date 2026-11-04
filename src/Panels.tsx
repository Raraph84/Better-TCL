import { Fragment, useEffect, useState } from "react";
import { Panel } from "./Panel.js";

export const LinePanel = ({
    line,
    setPanel,
    setForcedLines
}: {
    line: any;
    setPanel: (panel: { type: any; id?: number } | null) => void;
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
            <div className="section-title">Trajets</div>
            <div className="trips">
                {fullLine?.trips.map((trip: any, i: number) => (
                    <Fragment key={i}>
                        {new Date(trip.stops[0].time).getDate() !==
                            new Date(fullLine.trips[i - 1]?.stops[0].time ?? Date.now()).getDate() && (
                            <div className="section-subtitle">Demain</div>
                        )}
                        <button className="double" onClick={() => setPanel({ type: "trip", id: line.id })}>
                            <span>
                                <div>Direction</div>
                                <div>
                                    {fullLine.stops.find((s: any) => s.id === trip.stops.slice(-1)[0].stopId).name}
                                </div>
                            </span>
                            <span style={{ whiteSpace: "nowrap" }}>
                                {formatTime(new Date(trip.stops[0].time))} -{" "}
                                {formatTime(new Date(trip.stops.slice(-1)[0].time))}
                            </span>
                        </button>
                    </Fragment>
                ))}
            </div>

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
                    <button key={stop.id} className="stop" onClick={() => setPanel({ type: "stop", id: stop.id })}>
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
    setPanel: (panel: { type: any; id?: number } | null) => void;
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

    const nextStops = fullStop?.nextStops.filter(
        (stop: any) => showPreviousStops || stop.time >= Date.now() - 60 * 1000
    );

    return (
        <Panel title={"Arrêt " + (fullStop?.name ?? stop?.name)} open={stop} onClose={() => setPanel(null)}>
            {fullStop?.parent && (
                <button className="button" onClick={() => setPanel({ type: "stop", id: fullStop.parent })}>
                    Voir l'arrêt parent
                </button>
            )}

            <div className="section-title">Lignes</div>
            <div className="lines">
                {fullStop?.lines.map((line: any) => (
                    <button key={line.id} onClick={() => setPanel({ type: "line", id: line.id })} className="double">
                        <span>
                            Ligne <LineBadge line={line} />
                        </span>
                        <span>
                            {line.directions.map((direction: any) => (
                                <div key={direction}>
                                    {line.stops.filter((s: any) => s.direction === direction).slice(-1)[0].name}
                                </div>
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
                    const line = fullStop.lines.find((line: any) => line.id === nextStop.lineId);
                    const directionStops = line.stops.filter((stop: any) => stop.direction === nextStop.direction);
                    return (
                        <Fragment key={i}>
                            {new Date(nextStop.time).getDate() !==
                                new Date(nextStops[i - 1]?.time ?? Date.now()).getDate() && (
                                <div className="section-subtitle">Demain</div>
                            )}
                            <button
                                onClick={() => setPanel({ type: "trip", id: line.id })}
                                style={
                                    nextStop.time >= Date.now() - 60 * 1000
                                        ? {}
                                        : { backgroundColor: "rgba(255, 255, 255, 0.1)" }
                                }
                            >
                                <span>
                                    <div>
                                        Ligne <LineBadge line={line} />
                                    </div>
                                    <div>Vers {directionStops.slice(-1)[0].name}</div>
                                </span>
                                <span>{formatTime(new Date(nextStop.time))}</span>
                            </button>
                        </Fragment>
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
    setPanel: (panel: { type: any; id?: number } | null) => void;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const [fullTrip, setFullTrip] = useState<any>(null);

    useEffect(() => {
        if (!trip) return;
        setFullTrip(trip);
        setForcedLines([trip.line.id]);
        return () => setForcedLines(null);
    }, [trip?.line]);

    return (
        <Panel
            title={"Trajet - Ligne " + (trip?.line.shortName ?? fullTrip?.line.shortName)}
            open={trip}
            onClose={() => setPanel(null)}
        >
            <button className="button" onClick={() => setPanel({ type: "line", id: trip?.line.id })}>
                Voir la ligne
            </button>
        </Panel>
    );
};

const formatTime = (time: Date) =>
    `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

const LineBadge = ({ line }: { line: any }) => (
    <span
        className="line-badge"
        style={{ backgroundColor: "#" + line.color, color: "#" + (line.textColor || "FFFFFF") }}
    >
        {line.shortName}
    </span>
);
