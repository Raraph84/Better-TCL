import { toDateTime, type Gtfs, type Line, type Stop, type Trip } from "./gtfs.js";

const computeServices = (gtfs: Gtfs, trips: Trip[], startDate: number, endDate: number) => {
    const services = new Set(trips.map((trip) => gtfs.services[trip.serviceId]!));

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
            const serviceException = service.exceptions.find((se) => se.date.getTime() === date.getTime());
            if (serviceException?.exceptionType === "removed") continue;
            computedServices.push({ date: new Date(date), service });
        }
        for (const serviceException of service.exceptions) {
            if (serviceException.exceptionType !== "added") continue;
            if (serviceException.date.getTime() < startDate || serviceException.date.getTime() >= endDate) continue;
            computedServices.push({ date: new Date(serviceException.date), service });
        }
    }
    return computedServices;
};

const computeTrips = (gtfs: Gtfs, line: Line, startDate: number, endDate: number) => {
    const services = computeServices(gtfs, line.trips, startDate, endDate);

    const computedTrips = [];
    for (const service of services) {
        const serviceTrips = line.trips.filter((trip) => trip.serviceId === service.service.id);
        for (const trip of serviceTrips) computedTrips.push({ ...service, trip });
    }
    return computedTrips;
};

export const getLine = (gtfs: Gtfs, line: Line, withStops: boolean = false, withTrips: boolean = false) => {
    const stops = [];
    if (withStops) {
        const addedStops = new Set<string>();
        for (const trip of line.trips) {
            for (const stopTime of trip.stopTimes.sort((a, b) => a.sequence - b.sequence)) {
                if (addedStops.has(trip.direction + "-" + stopTime.stopId)) continue;
                addedStops.add(trip.direction + "-" + stopTime.stopId);
                stops.push({ ...getStop(gtfs, gtfs.stops[stopTime.stopId]!), direction: trip.direction });
            }
        }
    }

    let trips: any[] = [];
    if (withTrips) {
        const computedTrips = computeTrips(
            gtfs,
            line,
            Date.now() - 2 * 24 * 60 * 60 * 1000,
            Date.now() + 24 * 60 * 60 * 1000
        );

        for (const trip of computedTrips) {
            const stops = gtfs.trips[trip.trip.id]!.stopTimes;
            const arrivalTime = toDateTime(trip.date, stops.slice(-1)[0]!.departureTime).getTime();
            if (arrivalTime < Date.now() - 10 * 60 * 1000) continue;
            trips.push({
                serviceDate: trip.date.getTime(),
                serviceId: trip.service.id,
                tripId: trip.trip.id,
                direction: trip.trip.direction,
                stops: stops.map((stopTime) => ({
                    stopId: stopTime.stopId,
                    time: toDateTime(trip.date, stopTime.departureTime).getTime()
                }))
            });
        }

        trips.sort((a, b) => a.stops[0]!.time - b.stops[0]!.time);
        const minTrip = trips.findIndex((trip) => trip.stops[0]!.time >= Date.now() + 10 * 60 * 1000);
        trips = trips.slice(0, Math.max(minTrip, 10));
    }

    return {
        id: line.id,
        shortName: line.shortName,
        longName: line.longName,
        color: line.color,
        textColor: line.textColor,
        ...(withStops ? { stops } : {}),
        ...(withTrips ? { trips } : {})
    };
};

export const getStop = (gtfs: Gtfs, stop: Stop, withLines: boolean = false, withNextStops: boolean = false): any => {
    let lines;
    if (withLines || withNextStops) {
        const stops = [stop, ...Object.values(gtfs.stops).filter((s) => s.parentStation === stop.id)];

        const linesMap: { [key: string]: any } = {};
        for (const stop of stops) {
            for (const stopTime of stop.stopTimes) {
                const trip = gtfs.trips[stopTime.tripId]!;
                if (!linesMap[trip.lineId])
                    linesMap[trip.lineId] = {
                        ...getLine(gtfs, gtfs.lines[trip.lineId]!, true),
                        directions: [trip.direction],
                        nextStops: []
                    };
                else if (!linesMap[trip.lineId].directions.includes(trip.direction))
                    linesMap[trip.lineId].directions.push(trip.direction);
            }
        }
        lines = Object.values(linesMap);
        lines.sort((a, b) => a.shortName.localeCompare(b.shortName, undefined, { numeric: true }));
    }

    let nextStops: any[] = [];
    if (withNextStops) {
        const stops = [stop, ...Object.values(gtfs.stops).filter((s) => s.parentStation === stop.id)];

        for (const line of lines!) {
            const computedTrips = computeTrips(
                gtfs,
                gtfs.lines[line.id]!,
                Date.now() - 2 * 24 * 60 * 60 * 1000,
                Date.now() + 24 * 60 * 60 * 1000
            );

            for (const trip of computedTrips) {
                for (const stopTime of gtfs.trips[trip.trip.id]!.stopTimes) {
                    if (!stops.some((stop) => stop.id === stopTime.stopId)) continue;
                    const time = toDateTime(trip.date, stopTime.departureTime).getTime();
                    if (time < Date.now() - 15 * 60 * 1000) continue;
                    const stopTimes = [...gtfs.trips[trip.trip.id]!.stopTimes].sort((a, b) => a.sequence - b.sequence);
                    nextStops.push({
                        lineId: line.id,
                        serviceDate: trip.date.getTime(),
                        serviceId: trip.service.id,
                        tripId: trip.trip.id,
                        direction: trip.trip.direction,
                        directionStop: getStop(gtfs, gtfs.stops[stopTimes.slice(-1)[0]!.stopId]!),
                        stopId: stopTime.stopId,
                        time
                    });
                }
            }
        }

        nextStops.sort((a, b) => a.time - b.time);

        for (const nextStop of nextStops) {
            if (nextStop.time < Date.now() - 60 * 1000) continue;
            const line = lines!.find((line) => line.id === nextStop.lineId);
            if (line.nextStops.filter((s: any) => s.direction === nextStop.direction).length >= 2) continue;
            line.nextStops.push(nextStop);
        }

        const minNextStop = nextStops.findIndex((nextStop) => nextStop.time >= Date.now() + 30 * 60 * 1000);
        nextStops = nextStops.slice(0, Math.max(minNextStop, 25));
    }

    return {
        id: stop.id,
        name: stop.name,
        zone: stop.zoneId,
        parent: stop.parentStation,
        lat: stop.latitude,
        lon: stop.longitude,
        ...(withLines ? { lines } : {}),
        ...(withNextStops ? { nextStops } : {})
    };
};
