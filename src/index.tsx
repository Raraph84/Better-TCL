import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";
import { LinesLayer, StopsLayer } from "./MapLayers.js";
import { Panel } from "./Panel.js";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const App = () => {
    const [stops, setStops] = useState<any[]>([]);
    const [lines, setLines] = useState<any>(null);
    const [panel, setPanel] = useState<{ type: "stop"; data: any } | null>(null);

    useEffect(() => {
        fetch(import.meta.env.VITE_SERVER_HOST + "/gtfs/stops")
            .then((res) => res.json())
            .then((res) => setStops(res.stops));
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines")
            .then((res) => res.json())
            .then((lines) => setLines(lines.features));
    }, []);

    return (
        <>
            <MapContainer center={[45.75, 4.85]} zoom={13} zoomControl={false}>
                <TileLayer url="https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png" /> 
                <LinesLayer features={lines} visible={true} />
                <StopsLayer stops={stops} setSelectedStop={(stop) => setPanel({ type: "stop", data: stop })} />
            </MapContainer>

            <Panel title={panel?.data?.stop_name} open={panel?.type === "stop"} onClose={() => setPanel(null)}></Panel>
        </>
    );
};

createRoot(document.getElementById("root")!).render(<App />);
