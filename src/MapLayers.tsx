import { useMemo, useState } from "react";
import { CircleMarker, GeoJSON, Popup, useMap, useMapEvents } from "react-leaflet";

const collectCoordinates = (coords: any, out: [number, number][]) => {
    if (typeof coords[0] === "number") out.push(coords);
    else coords.forEach((coord: any) => collectCoordinates(coord, out));
};

const getFeatureBounds = (feature: any): [[number, number], [number, number]] => {
    const points: [number, number][] = [];
    collectCoordinates(feature.geometry.coordinates, points);
    if (points.length === 0)
        return [
            [0, 0],
            [0, 0]
        ];

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const [lon, lat] of points) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
    }
    return [
        [minLat, minLon],
        [maxLat, maxLon]
    ];
};

export const LinesLayer = ({ lines }: { lines: any }) => {
    const map = useMap();
    const [view, setView] = useState(() => map.getBounds());

    useMapEvents({
        moveend: () => setView(map.getBounds()),
        zoomend: () => setView(map.getBounds())
    });

    const featuresWithBounds = useMemo<{ feature: any; bounds: [[number, number], [number, number]] }[]>(
        () => lines?.features.map((feature: any) => ({ feature, bounds: getFeatureBounds(feature) })) ?? [],
        [lines]
    );

    const visibleFeatures = useMemo(
        () => featuresWithBounds.filter(({ bounds }) => view.intersects(bounds)).map(({ feature }) => feature),
        [featuresWithBounds, view]
    );

    if (!lines) return null;

    return (
        <GeoJSON
            data={{ type: "FeatureCollection", features: visibleFeatures } as any}
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
    if (visibleNonParentStops.length < 250)
        return visibleNonParentStops.map((stop) => (
            <CircleMarker key={stop.stop_id} center={[stop.stop_lat, stop.stop_lon]} radius={4} color="white">
                <Popup>{stop.stop_name}</Popup>
            </CircleMarker>
        ));
    else if (visibleParentStops.length < 250)
        return visibleParentStops.map((stop) => (
            <CircleMarker key={stop.stop_id} center={[stop.stop_lat, stop.stop_lon]} radius={4} color="white">
                <Popup>{stop.stop_name}</Popup>
            </CircleMarker>
        ));

    return null;
};
