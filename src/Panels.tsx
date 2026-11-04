import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel } from "./Panel.js";

export const LinePanel = ({
    line,
    setForcedLines
}: {
    line: any;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const navigate = useNavigate();
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
        <Panel title={"Ligne " + (fullLine?.shortName ?? line?.shortName)} open={line} onClose={() => navigate("/")}>
            <div className="section-title">Trajets</div>
            <div className="trips">
                {fullLine?.trips.map((trip: any, i: number) => (
                    <Fragment key={i}>
                        {new Date(trip.stops[0].time).getDate() !==
                            new Date(fullLine.trips[i - 1]?.stops[0].time ?? Date.now()).getDate() && (
                            <div className="section-subtitle">Demain</div>
                        )}
                        <button onClick={() => navigate("/trips/" + line.id)}>
                            <span>
                                <LineBadge line={fullLine} />{" "}
                                {fullLine.stops.find((s: any) => s.id === trip.stops.slice(-1)[0].stopId).name}
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
                    <button key={stop.id} className="stop" onClick={() => navigate("/stops/" + stop.id)}>
                        {stop.name}
                    </button>
                ))}
            </div>

            <div>Identifiant de ligne: {fullLine?.id}</div>
        </Panel>
    );
};

export const StopPanel = ({
    stop,
    setForcedLines
}: {
    stop: any;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const navigate = useNavigate();
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
        <Panel title={"Arrêt " + (fullStop?.name ?? stop?.name)} open={stop} onClose={() => navigate("/")}>
            {fullStop?.parent && (
                <button className="button" onClick={() => navigate("/stops/" + fullStop.parent)}>
                    Voir l'arrêt parent
                </button>
            )}

            <div className="section-title">Lignes</div>
            <div className="lines">
                {fullStop?.lines.map((line: any) =>
                    line.directions.map((direction: any) => (
                        <button key={line.id + "-" + direction} onClick={() => navigate("/lines/" + line.id)}>
                            <span>
                                <LineBadge line={line} />{" "}
                                {line.stops.filter((s: any) => s.direction === direction).slice(-1)[0].name}
                            </span>
                        </button>
                    ))
                )}
            </div>

            <div className="section-title">Passages</div>
            {fullStop?.nextStops.some((stop: any) => stop.time < Date.now() - 60 * 1000) && (
                <button className="button" onClick={() => setShowPreviousStops(!showPreviousStops)}>
                    {showPreviousStops ? "Masquer les passages précédents" : "Afficher les passages précédents"}
                </button>
            )}
            <div className="next-stops">
                {nextStops?.map((nextStop: any, i: number) => (
                    <Fragment key={i}>
                        {new Date(nextStop.time).getDate() !==
                            new Date(nextStops[i - 1]?.time ?? Date.now()).getDate() && (
                            <div className="section-subtitle">Demain</div>
                        )}
                        <button
                            onClick={() => navigate("/trips/" + nextStop.lineId)}
                            style={
                                nextStop.time >= Date.now() - 60 * 1000
                                    ? {}
                                    : { backgroundColor: "rgba(255, 255, 255, 0.1)" }
                            }
                        >
                            <span>
                                <LineBadge line={fullStop.lines.find((line: any) => line.id === nextStop.lineId)} />{" "}
                                {nextStop.directionStop.name}
                            </span>
                            <span>{formatTime(new Date(nextStop.time))}</span>
                        </button>
                    </Fragment>
                ))}
            </div>

            <div>Identifiant d'arrêt: {fullStop?.id}</div>
        </Panel>
    );
};

export const TripPanel = ({
    trip,
    setForcedLines
}: {
    trip: any;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const navigate = useNavigate();
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
            onClose={() => navigate("/")}
        >
            <button className="button" onClick={() => navigate("/lines/" + trip?.line.id)}>
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
