import { readJsonAndWriteGtfs } from "./readJsonWriteGtfs";
import fetchSchedules from "./fetchSchedules";
import writeGtfsFile from "./gtfsWriter";
import { loadServicePatterns } from "./loadServicePatterns";
import { createTripsAndStopTimes } from "./makeTripsStopTimes";
import { createFeedInfo } from "./makeFeedInfo";
import { zipGtfsFiles } from "./compileZipFiles";

// First, create the files that don't require the API: agency, routes, attributions, stops
readJsonAndWriteGtfs(
  "data/static/agency.json",
  "data/gtfs/agency.txt",
  "agency_id"
);
readJsonAndWriteGtfs(
  "data/static/routes.json",
  "data/gtfs/routes.txt",
  "route_id"
);
readJsonAndWriteGtfs(
  "data/static/attributions.json",
  "data/gtfs/attributions.txt",
  "attribution_id"
);
readJsonAndWriteGtfs(
  "data/static/stops.json",
  "data/gtfs/stops.txt",
  "stop_id"
);

async function runScheduleProcessor() {
  const schedules = await fetchSchedules();
  const servicePatterns = loadServicePatterns();
  const TripsAndStopTimes = createTripsAndStopTimes(schedules, servicePatterns);
  const feedInfo = createFeedInfo();

  writeGtfsFile(
    "data/gtfs/calendar_dates.txt",
    ["service_id", "date", "exception_type"],
    TripsAndStopTimes.calendarDates
  );
  writeGtfsFile(
    "data/gtfs/trips.txt",
    [
      "route_id",
      "service_id",
      "trip_id",
      "trip_headsign",
      "direction_id",
      "wheelchair_accessible",
      "bikes_allowed",
    ],
    TripsAndStopTimes.tripsData
  );
  writeGtfsFile(
    "data/gtfs/stop_times.txt",
    [
      "trip_id",
      "arrival_time",
      "departure_time",
      "stop_id",
      "stop_sequence",
      "pickup_type",
      "drop_off_type",
      "timepoint",
    ],
    TripsAndStopTimes.stopTimesData
  );
  writeGtfsFile(
    "data/gtfs/feed_info.txt",
    [
      "feed_publisher_name",
      "feed_publisher_url",
      "feed_lang",
      "default_lang",
      "feed_start_date",
      "feed_end_date",
      "feed_version",
      "feed_contact_url",
    ],
    await feedInfo
  );
  zipGtfsFiles("data/gtfs/", "stq-qc-ca.gtfs.zip");
}

runScheduleProcessor();
