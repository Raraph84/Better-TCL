import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";
import { LinesLayer, StopsLayer } from "./MapLayers.js";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const App = () => {
    const [stops, setStops] = useState<any[]>([]);
    const [lines, setLines] = useState<any>(null);

    useEffect(() => {
        fetch(import.meta.env.VITE_SERVER_HOST + "/gtfs/stops")
            .then((res) => res.json())
            .then((res) => setStops(res.stops));
        fetch(import.meta.env.VITE_SERVER_HOST + "/lines")
            .then((res) => res.json())
            .then((collection) =>
                setLines({
                    type: "FeatureCollection",
                    features: collection.features.filter(
                        (feature: any) => !/^JD\d+$/.test(feature.properties.ligne ?? "")
                    )
                })
            );
    }, []);

    return (
        <>
            <MapContainer center={[45.75, 4.85]} zoom={13}>
                <TileLayer url="https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png" />
                <LinesLayer lines={lines} />
                <StopsLayer stops={stops} />
            </MapContainer>
        </>
    );
};

createRoot(document.getElementById("root")!).render(<App />);
