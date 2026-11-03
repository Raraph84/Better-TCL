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

export const LinesLayer = ({
    features,
    lines,
    setPanel
}: {
    features: any[];
    lines: any;
    setPanel: (panel: { type: any; data: any }) => void;
}) => {
    const map = useMap();
    const [view, setView] = useState(() => map.getBounds());
    const [version, setVersion] = useState(0);

    useMapEvents({
        moveend: () => setView(map.getBounds()),
        zoomend: () => setView(map.getBounds())
    });

    const featuresWithBounds = useMemo<{ feature: any; bounds: [[number, number], [number, number]] }[]>(
        () => features.map((feature: any) => ({ feature, bounds: getFeatureBounds(feature) })),
        [features]
    );

    const visibleFeatures = useMemo(
        () => featuresWithBounds.filter(({ bounds }) => view.intersects(bounds)).map(({ feature }) => feature),
        [featuresWithBounds, view]
    );

    useEffect(() => setVersion((v) => v + 1), [visibleFeatures]);

    return (
        <GeoJSON
            key={version}
            data={{ type: "FeatureCollection", features: visibleFeatures } as any}
            style={(feature) => ({
                color: feature?.properties.couleur_hex ?? "#ffffff",
                weight: feature?.properties.famille_transport === "MET" ? 4 : 2,
                opacity: 0.9
            })}
            eventHandlers={{
                click: (event) => {
                    const feature = event.sourceTarget.feature;
                    const line = lines.find((line: any) => line.id === feature.properties.code_ligne);
                    setPanel({ type: "line", data: line });
                }
            }}
        />
    );
};

const VehicleMarker = ({ vehicle, color, onClick }: { vehicle: any; color: string; onClick: () => void }) => {
    const target: [number, number] = [
        vehicle.MonitoredVehicleJourney.VehicleLocation.Latitude,
        vehicle.MonitoredVehicleJourney.VehicleLocation.Longitude
    ];

    const map = useMap();
    const [zoom, setZoom] = useState(() => map.getZoom());
    const [version, setVersion] = useState(0);
    const [position, setPosition] = useState<[number, number]>(target);
    const fromRef = useRef<[number, number]>(target);
    const targetRef = useRef<[number, number]>(target);
    const startRef = useRef<number>(0);
    const frameRef = useRef<number | null>(null);

    useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

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

    useEffect(() => setVersion((v) => v + 1), [color]);

    return (
        <CircleMarker
            key={version}
            center={position}
            radius={zoom < 13 ? 4 : 7}
            stroke={false}
            fillColor={color}
            fillOpacity={1}
            eventHandlers={{ click: onClick }}
        />
    );
};

export const VehiclesLayer = ({
    lines,
    forcedLines,
    vehicles,
    setPanel
}: {
    lines: any;
    forcedLines: string[] | null;
    vehicles: { [key: string]: any };
    setPanel: (panel: any) => void;
}) => {
    return vehicles.map((vehicle: any) => {
        const lineId = vehicle.MonitoredVehicleJourney.LineRef.value.replace("ActIV:Line::", "").replace(":SYTRAL", "");
        if (forcedLines && !forcedLines.includes(lineId)) return null;
        const line = lines.find((line: any) => line.id === lineId);
        return (
            <VehicleMarker
                key={vehicle.MonitoredVehicleJourney.VehicleRef.value}
                vehicle={vehicle}
                color={line ? `#${line.color}` : "#aaaaaa"}
                onClick={() => setPanel({ type: "trip", data: { line, vehicle } })}
            />
        );
    });
};

export const StopsLayer = ({ stops, setPanel }: { stops: any[]; setPanel: (panel: any) => void }) => {
    const map = useMap();
    const [view, setView] = useState(() => ({ bounds: map.getBounds(), zoom: map.getZoom() }));

    useMapEvents({
        moveend: () => setView({ bounds: map.getBounds(), zoom: map.getZoom() }),
        zoomend: () => setView({ bounds: map.getBounds(), zoom: map.getZoom() })
    });

    const visibleStops = stops.filter(
        (stop) => (view.zoom >= 17 ? stop.parent : !stop.parent) && view.bounds.contains([stop.lat, stop.lon])
    );
    if (visibleStops.length > 150) return null;

    return visibleStops.map((stop) => (
        <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lon]}
            radius={view.zoom < 13 ? 3 : 5}
            color="white"
            eventHandlers={{ click: () => setPanel({ type: "stop", data: stop }) }}
        />
    ));
};
