import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";
import { LinesLayer, StopsLayer } from "./MapLayers.js";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const LINES_URLS = [
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignetram_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignemf_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:rx_rhonexpress.rxligne_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignefluv&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignebus_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid"
];

const App = () => {
    const [stops, setStops] = useState<any[]>([]);
    const [lines, setLines] = useState<any>(null);

    useEffect(() => {
        fetch(import.meta.env.VITE_SERVER_HOST + "/gtfs/stops")
            .then((res) => res.json())
            .then((res) => setStops(res.stops));
    }, []);

    useEffect(() => {
        Promise.all(LINES_URLS.map((url) => fetch(url).then((res) => res.json())))
            .then((collections) =>
                setLines({
                    type: "FeatureCollection",
                    features: collections.flatMap((collection) => collection.features)
                })
            )
            .catch((err) => console.error("Failed to load lines", err));
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
