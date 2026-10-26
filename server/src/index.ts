import fs from "node:fs";
import http from "node:http";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { parseGtfs, toDateTime } from "./gtfs.js";

dotenv.config({ quiet: true });

const app = express();
app.use(cors());

const LINES_URLS = [
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignetram_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignemf_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:rx_rhonexpress.rxligne_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignefluv&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid",
    "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignebus_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid"
];

let linesGeojson = fs.existsSync("lines.geojson")
    ? JSON.parse(await fs.promises.readFile("lines.geojson", "utf-8"))
    : { type: "FeatureCollection", features: [] };

const updateLines = async () => {
    let collections;
    try {
        collections = await Promise.all(LINES_URLS.map((url) => fetch(url).then((res) => res.json())));
    } catch (error) {
        console.error("Failed to fetch lines geojson:", error);
        return;
    }
    linesGeojson.features = collections.flatMap((collection: any) => collection.features);
    await fs.promises.writeFile("lines.geojson", JSON.stringify(linesGeojson));
    console.log("Lines data updated successfully");
};

updateLines();
setInterval(updateLines, 60 * 60 * 1000);

let gtfs = fs.existsSync("gtfs.zip")
    ? await parseGtfs(await fs.promises.readFile("gtfs.zip"))
    : { calendar: [], calendarDates: [], routes: [], stopTimes: [], stops: [], trips: [] };

const updateGtfs = async () => {
    let res;
    try {
        res = await fetch("https://download.data.grandlyon.com/files/rdata/tcl_sytral.tcltheorique/GTFS_TCL.ZIP", {
            headers: { Authorization: "Basic " + btoa(process.env.DATA_GRANDLYON_BASIC_AUTH!) }
        });
        if (!res.ok) throw new Error("Error from Grand Lyon API: " + res.status + " " + res.statusText);
    } catch (error) {
        console.error("Failed to fetch GTFS data:", error);
        return;
    }
    const data = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile("gtfs.zip", data);
    gtfs = await parseGtfs(data);
    console.log("GTFS data updated successfully");
};

updateGtfs();
setInterval(updateGtfs, 60 * 60 * 1000);

app.get("/lines/geojson", (req, res) => res.json(linesGeojson));

const computeServices = (trips: any[], startDate: number, endDate: number) => {
    const serviceIds = new Set(trips.map((trip) => trip.service_id));
    const services = gtfs.calendar.filter((calendar) => serviceIds.has(calendar.service_id));
    const servicesDates = gtfs.calendarDates.filter((calendarDate) => serviceIds.has(calendarDate.service_id));

    const computedServices = [];
    for (const service of services) {
        for (let date = new Date(service.start_date); date <= service.end_date; date.setDate(date.getDate() + 1)) {
            if (date.getTime() < startDate || date.getTime() >= endDate) continue;
            if (date.getDay() === 0 && !service.sunday) continue;
            if (date.getDay() === 1 && !service.monday) continue;
            if (date.getDay() === 2 && !service.tuesday) continue;
            if (date.getDay() === 3 && !service.wednesday) continue;
            if (date.getDay() === 4 && !service.thursday) continue;
            if (date.getDay() === 5 && !service.friday) continue;
            if (date.getDay() === 6 && !service.saturday) continue;
            const serviceDate = servicesDates.find(
                (cd) => cd.service_id === service.service_id && cd.date.getTime() === date.getTime()
            );
            if (serviceDate?.exception_type === "2") continue;
            computedServices.push({ date: new Date(date), service });
        }
    }
    return computedServices;
};

const computeTrips = (route: any, startDate: number, endDate: number) => {
    const trips = gtfs.trips.filter((trip) => trip.route_id === route.route_id);
    const services = computeServices(trips, startDate, endDate);

    const computedTrips = [];
    for (const service of services) {
        const serviceTrips = trips.filter((trip) => trip.service_id === service.service.service_id);
        for (const trip of serviceTrips) computedTrips.push({ ...service, trip });
    }
    return computedTrips;
};

app.get("/lines", (req, res) => {
    res.json({
        lines: gtfs.routes.map((route) => ({
            id: route.route_id,
            shortName: route.route_short_name,
            longName: route.route_long_name,
            color: route.route_color
        }))
    });
});

app.get("/lines/:id", (req, res) => {
    const gtfsRoute = gtfs.routes.find((r) => r.route_id === req.params.id);
    if (!gtfsRoute) return res.status(404).json({ error: "Route not found" });

    const gtfsTrips: { [key: string]: any } = {};
    const gtfsStops: { [key: string]: any } = {};
    const stopsIds = new Set<string>();
    for (const trip of gtfs.trips) {
        if (trip.route_id !== gtfsRoute.route_id) continue;
        gtfsTrips[trip.trip_id] = { ...trip, stopTimes: [] };
    }
    for (const stopTime of gtfs.stopTimes) {
        if (!gtfsTrips[stopTime.trip_id]) continue;
        gtfsTrips[stopTime.trip_id].stopTimes.push(stopTime);
        stopsIds.add(stopTime.stop_id);
    }
    for (const stop of gtfs.stops) {
        if (!stopsIds.has(stop.stop_id)) continue;
        gtfsStops[stop.stop_id] = stop;
    }

    const computedTrips = computeTrips(
        gtfsRoute,
        Date.now() - 2 * 24 * 60 * 60 * 1000,
        Date.now() + 24 * 60 * 60 * 1000
    );

    const stops = Object.values(gtfsStops).map((s) => ({
        id: s.stop_id,
        name: s.stop_name,
        zone: s.zone_id,
        parent: s.parent_station,
        lat: s.stop_lat,
        lon: s.stop_lon
    }));

    const trips = computedTrips.map((trip) => ({
        tripDate: trip.date.getTime(),
        tripId: trip.trip.trip_id,
        serviceId: trip.service.service_id,
        headsign: trip.trip.trip_headsign,
        direction: trip.trip.direction_id === "0" ? "outbound" : "inbound",
        stops: gtfsTrips[trip.trip.trip_id].stopTimes.map((st: any) => ({
            stopId: st.stop_id,
            departureTime: toDateTime(trip.date, st.departure_time).getTime(),
            arrivalTime: toDateTime(trip.date, st.arrival_time).getTime()
        }))
    }));
    trips.sort((a, b) => a.stops[0]!.departureTime - b.stops[0]!.departureTime);

    const nextTripIndex = trips.findIndex((t) => t.stops[0]!.departureTime >= Date.now());

    res.json({
        id: gtfsRoute.route_id,
        shortName: gtfsRoute.route_short_name,
        longName: gtfsRoute.route_long_name,
        color: gtfsRoute.route_color,
        trips: trips.slice(Math.max(0, nextTripIndex - 10), nextTripIndex + 10),
        stops
    });
});

app.get("/stops", (req, res) => {
    res.json({
        stops: gtfs.stops.map((stop) => ({
            id: stop.stop_id,
            name: stop.stop_name,
            zone: stop.zone_id,
            parent: stop.parent_station,
            lat: stop.stop_lat,
            lon: stop.stop_lon
        }))
    });
});

const server = http.createServer(app);

const trackingWss = new WebSocketServer({ noServer: true });
trackingWss.on("connection", (ws) => {
    console.log("Tracking client connected");
    for (const vehicle of Object.values(trackedVehicles)) ws.send(JSON.stringify({ event: "vehicle", data: vehicle }));
    ws.on("close", () => console.log("Tracking client disconnected"));
});

server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/lines/tracking") {
        socket.destroy();
        return;
    }
    trackingWss.handleUpgrade(req, socket, head, (ws) => trackingWss.emit("connection", ws, req));
});

let trackedVehicles: { [key: string]: any } = {};
setInterval(async () => {
    let res;
    try {
        res = await fetch("https://data.grandlyon.com/siri-lite/2.0/vehicle-monitoring.json", {
            headers: { Authorization: "Basic " + btoa(process.env.DATA_GRANDLYON_BASIC_AUTH!) }
        });
        if (!res.ok) throw new Error("Error from Grand Lyon API: " + res.status + " " + res.statusText);
    } catch (error) {
        console.error("Failed to fetch vehicle monitoring data");
        return;
    }
    const data: any = await res.json();
    for (const vehicle of data.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity) {
        const key = vehicle.MonitoredVehicleJourney.VehicleRef.value;
        if (trackedVehicles[key]?.RecordedAtTime === vehicle.RecordedAtTime) continue;
        trackedVehicles[key] = vehicle;
        for (const client of trackingWss.clients) client.send(JSON.stringify({ event: "vehicle", data: vehicle }));
    }
}, 2000);

server.listen(4000, () => console.log("Server is running on http://localhost:4000"));
