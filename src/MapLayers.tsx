import { useState } from "react";
import { CircleMarker, GeoJSON, Popup, useMap, useMapEvents } from "react-leaflet";

export const LinesLayer = ({ lines }: { lines: any }) => {
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

export const StopsLayer = ({ stops }: { stops: any[] }) => {
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
