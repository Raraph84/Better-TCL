import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const StopsLayer = ({ stops }: { stops: any[] }) => {
    const map = useMap();
    const [view, setView] = useState(() => ({ zoom: map.getZoom(), bounds: map.getBounds() }));

    useMapEvents({
        moveend: () => setView({ zoom: map.getZoom(), bounds: map.getBounds() }),
        zoomend: () => setView({ zoom: map.getZoom(), bounds: map.getBounds() })
    });

    const visibleStops = stops.filter((stop) => view.bounds.contains([stop.stop_lat, stop.stop_lon]));
    if (visibleStops.length > 2500) return null;

    return visibleStops.map((stop) => (
        <Marker key={stop.stop_id} position={[stop.stop_lat, stop.stop_lon]}>
            <Popup>{stop.stop_name}</Popup>
        </Marker>
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
