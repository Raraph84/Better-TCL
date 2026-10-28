import unzipper from "unzipper";

const parse = async (zip: unzipper.CentralDirectory, filename: string) =>
    (await zip.files.find((file) => file.path === filename)!.buffer())
        .toString()
        .split(/\r\n|\n\r|\n|\r/)
        .slice(1)
        .filter((l) => l.length)
        .map((l) => l.split(","));

const toDate = (d: string): Date => new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));
export const toDateTime = (date: Date, t: string): Date =>
    new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        Number(t.slice(0, 2)),
        Number(t.slice(3, 5)),
        Number(t.slice(6, 8))
    );

export const parseGtfs = async (gtfs: Buffer) => {
    const zip = await unzipper.Open.buffer(gtfs);

    const services = (await parse(zip, "calendar.txt")).map((c) => ({
        service_id: c[0]!,
        monday: c[1]! === "1",
        tuesday: c[2]! === "1",
        wednesday: c[3]! === "1",
        thursday: c[4]! === "1",
        friday: c[5]! === "1",
        saturday: c[6]! === "1",
        sunday: c[7]! === "1",
        start_date: toDate(c[8]!),
        end_date: toDate(c[9]!)
    }));
    const serviceExceptions = (await parse(zip, "calendar_dates.txt")).map((c) => ({
        service_id: c[0]!,
        date: toDate(c[1]!),
        exception_type: c[2]!
    }));
    const lines = (await parse(zip, "routes.txt")).map((r) => ({
        route_id: r[0]!,
        agency_id: r[1]!,
        route_short_name: r[2]!,
        route_long_name: r[3]!,
        route_desc: r[4]!,
        route_type: r[5]!,
        route_url: r[6]!,
        route_color: r[7]!,
        route_text_color: r[8]!
    }));
    const trips = (await parse(zip, "trips.txt")).map((t) => ({
        route_id: t[0]!,
        service_id: t[1]!,
        trip_id: t[2]!,
        trip_headsign: t[3]!,
        trip_short_name: t[4]!,
        direction_id: t[5]!,
        shape_id: t[6]!,
        wheelchair_accessible: t[7]!,
        bikes_allowed: t[8]! === "1"
    }));
    const stopTimes = (await parse(zip, "stop_times.txt")).map((s) => ({
        trip_id: s[0]!,
        arrival_time: s[1]!,
        departure_time: s[2]!,
        stop_id: s[3]!,
        stop_sequence: s[4]!,
        pickup_type: s[5]!,
        drop_off_type: s[6]!
    }));
    const stops = (await parse(zip, "stops.txt")).map((s) => ({
        stop_id: s[0]!,
        stop_code: s[1]!,
        stop_name: s[2]!,
        stop_desc: s[3]!,
        zone_id: s[4]!,
        stop_url: s[5]!,
        location_type: s[6]!,
        parent_station: s[7]!,
        stop_timezone: s[8]!,
        wheelchair_boarding: s[9]!,
        stop_lat: Number(s[10]),
        stop_lon: Number(s[11])
    }));

    return { services, serviceExceptions, lines, stopTimes, stops, trips };
};
