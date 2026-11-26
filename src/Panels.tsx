import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel } from "./Panel.js";

export const LinePanel = ({
    line,
    vehicles,
    setForcedLines
}: {
    line: any;
    vehicles: { [key: string]: any };
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const navigate = useNavigate();
    const [fullLine, setFullLine] = useState<any>(null);
    const [date, setDate] = useState(Date.now());
    const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");

    useEffect(() => {
        if (!line) return;
        setDirection("outbound");
        setFullLine(null);
        setForcedLines([line.id]);
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines/" + line.id + "?date=" + date)
            .then((res) => res.json())
            .then((res) => setFullLine(res));
        return () => setForcedLines(null);
    }, [line, date]);

    useEffect(() => setDate(Date.now()), [line]);

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
                        <AnotherDay time={trip.stops[0].time} prevTime={fullLine.trips[i - 1]?.stops[0].time ?? null} />
                        <button onClick={() => navigate("/trips/" + trip.fullTripId)}>
                            <LineFull line={fullLine}>
                                {fullLine.stops.find((s: any) => s.id === trip.stops.slice(-1)[0].stopId).name}
                            </LineFull>
                            <TimeRange
                                aTime={trip.stops[0].time}
                                bTime={trip.stops.slice(-1)[0].time}
                                delay={vehicles[trip.fullTripId]?.delay ?? null}
                            />
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
    vehicles,
    setForcedLines
}: {
    stop: any;
    vehicles: { [key: string]: any };
    setForcedLines: (lines: string[] | null) => void;
}) => {
    const navigate = useNavigate();
    const [fullStop, setFullStop] = useState<any>(null);
    const [date, setDate] = useState(Date.now());
    const [showPreviousStops, setShowPreviousStops] = useState(false);

    useEffect(() => {
        if (!stop) return;
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

    useEffect(() => setDate(Date.now()), [stop]);

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
                            <LineFull line={line}>
                                {line.stops.filter((s: any) => s.direction === direction).slice(-1)[0].name}
                            </LineFull>
                            <span style={{ whiteSpace: "nowrap", display: "flex", gap: "6px" }}>
                                {line.nextStops
                                    .filter((s: any) => s.direction === direction)
                                    .slice(0, 2)
                                    .map((s: any) => (
                                        <Time
                                            key={s.time}
                                            time={s.time}
                                            delay={vehicles[s.fullTripId]?.delay ?? null}
                                            showTheorical={false}
                                        />
                                    ))}
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
                        <AnotherDay time={nextStop.time} prevTime={nextStops[i - 1]?.time ?? null} />
                        <button
                            onClick={() => navigate("/trips/" + nextStop.fullTripId)}
                            style={
                                nextStop.time >= Date.now() - 60 * 1000
                                    ? {}
                                    : { backgroundColor: "rgba(255, 255, 255, 0.1)" }
                            }
                        >
                            <LineFull line={fullStop.lines.find((line: any) => line.id === nextStop.lineId)}>
                                {nextStop.directionStop.name}
                            </LineFull>
                            <Time time={nextStop.time} delay={vehicles[nextStop.fullTripId]?.delay ?? null} />
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
    vehicles,
    setForcedLines
}: {
    tripId: string | null;
    vehicles: { [key: string]: any };
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

    const vehicle = vehicles[fullTrip?.fullTripId] ?? null;
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
                        <LineFull line={fullTrip.line}>{fullTrip.stops.slice(-1)[0].stop.name}</LineFull>
                        <TimeRange
                            aTime={fullTrip.stops[0].time}
                            bTime={fullTrip.stops.slice(-1)[0].time}
                            delay={vehicle?.delay ?? null}
                        />
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
                            stopTime.time + (vehicle?.delay ?? 0) * 1000 >= date - 60 * 1000
                                ? {}
                                : { backgroundColor: "rgba(255, 255, 255, 0.1)" }
                        }
                    >
                        <span>{stopTime.stop.name}</span>
                        <Time time={stopTime.time} delay={vehicle?.delay ?? null} />
                    </button>
                ))}
            </div>

            {vehicle?.vehicleId && <div>Identifiant de véhicule: {vehicle.vehicleId}</div>}
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

const AnotherDay = ({ time, prevTime }: { time: number; prevTime: number | null }) => {
    if (isSameDay(new Date(time), new Date(prevTime ?? Date.now()))) return null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
        <div className="section-subtitle">
            {isSameDay(new Date(time), tomorrow) ? "Demain" : formatDate(new Date(time))}
        </div>
    );
};

export const LineFull = ({ line, children }: { line: any; children: any }) => (
    <span className="line-full">
        <span
            className="line-badge"
            style={{ backgroundColor: "#" + line.color, color: "#" + (line.textColor || "FFFFFF") }}
        >
            {line.shortName}
        </span>{" "}
        {children}
    </span>
);

const Time = ({
    time,
    delay = null,
    showTheorical = true
}: {
    time: number;
    delay?: number | null;
    showTheorical?: boolean;
}) => {
    if (delay === null) return <span>{formatTime(new Date(time))}</span>;
    const delayed = Math.abs(delay) > 60;
    const delayColor = !delayed ? "#50FF50" : delay > 0 ? "#FF5050" : "#5050FF";
    if (!delayed || !showTheorical)
        return <span style={{ color: delayColor }}>{formatTime(new Date(time + delay * 1000))}</span>;
    return (
        <span style={{ whiteSpace: "nowrap" }}>
            <s>{formatTime(new Date(time))}</s>
            <span style={{ color: delayColor }}> {formatTime(new Date(time + delay * 1000))}</span>
        </span>
    );
};

const TimeRange = ({ aTime, bTime, delay = null }: { aTime: number; bTime: number; delay?: number | null }) => {
    if (delay === null)
        return (
            <span style={{ whiteSpace: "nowrap" }}>
                {formatTime(new Date(aTime))} - {formatTime(new Date(bTime))}
            </span>
        );
    const delayColor = Math.abs(delay) <= 60 ? "#50FF50" : delay > 0 ? "#FF5050" : "#5050FF";
    return (
        <span style={{ color: delayColor, whiteSpace: "nowrap" }}>
            {formatTime(new Date(aTime + (delay ?? 0) * 1000))} - {formatTime(new Date(bTime + (delay ?? 0) * 1000))}
        </span>
    );
};
