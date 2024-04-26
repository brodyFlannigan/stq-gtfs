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
    const gtfsTripTime = `${adjustedTripHours.toString(10).padStart(2, '0')}:${format(normalizedTripDateTime, "mm:ss")}`

 return gtfsTripTime
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
    let [hours, minutes, seconds] = time.split(":").map(Number);
    minutes += minutesToAdd;
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;
  
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    const existingTripIds = new Set();

  
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
            const serviceId = jour.date
            const departureTime = getAdjustedTime(depart.heure, depart.date, jour.date, pattern.gtfs_departure_stop_id);
            const tripId = `${route}_${serviceId}_${
              pattern.gtfs_departure_stop_id
            }_${pattern.gtfs_arrival_stop_id}_${departureTime.replace(/:/g, "")}`;

          if (existingTripIds.has(tripId)) {
            console.log(`Duplicate trip_id found: ${tripId}, skipping.`);
            return;
          }
          existingTripIds.add(tripId);
            const arrivalTimeAtFirstStop = departureTime;
            const travelMinutes = pattern.travel_minutes;
            const arrivalTimeAtSecondStop = addMinutesToTime(arrivalTimeAtFirstStop, travelMinutes);
  
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
            });
            stopTimesData.push({
              trip_id: tripId,
              arrival_time: arrivalTimeAtSecondStop,
              departure_time: arrivalTimeAtSecondStop,
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
  