import fs from "node:fs";
import http from "node:http";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { parseGtfs } from "./gtfs.js";
import { getLine, getStop, getTrip } from "./processing.js";
import { parseISO8601Duration, toDate } from "./utils.js";

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

app.get("/lines", (req, res) => {
    res.json({ lines: Object.values(gtfs!.lines).map((line) => getLine(gtfs!, line)) });
});

app.get("/lines/:id", (req, res) => {
    const line = gtfs!.lines[req.params.id];
    if (!line) return res.status(404).json({ error: "Line not found" });
    res.json(getLine(gtfs!, line, true, true));
});

app.get("/stops", (req, res) => {
    res.json({ stops: Object.values(gtfs!.stops).map((stop) => getStop(gtfs!, stop)) });
});

app.get("/stops/:id", (req, res) => {
    const stop = gtfs!.stops[req.params.id];
    if (!stop) return res.status(404).json({ error: "Stop not found" });
    res.json(getStop(gtfs!, stop, true, true));
});

app.get("/trips/:id", (req, res) => {
    const trip = getTrip(gtfs!, req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(trip);
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
        console.error("Failed to fetch vehicle monitoring data " + error);
        return;
    }
    const data: any = await res.json();
    const rawVehicles = data.Siri.ServiceDelivery.VehicleMonitoringDelivery?.[0].VehicleActivity ?? [];
    const vehicles = (rawVehicles as any[]).map((vehicle) => {
        const rawServiceDate = vehicle.MonitoredVehicleJourney.FramedVehicleJourneyRef.DataFrameRef.value.split(":")[3];
        const serviceDate = toDate(rawServiceDate.replace(/\./g, "")).getTime();
        const tripId = vehicle.MonitoredVehicleJourney.FramedVehicleJourneyRef.DatedVehicleJourneyRef.split(":")[3];
        return {
            id: vehicle.MonitoredVehicleJourney.VehicleRef.value.split(":")[3],
            lineId: vehicle.MonitoredVehicleJourney.LineRef.value.split(":")[3],
            fullTripId: Buffer.from(serviceDate + "-" + tripId).toString("base64url"),
            serviceDate: serviceDate,
            tripId: tripId,
            direction: vehicle.MonitoredVehicleJourney.DirectionRef.value,
            directionStopId: vehicle.MonitoredVehicleJourney.DestinationRef.value.split(":")[3],
            latitude: vehicle.MonitoredVehicleJourney.VehicleLocation.Latitude,
            longitude: vehicle.MonitoredVehicleJourney.VehicleLocation.Longitude,
            lastStopId: vehicle.MonitoredVehicleJourney.MonitoredCall.StopPointRef.value.split(":")[3],
            lastStopSequence: vehicle.MonitoredVehicleJourney.MonitoredCall.Order,
            delay: parseISO8601Duration(vehicle.MonitoredVehicleJourney.Delay),
            time: new Date(vehicle.RecordedAtTime).getTime()
        };
    });

    for (const trackedVehicleKey in trackedVehicles) {
        if (vehicles.some((vehicle) => vehicle.id === trackedVehicleKey)) continue;
        delete trackedVehicles[trackedVehicleKey];
    }
    for (const vehicle of vehicles) {
        if (trackedVehicles[vehicle.id]?.time === vehicle.time) continue;
        trackedVehicles[vehicle.id] = vehicle;
        for (const client of trackingWss.clients) client.send(JSON.stringify({ event: "vehicle", data: vehicle }));
    }
}, 10_000);

app.get("/vehicles", (req, res) => {
    res.json({ vehicles: Object.values(trackedVehicles) });
});

server.listen(4000, () => console.log("Server is running on http://localhost:4000"));
