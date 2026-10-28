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
        id: c[0]!,
        monday: c[1]! === "1",
        tuesday: c[2]! === "1",
        wednesday: c[3]! === "1",
        thursday: c[4]! === "1",
        friday: c[5]! === "1",
        saturday: c[6]! === "1",
        sunday: c[7]! === "1",
        startDate: toDate(c[8]!),
        endDate: toDate(c[9]!)
    }));
    const serviceExceptions = (await parse(zip, "calendar_dates.txt")).map((c) => ({
        serviceId: c[0]!,
        date: toDate(c[1]!),
        exceptionType: c[2]!
    }));
    const lines = (await parse(zip, "routes.txt")).map((r) => ({
        id: r[0]!,
        agencyId: r[1]!,
        shortName: r[2]!,
        longName: r[3]!,
        description: r[4]!,
        type: r[5]!,
        url: r[6]!,
        color: r[7]!,
        textColor: r[8]!
    }));
    const trips = (await parse(zip, "trips.txt")).map((t) => ({
        lineId: t[0]!,
        serviceId: t[1]!,
        id: t[2]!,
        headsign: t[3]!,
        shortName: t[4]!,
        directionId: t[5]!,
        shapeId: t[6]!,
        wheelchairAccessible: t[7]!,
        bikesAllowed: t[8]! === "1"
    }));
    const stopTimes = (await parse(zip, "stop_times.txt")).map((s) => ({
        tripId: s[0]!,
        arrivalTime: s[1]!,
        departureTime: s[2]!,
        stopId: s[3]!,
        stopSequence: s[4]!,
        pickupType: s[5]!,
        dropOffType: s[6]!
    }));
    const stops = (await parse(zip, "stops.txt")).map((s) => ({
        id: s[0]!,
        code: s[1]!,
        name: s[2]!,
        description: s[3]!,
        zoneId: s[4]!,
        url: s[5]!,
        locationType: s[6]!,
        parentStation: s[7]!,
        timezone: s[8]!,
        wheelchairBoarding: s[9]!,
        latitude: Number(s[10]),
        longitude: Number(s[11])
    }));

    return { services, serviceExceptions, lines, stopTimes, stops, trips };
};
