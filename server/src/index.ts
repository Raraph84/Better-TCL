import dotenv from "dotenv";
import express from "express";
import { getGtfs } from "./gtfs.js";

dotenv.config({ quiet: true });

const app = express();

let gtfs = await getGtfs();
setInterval(async () => (gtfs = await getGtfs()), 60 * 60 * 1000);

app.get("/gtfs/calendar", (req, res) => res.json({ calendar: gtfs.calendar }));
app.get("/gtfs/calendar-dates", (req, res) => res.json({ calendarDates: gtfs.calendarDates }));
app.get("/gtfs/trips", (req, res) => res.json({ trips: gtfs.trips }));
app.get("/gtfs/stop-times", (req, res) => res.json({ stopTimes: gtfs.stopTimes }));
app.get("/gtfs/stops", (req, res) => res.json({ stops: gtfs.stops }));

app.listen(4000, () => console.log("Server is running on http://localhost:4000"));
