import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";
import { LinesLayer, StopsLayer, VehiclesLayer } from "./MapLayers.js";
import { LinePanel, StopPanel, TripPanel } from "./Panels.js";
import { Panel } from "./Panel.js";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const App = () => {
    const [stops, setStops] = useState<any>(null);
    const [lines, setLines] = useState<any>(null);
    const [linesGeojson, setLinesGeojson] = useState<any>(null);
    const [panel, setPanel] = useState<{ type: "filters" | "line" | "stop" | "trip"; data: any } | null>(null);
    const [forcedLines, setForcedLines] = useState<string[] | null>(null);
    const [trackedVehicles, setTrackedVehicles] = useState<{ [key: string]: any }>({});
    const [filters, setFilters] = useState<{
        met: boolean;
        fun: boolean;
        tra: boolean;
        trambus: boolean;
        navi: boolean;
        rx: boolean;
        bus: boolean;
        jd: boolean;
    }>({ met: true, fun: true, tra: true, trambus: true, navi: true, rx: true, bus: false, jd: false });

    useEffect(() => {
        fetch(import.meta.env.VITE_SERVER_HOST + "/stops")
            .then((res) => res.json())
            .then((res) => setStops(res.stops));
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines")
            .then((res) => res.json())
            .then((res) => setLines(res.lines));
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines/geojson")
            .then((res) => res.json())
            .then((lines) => setLinesGeojson(lines.features));
    }, []);

    useEffect(() => {
        const connect = () => {
            const ws = new WebSocket(import.meta.env.VITE_SERVER_HOST.replace("http", "ws") + "/lines/tracking");
            ws.addEventListener("open", () => console.log("Connected to tracking WebSocket"));
            ws.addEventListener("message", (event) => {
                const message = JSON.parse(event.data);
                if (message.event === "vehicle")
                    setTrackedVehicles((prev) => ({
                        ...prev,
                        [message.data.MonitoredVehicleJourney.VehicleRef.value]: message.data
                    }));
            });
            ws.addEventListener("close", (event) => {
                console.log("WebSocket closed, reconnecting...", event.code, event.reason);
                setTimeout(connect, 1000);
            });
        };
        connect();
    }, []);

    const visibleLines = linesGeojson?.filter((f: any) => {
        if (forcedLines) return forcedLines.includes(f.properties.code_ligne);
        if (filters.met && f.properties.famille_transport === "MET") return true;
        if (filters.fun && f.properties.famille_transport === "FUN") return true;
        if (filters.tra && f.properties.famille_transport === "TRA" && f.properties.ligne !== "RX") return true;
        if (filters.trambus && f.properties.famille_transport === "BUS" && /^TB\d+$/.test(f.properties.ligne))
            return true;
        if (filters.navi && f.properties.famille_transport === "BAT") return true;
        if (filters.rx && f.properties.famille_transport === "TRA" && f.properties.ligne === "RX") return true;
        if (filters.bus && f.properties.famille_transport === "BUS" && !/^(TB|JD)\d+$/.test(f.properties.ligne))
            return true;
        if (filters.jd && f.properties.famille_transport === "BUS" && /^JD\d+$/.test(f.properties.ligne)) return true;
        return false;
    });

    return (
        <>
            <MapContainer center={[45.75, 4.85]} zoom={13} zoomControl={false}>
                <TileLayer url="https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png" /> 
                <LinesLayer features={visibleLines ?? []} lines={lines} setPanel={setPanel} />
                <StopsLayer stops={stops ?? []} setPanel={setPanel} />
                <VehiclesLayer
                    lines={lines ?? []}
                    forcedLines={forcedLines}
                    vehicles={Object.values(trackedVehicles)}
                    setPanel={setPanel}
                />
            </MapContainer>

            <LinePanel
                line={panel?.type === "line" ? panel?.data : null}
                setPanel={setPanel}
                setForcedLines={setForcedLines}
            />
            <StopPanel
                stop={panel?.type === "stop" ? panel?.data : null}
                setPanel={setPanel}
                setForcedLines={setForcedLines}
            />
            <TripPanel
                trip={panel?.type === "trip" ? panel?.data : null}
                setPanel={setPanel}
                setForcedLines={setForcedLines}
            />

            <div className="right-buttons">
                <button onClick={() => setPanel({ type: "filters", data: null })}>
                    <i className="fa-solid fa-filter" />
                </button>
            </div>
            <Panel title="Filtres" open={panel?.type === "filters"} onClose={() => setPanel(null)}>
                {[
                    { name: "Métro", key: "met" },
                    { name: "Funiculaire", key: "fun" },
                    { name: "Tramway", key: "tra" },
                    { name: "Trambus", key: "trambus" },
                    { name: "Navigône", key: "navi" },
                    { name: "Rhônexpress", key: "rx" },
                    { name: "Bus", key: "bus" },
                    { name: "Bus scolaires", key: "jd" }
                ].map(({ name, key }) => (
                    <div key={key}>
                        <input
                            type="checkbox"
                            checked={filters[key as keyof typeof filters]}
                            onChange={(e) => setFilters({ ...filters, [key]: e.target.checked })}
                        />
                        <div>{name}</div>
                    </div>
                ))}
            </Panel>
        </>
    );
};

createRoot(document.getElementById("root")!).render(<App />);
