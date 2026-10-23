import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const LINES_URLS = [
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignetram_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignemf_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:rx_rhonexpress.rxligne_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignefluv&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignebus_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid"
];

const LinesLayer = ({ lines }: { lines: any }) => {
    if (!lines) return null;

    return (
        <GeoJSON
            key={lines.features.length}
            data={lines}
            style={(feature) => ({
                color: feature?.properties.couleur_hex ?? "#ffffff",
                weight: 3,
                opacity: 0.9
            })}
            onEachFeature={(feature, layer) => {
                const props = feature.properties ?? {};
                layer.bindPopup(`${props.ligne} - ${props.nom_trace}`);
            }}
        />
    );
};

const StopsLayer = ({ stops }: { stops: any[] }) => {
    const map = useMap();
    const [view, setView] = useState(() => map.getBounds());

    useMapEvents({
        moveend: () => setView(map.getBounds()),
        zoomend: () => setView(map.getBounds())
    });

    const visibleParentStops = stops.filter(
        (stop) => !stop.parent_station && view.contains([stop.stop_lat, stop.stop_lon])
    );
    const visibleNonParentStops = stops.filter(
        (stop) => stop.parent_station && view.contains([stop.stop_lat, stop.stop_lon])
    );
    if (visibleNonParentStops.length < 500)
        return visibleNonParentStops.map((stop) => (
            <CircleMarker key={stop.stop_id} center={[stop.stop_lat, stop.stop_lon]} radius={4} color="white">
                <Popup>{stop.stop_name}</Popup>
            </CircleMarker>
        ));
    else if (visibleParentStops.length < 1500)
        return visibleParentStops.map((stop) => (
            <CircleMarker key={stop.stop_id} center={[stop.stop_lat, stop.stop_lon]} radius={4} color="white">
                <Popup>{stop.stop_name}</Popup>
            </CircleMarker>
        ));

    return null;
};

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
