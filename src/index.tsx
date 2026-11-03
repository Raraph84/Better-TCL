import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, Map } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LinesLayer, StopsLayer, VehiclesLayer } from "./MapLayers.js";
import { LinePanel, StopPanel, TripPanel } from "./Panels.js";
import { Panel } from "./Panel.js";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const App = () => {
    const mapRef = useRef<Map>(null);
    const [stops, setStops] = useState<any>(null);
    const [lines, setLines] = useState<any>(null);
    const [linesGeojson, setLinesGeojson] = useState<any>(null);
    const [panel, setPanel] = useState<{ type: "filters" | "line" | "stop" | "trip"; id?: number } | null>(null);
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
    const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

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

    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
            },
            (err) => {},
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const handleLocate = () => {
        if (position) mapRef.current!.flyTo([position.lat, position.lng], 16);
    };

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

    const defaultLocation = JSON.parse(localStorage.getItem("location") ?? "{}");

    const MapUpdater = () => {
        const map = useMap();
        mapRef.current = map;

        const save = () =>
            localStorage.setItem("location", JSON.stringify({ center: map.getCenter(), zoom: map.getZoom() }));
        useMapEvents({ moveend: save, zoomend: save });

        return null;
    };

    return (
        <>
            <MapContainer
                center={defaultLocation.center ?? [45.75, 4.85]}
                zoom={defaultLocation.zoom ?? 13}
                zoomControl={false}
                renderer={new Canvas({ tolerance: 10 })}
            >
                <TileLayer url={import.meta.env.VITE_TILES_HOST} /> 
                <LinesLayer features={visibleLines ?? []} lines={lines} setPanel={setPanel} />
                <StopsLayer stops={stops ?? []} setPanel={setPanel} />
                <VehiclesLayer
                    lines={lines ?? []}
                    forcedLines={forcedLines}
                    vehicles={Object.values(trackedVehicles)}
                    setPanel={setPanel}
                />
                {position && (
                    <CircleMarker
                        center={[position.lat, position.lng]}
                        fillOpacity={1}
                        fillColor="#3333ff"
                        color="#ffffff"
                        radius={8}
                        weight={2}
                    />
                )}
                <MapUpdater />
            </MapContainer>

            <LinePanel
                line={panel?.type === "line" ? lines.find((line: any) => line.id === panel.id) : null}
                setPanel={setPanel}
                setForcedLines={setForcedLines}
            />
            <StopPanel
                stop={panel?.type === "stop" ? stops.find((stop: any) => stop.id === panel.id) : null}
                setPanel={setPanel}
                setForcedLines={setForcedLines}
            />
            <TripPanel
                trip={panel?.type === "trip" ? { line: lines.find((line: any) => line.id === panel.id) } : null}
                setPanel={setPanel}
                setForcedLines={setForcedLines}
            />

            <div className="right-buttons">
                <button onClick={() => setPanel({ type: "filters" })}>
                    <i className="fa-solid fa-filter" />
                </button>
                <button onClick={handleLocate}>
                    <i className="fa-solid fa-location-dot" />
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
