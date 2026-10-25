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

export const LinesLayer = ({ features, visible }: { features: any[]; visible: boolean }) => {
    const map = useMap();
    const [view, setView] = useState(() => map.getBounds());

    useMapEvents({
        moveend: () => setView(map.getBounds()),
        zoomend: () => setView(map.getBounds())
    });

    const featuresWithBounds = useMemo<{ feature: any; bounds: [[number, number], [number, number]] }[]>(
        () => features?.map((feature: any) => ({ feature, bounds: getFeatureBounds(feature) })) ?? [],
        [features]
    );

    const visibleFeatures = useMemo(
        () => featuresWithBounds.filter(({ bounds }) => view.intersects(bounds)).map(({ feature }) => feature),
        [featuresWithBounds, view]
    );

    if (!features || !visible) return null;

    return (
        <GeoJSON
            data={{ type: "FeatureCollection", features: visibleFeatures } as any}
            style={(feature) => ({
                color: feature?.properties.couleur_hex ?? "#ffffff",
                weight: 3,
                opacity: 0.9
            })}
        />
    );
};

export const VehiclesLayer = ({ routes, vehicles }: { routes: any; vehicles: { [key: string]: any } }) => {
    return Object.values(vehicles).map((vehicle: any) => {
        const route = routes.find(
            (r: any) =>
                r.route_id ===
                vehicle.MonitoredVehicleJourney.LineRef.value.replace("ActIV:Line::", "").replace(":SYTRAL", "")
        );
        if (!route) console.warn("Route not found for vehicle", vehicle.MonitoredVehicleJourney.VehicleRef.value);
        return (
            <CircleMarker
                key={vehicle.MonitoredVehicleJourney.VehicleRef.value}
                center={[
                    vehicle.MonitoredVehicleJourney.VehicleLocation.Latitude,
                    vehicle.MonitoredVehicleJourney.VehicleLocation.Longitude
                ]}
                radius={6}
                stroke={false}
                fillColor={route?.route_color ? `#${route.route_color}` : "#aaaaaa"}
                fillOpacity={1}
            />
        );
    });
};

export const StopsLayer = ({ stops, setSelectedStop }: { stops: any[]; setSelectedStop: (stop: any) => void }) => {
    const map = useMap();
    const [view, setView] = useState(() => map.getBounds());

    useMapEvents({
        moveend: () => setView(map.getBounds()),
        zoomend: () => setView(map.getBounds())
    });

    let visibleStops = stops.filter((stop) => stop.parent_station && view.contains([stop.stop_lat, stop.stop_lon]));
    if (visibleStops.length > 250)
        visibleStops = stops.filter((stop) => !stop.parent_station && view.contains([stop.stop_lat, stop.stop_lon]));
    if (visibleStops.length > 250) visibleStops = [];

    return visibleStops.map((stop) => (
        <CircleMarker
            key={stop.stop_id}
            center={[stop.stop_lat, stop.stop_lon]}
            radius={6}
            color="white"
            eventHandlers={{ click: () => setSelectedStop(stop) }}
        />
    ));
};
