import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const StopsLayer = ({ stops }: { stops: any[] }) => {
    const map = useMap();
    const [view, setView] = useState(() => map.getBounds());

    useMapEvents({
        moveend: () => setView(map.getBounds()),
        zoomend: () => setView(map.getBounds())
    });

    const visibleStops = stops.filter((stop) => view.contains([stop.stop_lat, stop.stop_lon]));
    if (visibleStops.length > 2500) return null;

    return visibleStops.map((stop) => (
        <CircleMarker key={stop.stop_id} center={[stop.stop_lat, stop.stop_lon]} radius={4} color="white">
            <Popup>{stop.stop_name}</Popup>
        </CircleMarker>
    ));
};

const App = () => {
    const [stops, setStops] = useState<any[]>([]);

    useEffect(() => {
        fetch(import.meta.env.VITE_SERVER_HOST + "/gtfs/stops")
            .then((res) => res.json())
            .then((res) => setStops(res.stops));
    }, []);

    return (
        <>
            <MapContainer center={[45.75, 4.85]} zoom={13}>
                <TileLayer url="https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png" />
                <StopsLayer stops={stops} />
            </MapContainer>
        </>
    );
};

createRoot(document.getElementById("root")!).render(<App />);
