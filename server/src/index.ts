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

let gtfs = fs.existsSync("gtfs.zip") ? await parseGtfs(await fs.promises.readFile("gtfs.zip")) : null;

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
    const serviceIds = new Set(trips.map((trip) => trip.serviceId));
    const services = gtfs!.services.filter((calendar) => serviceIds.has(calendar.id));
    const servicesDates = gtfs!.serviceExceptions.filter((calendarDate) => serviceIds.has(calendarDate.serviceId));

    const computedServices = [];
    for (const service of services) {
        for (let date = new Date(service.startDate); date <= service.endDate; date.setDate(date.getDate() + 1)) {
            if (date.getTime() < startDate || date.getTime() >= endDate) continue;
            if (date.getDay() === 0 && !service.sunday) continue;
            if (date.getDay() === 1 && !service.monday) continue;
            if (date.getDay() === 2 && !service.tuesday) continue;
            if (date.getDay() === 3 && !service.wednesday) continue;
            if (date.getDay() === 4 && !service.thursday) continue;
            if (date.getDay() === 5 && !service.friday) continue;
            if (date.getDay() === 6 && !service.saturday) continue;
            const serviceDate = servicesDates.find(
                (cd) => cd.serviceId === service.id && cd.date.getTime() === date.getTime()
            );
            if (serviceDate?.exceptionType === "2") continue;
            computedServices.push({ date: new Date(date), service });
        }
    }
    return computedServices;
};

const computeTrips = (route: any, startDate: number, endDate: number) => {
    const trips = gtfs!.trips.filter((trip) => trip.lineId === route.id);
    const services = computeServices(trips, startDate, endDate);

    const computedTrips = [];
    for (const service of services) {
        const serviceTrips = trips.filter((trip) => trip.serviceId === service.service.id);
        for (const trip of serviceTrips) computedTrips.push({ ...service, trip });
    }
    return computedTrips;
};

app.get("/lines", (req, res) => {
    res.json({
        lines: gtfs!.lines.map((route) => ({
            id: route.id,
            shortName: route.shortName,
            longName: route.longName,
            color: route.color
        }))
    });
});

app.get("/lines/:id", (req, res) => {
    const gtfsRoute = gtfs!.lines.find((r) => r.id === req.params.id);
    if (!gtfsRoute) return res.status(404).json({ error: "Line not found" });

    const gtfsTrips: { [key: string]: any } = {};
    const gtfsStops: { [key: string]: any } = {};
    const stopsIds = new Set<string>();
    for (const trip of gtfs!.trips) {
        if (trip.lineId !== gtfsRoute.id) continue;
        gtfsTrips[trip.id] = { ...trip, stopTimes: [] };
    }
    for (const stopTime of gtfs!.stopTimes) {
        if (!gtfsTrips[stopTime.tripId]) continue;
        gtfsTrips[stopTime.tripId].stopTimes.push(stopTime);
        stopsIds.add(stopTime.stopId);
    }
    for (const stop of gtfs!.stops) {
        if (!stopsIds.has(stop.id)) continue;
        gtfsStops[stop.id] = stop;
    }

    const stops = [];
    stopsIds.clear();
    for (const trip of Object.values(gtfsTrips)) {
        for (const stopTime of trip.stopTimes) {
            if (stopsIds.has(trip.directionId + "-" + stopTime.stopId)) continue;
            stopsIds.add(trip.directionId + "-" + stopTime.stopId);
            const stop = gtfsStops[stopTime.stopId];
            stops.push({
                id: stop.id,
                name: stop.name,
                zone: stop.zoneId,
                parent: stop.parentStation,
                lat: stop.latitude,
                lon: stop.longitude,
                direction: trip.directionId === "0" ? "outbound" : "inbound"
            });
        }
    }

    const computedTrips = computeTrips(
        gtfsRoute,
        Date.now() - 2 * 24 * 60 * 60 * 1000,
        Date.now() + 24 * 60 * 60 * 1000
    );

    const trips = computedTrips.map((trip) => ({
        tripDate: trip.date.getTime(),
        tripId: trip.trip.id,
        serviceId: trip.service.id,
        headsign: trip.trip.headsign,
        direction: trip.trip.directionId === "0" ? "outbound" : "inbound",
        stops: gtfsTrips[trip.trip.id].stopTimes.map((st: any) => ({
            stopId: st.stopId,
            departureTime: toDateTime(trip.date, st.departureTime).getTime(),
            arrivalTime: toDateTime(trip.date, st.arrivalTime).getTime()
        }))
    }));
    trips.sort((a, b) => a.stops[0]!.departureTime - b.stops[0]!.departureTime);

    const firstCurrent = trips.findIndex(
        (trip) => trip.stops[trip.stops.length - 1]!.departureTime >= Date.now() - 15 * 60 * 1000
    );
    const lastCurrent = trips.findIndex((trip) => trip.stops[0]!.departureTime >= Date.now() - 15 * 60 * 1000);

    res.json({
        id: gtfsRoute.id,
        shortName: gtfsRoute.shortName,
        longName: gtfsRoute.longName,
        color: gtfsRoute.color,
        trips: trips.slice(firstCurrent, Math.max(lastCurrent, firstCurrent + 10)),
        stops
    });
});

app.get("/stops", (req, res) => {
    res.json({
        stops: gtfs!.stops.map((stop) => ({
            id: stop.id,
            name: stop.name,
            zone: stop.zoneId,
            parent: stop.parentStation,
            lat: stop.latitude,
            lon: stop.longitude
        }))
    });
});

app.get("/stops/:id", (req, res) => {
    const stop = gtfs!.stops.find((s) => s.id === req.params.id);
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const stopId = stop.parentStation ?? stop.id;
    const stopsIds = new Set<string>(gtfs!.stops.filter((s) => s.parentStation === stopId).map((s) => s.id));
    const tripsIds = new Set<string>();
    const routesIds = new Set<string>();
    const lines = [];
    for (const stopTime of gtfs!.stopTimes) {
        if (!stopsIds.has(stopTime.stopId)) continue;
        tripsIds.add(stopTime.tripId);
    }
    for (const trip of gtfs!.trips) {
        if (!tripsIds.has(trip.id)) continue;
        routesIds.add(trip.lineId);
    }
    for (const route of gtfs!.lines) {
        if (!routesIds.has(route.id)) continue;
        lines.push({
            id: route.id,
            shortName: route.shortName,
            longName: route.longName,
            color: route.color
        });
    }

    lines.sort((a, b) => a.shortName.localeCompare(b.shortName, undefined, { numeric: true }));

    res.json({
        id: stop.id,
        name: stop.name,
        zone: stop.zoneId,
        parent: stop.parentStation,
        lat: stop.latitude,
        lon: stop.longitude,
        lines
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
