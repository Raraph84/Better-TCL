import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./index.scss";

const App = () => {
    return (
        <>
            <MapContainer center={[45.75, 4.85]} zoom={13}>
                <TileLayer url="https://tiles.stadiamaps.com/tiles/stamen_toner_dark/{z}/{x}/{y}{r}.png" />
            </MapContainer>
        </>
    );
};

createRoot(document.getElementById("root")!).render(<App />);
