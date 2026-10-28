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

    const services = (await parse(zip, "calendar.txt")).map((service) => ({
        id: service[0]!,
        monday: service[1]! === "1",
        tuesday: service[2]! === "1",
        wednesday: service[3]! === "1",
        thursday: service[4]! === "1",
        friday: service[5]! === "1",
        saturday: service[6]! === "1",
        sunday: service[7]! === "1",
        startDate: toDate(service[8]!),
        endDate: toDate(service[9]!)
    }));
    const serviceExceptions = (await parse(zip, "calendar_dates.txt")).map((serviceException) => ({
        serviceId: serviceException[0]!,
        date: toDate(serviceException[1]!),
        exceptionType: serviceException[2]!
    }));
    const lines = (await parse(zip, "routes.txt")).map((line) => ({
        id: line[0]!,
        agencyId: line[1]!,
        shortName: line[2]!,
        longName: line[3]!,
        description: line[4]!,
        type: line[5]!,
        url: line[6]!,
        color: line[7]!,
        textColor: line[8]!
    }));
    const trips = (await parse(zip, "trips.txt")).map((trip) => ({
        lineId: trip[0]!,
        serviceId: trip[1]!,
        id: trip[2]!,
        headsign: trip[3]!,
        shortName: trip[4]!,
        directionId: trip[5]!,
        shapeId: trip[6]!,
        wheelchairAccessible: trip[7]!,
        bikesAllowed: trip[8]! === "1"
    }));
    const stopTimes = (await parse(zip, "stop_times.txt")).map((stopTime) => ({
        tripId: stopTime[0]!,
        arrivalTime: stopTime[1]!,
        departureTime: stopTime[2]!,
        stopId: stopTime[3]!,
        stopSequence: stopTime[4]!,
        pickupType: stopTime[5]!,
        dropOffType: stopTime[6]!
    }));
    const stops = (await parse(zip, "stops.txt")).map((stop) => ({
        id: stop[0]!,
        code: stop[1]!,
        name: stop[2]!,
        description: stop[3]!,
        zoneId: stop[4]!,
        url: stop[5]!,
        locationType: stop[6]!,
        parentStation: stop[7]!,
        timezone: stop[8]!,
        wheelchairBoarding: stop[9]!,
        latitude: Number(stop[10]),
        longitude: Number(stop[11])
    }));

    return { services, serviceExceptions, lines, stopTimes, stops, trips };
};
