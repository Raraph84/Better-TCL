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

const pickValue = <T>(obj: { [key: string]: T }, key: string): T => {
    if (!(key in obj)) throw new Error("Invalid value for " + key);
    return obj[key]!;
};

export const parseGtfs = async (gtfs: Buffer) => {
    const zip = await unzipper.Open.buffer(gtfs);

    const services: Service[] = (await parse(zip, "calendar.txt")).map((service) => ({
        id: service[0]!,
        monday: pickValue({ "0": false, "1": true }, service[1]!),
        tuesday: pickValue({ "0": false, "1": true }, service[2]!),
        wednesday: pickValue({ "0": false, "1": true }, service[3]!),
        thursday: pickValue({ "0": false, "1": true }, service[4]!),
        friday: pickValue({ "0": false, "1": true }, service[5]!),
        saturday: pickValue({ "0": false, "1": true }, service[6]!),
        sunday: pickValue({ "0": false, "1": true }, service[7]!),
        startDate: toDate(service[8]!),
        endDate: toDate(service[9]!)
    }));
    const serviceExceptions: ServiceException[] = (await parse(zip, "calendar_dates.txt")).map((serviceException) => ({
        serviceId: serviceException[0]!,
        date: toDate(serviceException[1]!),
        exceptionType: pickValue({ "1": "added", "2": "removed" }, serviceException[2]!)
    }));
    const lines: Line[] = (await parse(zip, "routes.txt")).map((line) => ({
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
    const trips: Trip[] = (await parse(zip, "trips.txt")).map((trip) => ({
        id: trip[2]!,
        lineId: trip[0]!,
        serviceId: trip[1]!,
        headsign: trip[3]!,
        shortName: trip[4]!,
        direction: pickValue({ "0": "outbound", "1": "inbound" }, trip[5]!),
        shapeId: trip[6]!,
        wheelchairAccessible: trip[7]!,
        bikesAllowed: trip[8]!
    }));
    const stopTimes: StopTime[] = (await parse(zip, "stop_times.txt")).map((stopTime) => ({
        tripId: stopTime[0]!,
        arrivalTime: stopTime[1]!,
        departureTime: stopTime[2]!,
        stopId: stopTime[3]!,
        sequence: stopTime[4]!,
        pickupType: stopTime[5]!,
        dropOffType: stopTime[6]!
    }));
    const stops: Stop[] = (await parse(zip, "stops.txt")).map((stop) => ({
        id: stop[0]!,
        code: stop[1]!,
        name: stop[2]!,
        description: stop[3]!,
        zoneId: stop[4]!,
        url: stop[5]!,
        locationType: stop[6]!,
        parentStation: stop[7]! || null,
        timezone: stop[8]!,
        wheelchairBoarding: stop[9]!,
        latitude: Number(stop[10]),
        longitude: Number(stop[11])
    }));

    return { services, serviceExceptions, lines, stopTimes, stops, trips };
};

export type Service = {
    id: string;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    startDate: Date;
    endDate: Date;
};

export type ServiceException = {
    serviceId: string;
    date: Date;
    exceptionType: "added" | "removed";
};

export type Line = {
    id: string;
    agencyId: string;
    shortName: string;
    longName: string;
    description: string;
    type: string;
    url: string;
    color: string;
    textColor: string;
};

export type Trip = {
    id: string;
    lineId: string;
    serviceId: string;
    headsign: string;
    shortName: string;
    direction: "inbound" | "outbound";
    shapeId: string;
    wheelchairAccessible: string;
    bikesAllowed: string;
};

export type StopTime = {
    tripId: string;
    arrivalTime: string;
    departureTime: string;
    stopId: string;
    sequence: string;
    pickupType: string;
    dropOffType: string;
};

export type Stop = {
    id: string;
    code: string;
    name: string;
    description: string;
    zoneId: string;
    url: string;
    locationType: string;
    parentStation: string | null;
    timezone: string;
    wheelchairBoarding: string;
    latitude: number;
    longitude: number;
};
