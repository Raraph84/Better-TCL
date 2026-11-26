import { parseISO8601Duration, toDate } from "./utils.js";

export const getVehicleMonitoring = async () => {
    let res;
    try {
        res = await fetch("https://data.grandlyon.com/siri-lite/2.0/vehicle-monitoring.json", {
            headers: { Authorization: "Basic " + btoa(process.env.DATA_GRANDLYON_BASIC_AUTH!) }
        });
        if (!res.ok) throw new Error("Error from Grand Lyon API: " + res.status + " " + res.statusText);
    } catch (error) {
        console.error("Failed to fetch vehicle monitoring data " + error);
        throw error;
    }

    const data: any = await res.json();
    const raw = data.Siri.ServiceDelivery.VehicleMonitoringDelivery?.[0].VehicleActivity ?? [];
    return (raw as any[]).map((vehicle) => {
        const rawServiceDate = vehicle.MonitoredVehicleJourney.FramedVehicleJourneyRef.DataFrameRef.value.split(":")[3];
        const serviceDate = toDate(rawServiceDate.replace(/\./g, "")).getTime();
        const tripId = vehicle.MonitoredVehicleJourney.FramedVehicleJourneyRef.DatedVehicleJourneyRef.split(":")[3];
        return {
            vehicleId: vehicle.MonitoredVehicleJourney.VehicleRef.value.split(":")[3],
            lineId: vehicle.MonitoredVehicleJourney.LineRef.value.split(":")[3],
            fullTripId: Buffer.from(serviceDate + "-" + tripId).toString("base64url"),
            serviceDate,
            tripId,
            latitude: vehicle.MonitoredVehicleJourney.VehicleLocation.Latitude,
            longitude: vehicle.MonitoredVehicleJourney.VehicleLocation.Longitude,
            delay: parseISO8601Duration(vehicle.MonitoredVehicleJourney.Delay),
            time: new Date(vehicle.RecordedAtTime).getTime()
        };
    });
};
