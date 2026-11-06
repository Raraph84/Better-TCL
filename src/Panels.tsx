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

    const hasInbound = fullLine?.stops.some((stop: any) => stop.direction === "inbound");
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
                        <button onClick={() => navigate("/trips/" + trip.fullTripId)}>
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
                disabled={!hasInbound}
                onClick={() => setDirection(direction === "outbound" ? "inbound" : "outbound")}
            >
                <span>
                    Direction
                    <br />
                    {stops?.[stops.length - 1].name}
                </span>
                {hasInbound && <i className="fa-solid fa-repeat" />}
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
                            <span>
                                {line.nextStops
                                    .filter((s: any) => s.direction === direction)
                                    .map((s: any) => formatTime(new Date(s.time)))
                                    .slice(0, 2)
                                    .join(" ")}
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
                            onClick={() => navigate("/trips/" + nextStop.fullTripId)}
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
    tripId,
    setForcedLines
}: {
    tripId: string | null;
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const navigate = useNavigate();
    const [fullTrip, setFullTrip] = useState<any>(null);

    useEffect(() => {
        if (!tripId) return;
        setFullTrip(null);
        fetch(import.meta.env.VITE_SERVER_HOST + "/trips/" + tripId)
            .then((res) => res.json())
            .then((res) => {
                setFullTrip(res);
                setForcedLines([res.line.id]);
            });
        return () => setForcedLines(null);
    }, [tripId]);

    return (
        <Panel
            title={"Trajet - Ligne " + fullTrip?.line.shortName}
            open={tripId && fullTrip}
            onClose={() => navigate("/")}
        >
            <button className="button" onClick={() => navigate("/lines/" + fullTrip?.line.id)}>
                Voir la ligne
            </button>

            {fullTrip && (
                <div className="trips">
                    <button onClick={() => navigate("/lines/" + fullTrip.line.id)}>
                        <span>
                            <LineBadge line={fullTrip.line} /> {fullTrip.stops.slice(-1)[0].stop.name}
                        </span>
                        <span style={{ whiteSpace: "nowrap" }}>
                            {formatTime(new Date(fullTrip.stops[0].time))} -{" "}
                            {formatTime(new Date(fullTrip.stops.slice(-1)[0].time))}
                        </span>
                    </button>
                </div>
            )}

            <div className="section-title">Arrêts</div>
            <div className="stops">
                {fullTrip?.stops.map((stopTime: any, i: number) => (
                    <button
                        onClick={() => navigate("/stops/" + stopTime.stop.id)}
                        style={
                            stopTime.time >= Date.now() - 60 * 1000
                                ? {}
                                : { backgroundColor: "rgba(255, 255, 255, 0.1)" }
                        }
                    >
                        <span>{stopTime.stop.name}</span>
                        <span>{formatTime(new Date(stopTime.time))}</span>
                    </button>
                ))}
            </div>
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
