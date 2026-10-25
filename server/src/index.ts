import fs from "node:fs";
import http from "node:http";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { parseGtfs } from "./gtfs.js";

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
    const collections = await Promise.all(LINES_URLS.map((url) => fetch(url).then((res) => res.json())));
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
    const req = await fetch("https://download.data.grandlyon.com/files/rdata/tcl_sytral.tcltheorique/GTFS_TCL.ZIP", {
        headers: { Authorization: "Basic " + btoa(process.env.DATA_GRANDLYON_BASIC_AUTH!) }
    });
    if (!req.ok) throw new Error("Failed to fetch data from Grand Lyon API");
    const data = Buffer.from(await req.arrayBuffer());
    await fs.promises.writeFile("gtfs.zip", data);
    gtfs = await parseGtfs(data);
    console.log("GTFS data updated successfully");
};

updateGtfs();
setInterval(updateGtfs, 60 * 60 * 1000);

app.get("/lines", (req, res) => res.json(linesGeojson));

app.get("/gtfs/calendar", (req, res) => res.json({ calendar: gtfs.calendar }));
app.get("/gtfs/calendar-dates", (req, res) => res.json({ calendarDates: gtfs.calendarDates }));
app.get("/gtfs/routes", (req, res) => res.json({ routes: gtfs.routes }));
app.get("/gtfs/stop-times", (req, res) => res.json({ stopTimes: gtfs.stopTimes }));
app.get("/gtfs/stops", (req, res) => res.json({ stops: gtfs.stops }));
app.get("/gtfs/trips", (req, res) => res.json({ trips: gtfs.trips }));

const server = http.createServer(app);

const trackingWss = new WebSocketServer({ noServer: true });
trackingWss.on("connection", (ws) => {
    console.log("Tracking client connected");
    ws.on("close", () => console.log("Tracking client disconnected"));
});

server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/lines/tracking") {
        socket.destroy();
        return;
    }
    trackingWss.handleUpgrade(req, socket, head, (ws) => trackingWss.emit("connection", ws, req));
});

server.listen(4000, () => console.log("Server is running on http://localhost:4000"));
