import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";
import { LinesLayer, StopsLayer, VehiclesLayer } from "./MapLayers.js";
import { Panel } from "./Panel.js";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const App = () => {
    const [stops, setStops] = useState<any[]>([]);
    const [lines, setLines] = useState<any>(null);
    const [linesGeojson, setLinesGeojson] = useState<any>(null);
    const [panel, setPanel] = useState<{ type: "filters" | "stop" | "trip"; data: any } | null>(null);
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

    return (
        <>
            <MapContainer center={[45.75, 4.85]} zoom={13} zoomControl={false}>
                <TileLayer url="https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png" /> 
                <LinesLayer
                    features={linesGeojson?.filter((f: any) => f.properties.famille_transport === "MET")}
                    visible={filters.met}
                />
                <LinesLayer
                    features={linesGeojson?.filter((f: any) => f.properties.famille_transport === "FUN")}
                    visible={filters.fun}
                />
                <LinesLayer
                    features={linesGeojson?.filter(
                        (f: any) => f.properties.famille_transport === "TRA" && f.properties.ligne !== "RX"
                    )}
                    visible={filters.tra}
                />
                <LinesLayer
                    features={linesGeojson?.filter(
                        (f: any) => f.properties.famille_transport === "BUS" && /^TB\d+$/.test(f.properties.ligne)
                    )}
                    visible={filters.trambus}
                />
                <LinesLayer
                    features={linesGeojson?.filter((f: any) => f.properties.famille_transport === "BAT")}
                    visible={filters.navi}
                />
                <LinesLayer
                    features={linesGeojson?.filter(
                        (f: any) => f.properties.famille_transport === "TRA" && f.properties.ligne === "RX"
                    )}
                    visible={filters.rx}
                />
                <LinesLayer
                    features={linesGeojson?.filter(
                        (f: any) => f.properties.famille_transport === "BUS" && !/^(TB|JD)\d+$/.test(f.properties.ligne)
                    )}
                    visible={filters.bus}
                />
                <LinesLayer
                    features={linesGeojson?.filter(
                        (f: any) => f.properties.famille_transport === "BUS" && /^JD\d+$/.test(f.properties.ligne)
                    )}
                    visible={filters.jd}
                />
                <StopsLayer stops={stops} setSelectedStop={(stop) => setPanel({ type: "stop", data: stop })} />
                <VehiclesLayer lines={lines} vehicles={trackedVehicles} setPanel={setPanel} />
            </MapContainer>

            <Panel
                title={"Arrêt " + panel?.data?.name}
                open={panel?.type === "stop"}
                onClose={() => setPanel(null)}
            ></Panel>
            <Panel
                title={"Service - Ligne " + panel?.data?.route?.shortName}
                open={panel?.type === "trip"}
                onClose={() => setPanel(null)}
            ></Panel>

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
