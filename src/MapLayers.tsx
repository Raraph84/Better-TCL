import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, useMap, useMapEvents } from "react-leaflet";

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

const VehicleMarker = ({ vehicle, color, onClick }: { vehicle: any; color: string; onClick: () => void }) => {
    const target: [number, number] = [
        vehicle.MonitoredVehicleJourney.VehicleLocation.Latitude,
        vehicle.MonitoredVehicleJourney.VehicleLocation.Longitude
    ];

    const [position, setPosition] = useState<[number, number]>(target);
    const fromRef = useRef<[number, number]>(target);
    const targetRef = useRef<[number, number]>(target);
    const startRef = useRef<number>(0);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const [targetLat, targetLon] = target;
        const [currentLat, currentLon] = targetRef.current;
        if (targetLat === currentLat && targetLon === currentLon) return;

        fromRef.current = position;
        targetRef.current = target;
        startRef.current = performance.now();

        const animate = (now: number) => {
            const progress = Math.min((now - startRef.current) / 1000, 1);
            const [fromLat, fromLon] = fromRef.current;
            const [toLat, toLon] = targetRef.current;
            setPosition([fromLat + (toLat - fromLat) * progress, fromLon + (toLon - fromLon) * progress]);
            if (progress < 1) frameRef.current = requestAnimationFrame(animate);
            else frameRef.current = null;
        };

        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        };
    }, [target[0], target[1]]);

    return (
        <CircleMarker
            center={position}
            radius={7}
            stroke={false}
            fillColor={color}
            fillOpacity={1}
            eventHandlers={{ click: onClick }}
        />
    );
};

export const VehiclesLayer = ({
    lines,
    vehicles,
    setPanel
}: {
    lines: any;
    vehicles: { [key: string]: any };
    setPanel: (panel: { type: "trip"; data: any }) => void;
}) => {
    if (!lines || !vehicles) return null;
    return Object.values(vehicles).map((vehicle: any) => {
        const line = lines.find(
            (line: any) =>
                line.id ===
                vehicle.MonitoredVehicleJourney.LineRef.value.replace("ActIV:Line::", "").replace(":SYTRAL", "")
        );
        if (!line) console.warn("Route not found for vehicle", vehicle.MonitoredVehicleJourney.VehicleRef.value);
        return (
            <VehicleMarker
                key={vehicle.MonitoredVehicleJourney.VehicleRef.value}
                vehicle={vehicle}
                color={line?.color ? `#${line.color}` : "#aaaaaa"}
                onClick={() => setPanel({ type: "trip", data: { line, vehicle } })}
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

    let visibleStops = stops.filter((stop) => stop.parent && view.contains([stop.lat, stop.lon]));
    if (visibleStops.length > 250)
        visibleStops = stops.filter((stop) => !stop.parent && view.contains([stop.lat, stop.lon]));
    if (visibleStops.length > 250) visibleStops = [];

    return visibleStops.map((stop) => (
        <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lon]}
            radius={5}
            color="white"
            eventHandlers={{ click: () => setSelectedStop(stop) }}
        />
    ));
};
