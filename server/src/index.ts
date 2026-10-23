import dotenv from "dotenv";
import express from "express";

dotenv.config({ quiet: true });

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(4000, () => console.log("Server is running on http://localhost:4000"));
