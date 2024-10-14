import fs from "fs";
import path from "path";
import {
  parseISO,
  format as formatDate,
  getHours,
  differenceInDays,
  format,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

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
    wheelchair_accessible: string;
    bikes_allowed: string;
  }>;
}

interface StopInfo {
  stop_id: string;
  stop_timezone: string;
}

interface TripData {
  [key: string]: string | number;
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign: string;
  direction_id: string;
  wheelchair_accessible: string;
  bikes_allowed: string;
}

interface StopTimeData {
  [key: string]: string | number;
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: string;
  pickup_type: string;
  drop_off_type: string;
  timepoint: string;
}

export interface CalendarDate {
  [key: string]: string | number;
  service_id: string;
  date: string;
  exception_type: "1" | "2";
}

const stopsFilePath = path.resolve("data/static/stops.json");
const stopsFileContent = fs.readFileSync(stopsFilePath, "utf-8");
const stopsJson = JSON.parse(stopsFileContent);
const stopData: StopInfo[] = stopsJson.data;

function getAdjustedTime(
  time: string,
  tripDate: string,
  serviceDate: string,
  stopId: string
): string {
  const stopInfo = stopData.find((stop) => stop.stop_id === stopId);
  const localTimeZone = stopInfo ? stopInfo.stop_timezone : "America/Montreal";
  const targetTimeZone = "America/Toronto";

  const localTripDateTime = `${tripDate}T${time}`;
  const utcTripDateTime = fromZonedTime(localTripDateTime, localTimeZone);
  const localServiceDateTime = `${serviceDate}T04:00:00`;
  const utcServiceDateTime = fromZonedTime(localServiceDateTime, localTimeZone);
  const normalizedTripDateTime = toZonedTime(utcTripDateTime, targetTimeZone);
  const normalizedServiceDateTime = toZonedTime(
    utcServiceDateTime,
    targetTimeZone
  );

  const serviceTripDateDifference = differenceInDays(
    normalizedTripDateTime,
    normalizedServiceDateTime
  );

  const adjustedTripHours = getHours(normalizedTripDateTime);
  const adjustmentToTripHours = 0;
  if (tripDate != serviceDate) {
    let adjustedTripHours = +getHours(normalizedTripDateTime) + 24;
    function getAdjustedTripHours() {
      return adjustedTripHours.toString(10);
    }
    const adjustedGtfsTripTime = `${getAdjustedTripHours()}:${format(
      normalizedTripDateTime,
      "mm:ss"
    )}`;
    return adjustedGtfsTripTime;
  }
  const gtfsTripTime = `${adjustedTripHours
    .toString(10)
    .padStart(2, "0")}:${format(normalizedTripDateTime, "mm:ss")}`;

  return gtfsTripTime;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  let [hours, minutes, seconds] = time.split(":").map(Number);
  minutes += minutesToAdd;
  hours += Math.floor(minutes / 60);
  minutes %= 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function createTripsAndStopTimes(
  scheduleData: any[],
  servicePatterns: ServicePattern[]
) {
  const tripsData: TripData[] = [];
  const stopTimesData: StopTimeData[] = [];
  const calendarDates: CalendarDate[] = [];
  const dateServiceMap = new Map<string, string>();
  const tripDateMap = new Map<string, Set<string>>();
  const calendarDateSet = new Set<string>();
  let serviceIdCounter = 1;

  scheduleData.forEach(({ route, data }) => {
    const patterns = servicePatterns.find(
      (pattern) => pattern.route_id === route
    );
    if (!patterns) {
      console.error(`No service patterns found for route_id: ${route}`);
      return; // Skip processing this route if no patterns are found
    }

    data.trajet.forEach((trajet: any) => {
      const pattern = patterns.service_patterns.find(
        (p) =>
          p.departure_shore === trajet.rive_depart &&
          p.arrival_shore === trajet.rive_arrivee
      );

      if (!pattern) {
        console.error(`No matching service pattern found for route_id: ${route} on ${trajet.rive_depart} to ${trajet.rive_arrivee}`);
        return; // Skip processing this trajet if no matching pattern is found
      }

      if (!trajet.jour || trajet.jour.length === 0) {
        console.log(`Skipping day with no service for route_id: ${route} from ${trajet.rive_depart} to ${trajet.rive_arrivee}`);
        return; // Skip processing this trajet if 'jour' is empty
      }

      trajet.jour.forEach(
        (jour: { depart: { heure: string; date: string }[]; date: string }) => {
          if (!jour.depart || jour.depart.length === 0) {
            // console.log(`No departures found for route_id: ${route} on date ${jour.date}`);
            return; // Skip processing this jour if 'depart' is empty
          }

          jour.depart.forEach((depart: { heure: string; date: string }) => {
            const yearMonth = format(parseISO(jour.date), "yyyyMM");
            const serviceId = `${yearMonth}_${jour.date}`;
            const departureTime = getAdjustedTime(
              depart.heure,
              depart.date,
              jour.date,
              pattern.gtfs_departure_stop_id
            );
            const tripId = `${yearMonth}_${route}_${pattern.gtfs_departure_stop_id}_${
              pattern.gtfs_arrival_stop_id
            }_${departureTime.replace(/:/g, "")}`;

            const arrivalTimeAtFirstStop = departureTime;
            // the_tripId, serviceId, and all relevant references should include the month and year prefix as demonstrated to ensure unique identification per month. This change allows each month to handle its trips independently, facilitating easier management and debugging.

            const travelMinutes = pattern.travel_minutes;
            const arrivalTimeAtSecondStop = addMinutesToTime(
              arrivalTimeAtFirstStop,
              travelMinutes
            );

            if (!tripDateMap.has(tripId)) {
              tripsData.push({
                route_id: route,
                service_id: "", // Will be updated
                trip_id: tripId,
                trip_headsign: pattern.gtfs_trip_headsign,
                direction_id: pattern.gtfs_direction_id,
                wheelchair_accessible: pattern.wheelchair_accessible,
                bikes_allowed: pattern.bikes_allowed,
              });
              stopTimesData.push({
                trip_id: tripId,
                arrival_time: arrivalTimeAtFirstStop,
                departure_time: arrivalTimeAtFirstStop,
                stop_id: pattern.gtfs_departure_stop_id,
                stop_sequence: "1",
                pickup_type: "0",
                drop_off_type: "1",
                timepoint: "1",
              });
              stopTimesData.push({
                trip_id: tripId,
                arrival_time: arrivalTimeAtSecondStop,
                departure_time: arrivalTimeAtSecondStop,
                stop_id: pattern.gtfs_arrival_stop_id,
                stop_sequence: "2",
                pickup_type: "1",
                drop_off_type: "0",
                timepoint: "1",
              });
              tripDateMap.set(tripId, new Set());
            }
            const tripDates = tripDateMap.get(tripId);
            if (tripDates) {
              tripDates.add(jour.date);
            }
          });
        }
      );
    });
  });

  // Assigning service IDs based on unique sets of dates
  tripDateMap.forEach((dates, tripId) => {
    const sortedDates = Array.from(dates).sort().join(",");
    console.log(sortedDates.toString())
    if (!dateServiceMap.has(sortedDates)) {
      dateServiceMap.set(sortedDates, `service_${serviceIdCounter++}`);
    }
    const serviceId = dateServiceMap.get(sortedDates) ?? "";
    const foundTrip = tripsData.find((trip) => trip.trip_id === tripId);
    if (foundTrip) {
      foundTrip.service_id = serviceId;
    }

    dates.forEach((date) => {
      const calendarKey = `${serviceId}_${date.replace(/-/g, "")}`;
      if (!calendarDateSet.has(calendarKey)) {
        calendarDateSet.add(calendarKey);
        calendarDates.push({
          service_id: serviceId,
          date: date.replace(/-/g, ""),
          exception_type: "1",
        });
      }
    });
  });
  return { tripsData, stopTimesData, calendarDates };
}
