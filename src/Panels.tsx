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
    const [date, setDate] = useState(Date.now());
    const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");

    useEffect(() => {
        if (!line) {
            setDate(Date.now());
            return;
        }
        setDirection("outbound");
        setFullLine(null);
        setForcedLines([line.id]);
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines/" + line.id + "?date=" + date)
            .then((res) => res.json())
            .then((res) => setFullLine(res));
        return () => setForcedLines(null);
    }, [line, date]);

    const hasInbound = fullLine?.stops.some((stop: any) => stop.direction === "inbound");
    const stops = fullLine?.stops.filter((stop: any) => stop.direction === direction);

    return (
        <Panel title={"Ligne " + (fullLine?.shortName ?? line?.shortName ?? "")} open={line}>
            <div className="controls">
                <button onClick={() => setDate(Date.now())}>
                    <i className="fa-solid fa-rotate-right" />
                </button>
                <input
                    type="datetime-local"
                    value={new Date(date - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={(event) => setDate(new Date(event.target.value).getTime() || date)}
                />
            </div>

            <div className="section-title">Trajets</div>
            <div className="trips">
                {fullLine?.trips.map((trip: any, i: number) => (
                    <Fragment key={i}>
                        {!isSameDay(
                            new Date(trip.stops[0].time),
                            new Date(fullLine.trips[i - 1]?.stops[0].time ?? Date.now())
                        ) && (
                            <div className="section-subtitle">
                                {isTomorrow(new Date(trip.stops[0].time))
                                    ? "Demain"
                                    : formatDate(new Date(trip.stops[0].time))}
                            </div>
                        )}
                        <button onClick={() => navigate("/trips/" + trip.fullTripId)}>
                            <span className="line-full">
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
    const [date, setDate] = useState(Date.now());
    const [showPreviousStops, setShowPreviousStops] = useState(false);

    useEffect(() => {
        if (!stop) {
            setDate(Date.now());
            return;
        }
        setShowPreviousStops(false);
        setFullStop(null);
        setForcedLines([]);
        fetch(import.meta.env.VITE_SERVER_HOST + "/stops/" + stop.id + "?date=" + date)
            .then((res) => res.json())
            .then((res) => {
                setFullStop(res);
                setForcedLines(res.lines.map((line: any) => line.id));
            });
        return () => setForcedLines(null);
    }, [stop, date]);

    const nextStops = fullStop?.nextStops.filter(
        (stop: any) => showPreviousStops || stop.time >= Date.now() - 60 * 1000
    );

    return (
        <Panel title={"Arrêt " + (fullStop?.name ?? stop?.name ?? "")} open={stop}>
            <div className="controls">
                <button onClick={() => setDate(Date.now())}>
                    <i className="fa-solid fa-rotate-right" />
                </button>
                <input
                    type="datetime-local"
                    value={new Date(date - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={(event) => setDate(new Date(event.target.value).getTime() || date)}
                />
                {fullStop?.parent && (
                    <button className="button" onClick={() => navigate("/stops/" + fullStop.parent)}>
                        Voir l'arrêt parent
                    </button>
                )}
            </div>

            <div className="section-title">Lignes</div>
            <div className="lines">
                {fullStop?.lines.map((line: any) =>
                    line.directions.map((direction: any) => (
                        <button key={line.id + "-" + direction} onClick={() => navigate("/lines/" + line.id)}>
                            <span className="line-full">
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
                        {!isSameDay(new Date(nextStop.time), new Date(nextStops[i - 1]?.time ?? Date.now())) && (
                            <div className="section-subtitle">
                                {isTomorrow(new Date(nextStop.time)) ? "Demain" : formatDate(new Date(nextStop.time))}
                            </div>
                        )}
                        <button
                            onClick={() => navigate("/trips/" + nextStop.fullTripId)}
                            style={
                                nextStop.time >= Date.now() - 60 * 1000
                                    ? {}
                                    : { backgroundColor: "rgba(255, 255, 255, 0.1)" }
                            }
                        >
                            <span className="line-full">
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
    trackedVehicles,
    setForcedLines
}: {
    tripId: string | null;
    trackedVehicles: { [key: string]: any };
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const navigate = useNavigate();
    const [fullTrip, setFullTrip] = useState<any>(null);
    const [date, setDate] = useState(Date.now());

    useEffect(() => {
        if (!tripId) return;
        setFullTrip(null);
        setForcedLines([]);
        fetch(import.meta.env.VITE_SERVER_HOST + "/trips/" + tripId)
            .then((res) => (res.ok ? res.json() : null))
            .then((res) => {
                setFullTrip(res);
                setForcedLines(res ? [res.line.id] : null);
            });
        return () => setForcedLines(null);
    }, [tripId, date]);

    const vehicle = Object.values(trackedVehicles).find((v) => v.fullTripId === fullTrip?.fullTripId) ?? null;
    const delayed = Math.abs(vehicle?.delay ?? 0) > 60;
    const delayColor = !delayed ? "#50FF50" : vehicle?.delay > 0 ? "#FF5050" : "#5050FF";

    return (
        <Panel title={"Trajet - Ligne " + (fullTrip?.line.shortName ?? "")} open={tripId && fullTrip}>
            <div className="controls">
                <button onClick={() => setDate(Date.now())}>
                    <i className="fa-solid fa-rotate-right" />
                </button>
                <button className="button" onClick={() => navigate("/lines/" + fullTrip?.line.id)}>
                    Voir la ligne
                </button>
            </div>

            {fullTrip && (
                <div className="trips">
                    <button onClick={() => navigate("/lines/" + fullTrip.line.id)}>
                        <span className="line-full">
                            <LineBadge line={fullTrip.line} /> {fullTrip.stops.slice(-1)[0].stop.name}
                        </span>
                        <span style={{ whiteSpace: "nowrap" }}>
                            {formatTime(new Date(fullTrip.stops[0].time))} -{" "}
                            {formatTime(new Date(fullTrip.stops.slice(-1)[0].time))}
                        </span>
                    </button>
                </div>
            )}

            {vehicle && (
                <div style={{ color: delayColor }}>
                    {!delayed ? "À l'heure" : vehicle.delay > 0 ? "En retard" : "En avance"}
                    {delayed && ` de ${Math.floor(Math.abs(vehicle.delay) / 60)}m${Math.abs(vehicle.delay) % 60}s`}
                </div>
            )}

            <div className="section-title">Arrêts</div>
            <div className="stops">
                {fullTrip?.stops.map((stopTime: any) => (
                    <button
                        key={stopTime.stop.id}
                        onClick={() => navigate("/stops/" + stopTime.stop.id)}
                        style={
                            stopTime.time + (vehicle?.delay ?? 0) * 1000 >= Date.now() - 60 * 1000
                                ? {}
                                : { backgroundColor: "rgba(255, 255, 255, 0.1)" }
                        }
                    >
                        <span>{stopTime.stop.name}</span>
                        <span>
                            {delayed ? (
                                <>
                                    <s>{formatTime(new Date(stopTime.time))}</s>{" "}
                                    <span style={{ color: delayColor }}>
                                        {formatTime(new Date(stopTime.time + vehicle.delay * 1000))}
                                    </span>
                                </>
                            ) : (
                                formatTime(new Date(stopTime.time))
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {vehicle && <div>Identifiant de véhicule: {vehicle.id}</div>}
        </Panel>
    );
};

const formatTime = (time: Date) =>
    `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

const formatDate = (date: Date) =>
    `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
        .getFullYear()
        .toString()
        .padStart(4, "0")}`;

const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(date, tomorrow);
};

export const LineBadge = ({ line }: { line: any }) => (
    <span
        className="line-badge"
        style={{ backgroundColor: "#" + line.color, color: "#" + (line.textColor || "FFFFFF") }}
    >
        {line.shortName}
    </span>
);
