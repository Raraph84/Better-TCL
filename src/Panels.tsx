import { useEffect, useState } from "react";
import { Panel } from "./Panel.js";

export const LinePanel = ({ line, setPanel }: { line: any; setPanel: (panel: any) => void }) => {
    const [fullLine, setFullLine] = useState<any>(null);

    useEffect(() => {
        if (!line) return;
        setFullLine(null);
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines/" + line.id)
            .then((res) => res.json())
            .then((res) => setFullLine(res));
    }, [line]);

    return (
        <Panel title={"Ligne " + (fullLine?.shortName ?? line?.shortName)} open={line} onClose={() => setPanel(null)}>
            <div className="stops">
                {fullLine?.stops.map((stop: any) => (
                    <button key={stop.id} className="stop" onClick={() => setPanel({ type: "stop", data: stop })}>
                        {stop.name}
                    </button>
                ))}
            </div>
        </Panel>
    );
};

export const StopPanel = ({ stop, setPanel }: { stop: any; setPanel: (panel: any) => void }) => {
    const [fullStop, setFullStop] = useState<any>(null);

    useEffect(() => {
        if (!stop) return;
        setFullStop(null);
        fetch(import.meta.env.VITE_SERVER_HOST + "/stops/" + stop.id)
            .then((res) => res.json())
            .then((res) => setFullStop(res));
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

export const TripPanel = ({ trip, setPanel }: { trip: any; setPanel: (panel: any) => void }) => {
    return (
        <Panel title={"Service - Ligne " + trip?.line?.shortName} open={trip} onClose={() => setPanel(null)}>
            <button onClick={() => setPanel({ type: "line", data: trip?.line })}>Voir la ligne</button>
        </Panel>
    );
};
