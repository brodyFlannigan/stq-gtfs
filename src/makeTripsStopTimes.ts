import fs from "fs";
import path from "path";
import { differenceInCalendarDays, parseISO, add,addDays, setHours, setMinutes, setSeconds, differenceInDays, getHours, format, getMinutes, getSeconds, getDate } from "date-fns";
import {  fromZonedTime, toZonedTime } from "date-fns-tz";

interface ServicePattern {
  route_id: string;
  access_data: { wheelchair_accessible: string; bikes_allowed: string };
  service_patterns: Array<{
    departure_shore: string;
    arrival_shore: string;
    gtfs_direction_id: string;
    gtfs_trip_headsign: string;
    gtfs_departure_stop_id: string;
    gtfs_arrival_stop_id: string;
    travel_minutes: number;
  }>;
}
interface StopInfo {
  stop_id: string;
  stop_timezone: string;
}


const stopsFilePath = path.resolve("data/static/stops.json");
const stopsFileContent = fs.readFileSync(stopsFilePath, "utf-8");
const stopsJson = JSON.parse(stopsFileContent);
const stopData: StopInfo[] = stopsJson.data;

function getAdjustedTime(time: string, tripDate: string, serviceDate: string, stopId: string): string {
    const stopInfo = stopData.find((stop) => stop.stop_id === stopId);
    const localTimeZone = stopInfo ? stopInfo.stop_timezone : "America/Montreal";
    const targetTimeZone = "America/Toronto";

    const localTripDateTime = `${tripDate}T${time}`
    const utcTripDateTime = fromZonedTime(localTripDateTime, localTimeZone)
    const localServiceDateTime = `${serviceDate}T04:00:00`
    const utcServiceDateTime = fromZonedTime(localServiceDateTime, localTimeZone)
    const normalizedTripDateTime = toZonedTime(utcTripDateTime, targetTimeZone)
    const normalizedServiceDateTime = toZonedTime(utcServiceDateTime, targetTimeZone)

    const serviceTripDateDifference = differenceInDays(normalizedTripDateTime, normalizedServiceDateTime)

    console.log(`Trip time: ${time} - Trip date: ${tripDate} - Service date: ${serviceDate} - Stop ID: ${stopId}\n
    Local trip time: ${localTripDateTime}\n
    Local service date time: ${localServiceDateTime}\n
    Stop timezone: ${localTimeZone}
    UTC trip time: ${utcTripDateTime}\n
    UTC service time: ${utcServiceDateTime}\n
    Normalized trip time: ${normalizedTripDateTime}\n
    Normalized service date: ${normalizedServiceDateTime}\n
    Difference between trip & service date: ${serviceTripDateDifference}\n
    ============
    `)

    const adjustedTripHours = getHours(normalizedTripDateTime)
    const adjustmentToTripHours = 0
    if (tripDate != serviceDate) {
        let adjustedTripHours = +getHours(normalizedTripDateTime) +24
        function getAdjustedTripHours(){
            return adjustedTripHours.toString(10)
        }
        const adjustedGtfsTripTime =`${getAdjustedTripHours()}:${format(normalizedTripDateTime, "mm:ss")}`
        return adjustedGtfsTripTime
    }
    const gtfsTripTime = `${adjustedTripHours.toString(10)}:${format(normalizedTripDateTime, "mm:ss")}`

 return gtfsTripTime
}
    

export function createTripsAndStopTimes(
  scheduleData: any[],
  servicePatterns: ServicePattern[]
) {
  const tripsData: {
    route_id: string;
    service_id: string;
    trip_id: string;
    trip_headsign: string;
    direction_id: string;
    wheelchair_accessible: string;
    bikes_allowed: string;
  }[] = [];
  const stopTimesData: {
    trip_id: string;
    arrival_time: string;
    departure_time: string;
    stop_id: string;
    stop_sequence: string;
    pickup_type: string;
    drop_off_type: string;
  }[] = [];

  scheduleData.forEach(({ route, data }) => {
    const patterns = servicePatterns.find(
      (pattern) => pattern.route_id === route
    );
    if (!patterns) {
      throw new Error(`No service patterns found for route_id: ${route}`);
    }

    data.trajet.forEach((trajet: { rive_depart: string; rive_arrivee: string; jour: any[]; }) => {
      const pattern = patterns.service_patterns.find(
        (p) =>
          p.departure_shore === trajet.rive_depart &&
          p.arrival_shore === trajet.rive_arrivee
      );
      if (!pattern) {
        throw new Error(
          `No matching service pattern for ${trajet.rive_depart} to ${trajet.rive_arrivee}`
        );
      }

      trajet.jour.forEach((jour) => {
        jour.depart.forEach((depart: { heure: string; date: string; }) => {
          const serviceId = jour.date.replace(/-/g, "");
          const tripId = `${route}_${serviceId}_${
            pattern.gtfs_departure_stop_id
          }_${pattern.gtfs_arrival_stop_id}_${getAdjustedTime(depart.heure,depart.date,jour.date,pattern.gtfs_departure_stop_id).replace(/:/g, "")}`;
          const arrivalTimeAtFirstStop = getAdjustedTime(
            depart.heure,
            depart.date,
            jour.date,
            pattern.gtfs_departure_stop_id
          );

          tripsData.push({
            route_id: route,
            service_id: serviceId,
            trip_id: tripId,
            trip_headsign: pattern.gtfs_trip_headsign,
            direction_id: pattern.gtfs_direction_id,
            wheelchair_accessible: patterns.access_data.wheelchair_accessible,
            bikes_allowed: patterns.access_data.bikes_allowed,
          });

          stopTimesData.push({
            trip_id: tripId,
            arrival_time: arrivalTimeAtFirstStop,
            departure_time: arrivalTimeAtFirstStop,
            stop_id: pattern.gtfs_departure_stop_id,
            stop_sequence: "1",
            pickup_type: "0",
            drop_off_type: "1",
          })
          stopTimesData.push({
            trip_id: tripId,
            arrival_time: arrivalTimeAtFirstStop,
            departure_time: arrivalTimeAtFirstStop,
            stop_id: pattern.gtfs_arrival_stop_id,
            stop_sequence: "2",
            pickup_type: "1",
            drop_off_type: "0",
          });
        });
      });
    });
  });

  return { tripsData, stopTimesData };
}
