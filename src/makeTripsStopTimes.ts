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

interface CalendarDate {
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
  const dateServiceMap = new Map<string, string>(); // Maps sorted date strings to service IDs
  const tripDateMap = new Map<string, Set<string>>(); // Maps tripId to set of dates
  const calendarDateSet = new Set<string>(); // Prevents duplicate calendar date entries
  let serviceIdCounter = 1;

  scheduleData.forEach(({ route, data }) => {
    const patterns = servicePatterns.find(
      (pattern) => pattern.route_id === route
    );
    if (!patterns) {
      throw new Error(`No service patterns found for route_id: ${route}`);
    }

    data.trajet.forEach((trajet: any, jour: any) => {
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

      trajet.jour.forEach(
        (jour: { depart: { heure: string; date: string }[]; date: string }) => {
          jour.depart.forEach((depart: { heure: string; date: string }) => {
            const serviceId = jour.date;
            const departureTime = getAdjustedTime(
              depart.heure,
              depart.date,
              jour.date,
              pattern.gtfs_departure_stop_id
            );
            const tripId = `${route}_${pattern.gtfs_departure_stop_id}_${
              pattern.gtfs_arrival_stop_id
            }_${departureTime.replace(/:/g, "")}`;

            const arrivalTimeAtFirstStop = departureTime;
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
              tripDates.add(depart.date);
            }
          });
        }
      );
    });
  });

  // Assigning service IDs based on unique sets of dates
  tripDateMap.forEach((dates, tripId) => {
    const sortedDates = Array.from(dates).sort().join(",");
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
