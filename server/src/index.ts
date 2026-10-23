import fs from "node:fs";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { parseGtfs } from "./gtfs.js";

dotenv.config({ quiet: true });

const app = express();
app.use(cors());

let gtfs = fs.existsSync("gtfs.zip")
    ? await parseGtfs(await fs.promises.readFile("gtfs.zip"))
    : { calendar: [], calendarDates: [], trips: [], stopTimes: [], stops: [] };

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

app.get("/gtfs/calendar", (req, res) => res.json({ calendar: gtfs.calendar }));
app.get("/gtfs/calendar-dates", (req, res) => res.json({ calendarDates: gtfs.calendarDates }));
app.get("/gtfs/trips", (req, res) => res.json({ trips: gtfs.trips }));
app.get("/gtfs/stop-times", (req, res) => res.json({ stopTimes: gtfs.stopTimes }));
app.get("/gtfs/stops", (req, res) => res.json({ stops: gtfs.stops }));

app.listen(4000, () => console.log("Server is running on http://localhost:4000"));
