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
import crc32 from "crc/crc32";

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
  cars_allowed: string; // ✅ New field
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
  pickup_booking_rule_id: string; // ✅ New field
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

  const adjustedTripHours =
    getHours(normalizedTripDateTime) + (tripDate != serviceDate ? 24 : 0);
  return `${adjustedTripHours.toString().padStart(2, "0")}:${format(
    normalizedTripDateTime,
    "mm:ss"
  )}`;
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

  scheduleData.forEach(({ route, data }) => {
    const patterns = servicePatterns.find(
      (pattern) => pattern.route_id === route
    );
    if (!patterns) {
      console.error(`No service patterns found for route_id: ${route}`);
      return;
    }

    data.trajet.forEach((trajet: any) => {
      const pattern = patterns.service_patterns.find(
        (p) =>
          p.departure_shore === trajet.rive_depart &&
          p.arrival_shore === trajet.rive_arrivee
      );

      if (!pattern) {
        console.error(
          `No matching service pattern found for route_id: ${route} on ${trajet.rive_depart} to ${trajet.rive_arrivee}`
        );
        return;
      }

      if (!trajet.jour || trajet.jour.length === 0) {
        console.log(
          `Skipping day with no service for route_id: ${route} from ${trajet.rive_depart} to ${trajet.rive_arrivee}`
        );
        return;
      }

      trajet.jour.forEach(
        (jour: {
          depart: { heure: string; date: string; type: string }[];
          date: string;
        }) => {
          if (!jour.depart || jour.depart.length === 0) {
            return;
          }

          jour.depart.forEach(
            (depart: { heure: string; date: string; type: string }) => {
              const yearMonth = format(parseISO(jour.date), "yyyyMM");
              const departureTime = getAdjustedTime(
                depart.heure,
                depart.date,
                jour.date,
                pattern.gtfs_departure_stop_id
              );

              // ✅ trip_id now includes depart.type
              const tripId = `${yearMonth}_${route}_${
                pattern.gtfs_departure_stop_id
              }_${pattern.gtfs_arrival_stop_id}_${departureTime.replace(
                /:/g,
                ""
              )}_${depart.type}`;

              // ✅ cars_allowed logic
              const carsAllowed = [
                "regular",
                "required-reservation",
                "notice_tide",
              ].includes(depart.type)
                ? "1"
                : "2";

              // ✅ bikes_allowed logic
              const bikesAllowed = [
                "foot-only",
                "air-transport",
                "dangerous-cargo",
              ].includes(depart.type)
                ? "2"
                : "1";

              const arrivalTimeAtFirstStop = departureTime;
              const travelMinutes = pattern.travel_minutes;
              const arrivalTimeAtSecondStop = addMinutesToTime(
                arrivalTimeAtFirstStop,
                travelMinutes
              );

              if (!tripDateMap.has(tripId)) {
                tripsData.push({
                  route_id: route,
                  service_id: "",
                  trip_id: tripId,
                  trip_headsign: pattern.gtfs_trip_headsign,
                  direction_id: pattern.gtfs_direction_id,
                  wheelchair_accessible: pattern.wheelchair_accessible,
                  bikes_allowed: bikesAllowed,
                  cars_allowed: carsAllowed,
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
                  pickup_booking_rule_id: "", // ✅ Added column
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
                  pickup_booking_rule_id: "", // ✅ Added column
                });

                tripDateMap.set(tripId, new Set());
              }
              const tripDates = tripDateMap.get(tripId);
              if (tripDates) {
                tripDates.add(jour.date);
              }
            }
          );
        }
      );
    });
  });

  tripsData.sort((a, b) => a.trip_id.localeCompare(b.trip_id));
  stopTimesData.sort(
    (a, b) =>
      a.trip_id.localeCompare(b.trip_id) ||
      a.stop_sequence.localeCompare(b.stop_sequence)
  );
  calendarDates.sort(
    (a, b) =>
      a.service_id.localeCompare(b.service_id) || a.date.localeCompare(b.date)
  );

  // Assigning service IDs based on unique sets of dates
  tripDateMap.forEach((dates, tripId) => {
    const sortedDates = Array.from(dates).sort().join(",");
    const serviceDateHash = crc32(sortedDates).toString(16);
    if (!dateServiceMap.has(sortedDates)) {
      dateServiceMap.set(sortedDates, `service_${serviceDateHash}`);
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
