import { readJsonAndWriteGtfs } from "./readJsonWriteGtfs";
import fetchSchedules from './fetchSchedules';
import makeCalendarDates from "./makeCalendarDates";
import { createTrips } from "./makeTrips";
import writeGtfsFile from './gtfsWriter';
import { loadServicePatterns } from "./loadServicePatterns";

// First, create the files that don't require the API: agency, routes, attributions, stops
readJsonAndWriteGtfs("data/static/agency.json", "data/gtfs/agency.txt", "agency_id");
readJsonAndWriteGtfs("data/static/routes.json", "data/gtfs/routes.txt","route_id");
readJsonAndWriteGtfs("data/static/attributions.json", "data/gtfs/attributions.txt","attribution_id");
readJsonAndWriteGtfs("data/static/stops.json", "data/gtfs/stops.txt","stop_id");

async function runScheduleProcessor() {
    const schedules = await fetchSchedules();
    const calendarDates = makeCalendarDates(schedules);
    const servicePatterns = loadServicePatterns()
    const trips = createTrips(schedules,servicePatterns)

    writeGtfsFile('data/gtfs/calendar_dates.txt', ['service_id', 'date', 'exception_type'], calendarDates);
    writeGtfsFile('data/gtfs/trips.txt', ['route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id', 'wheelchair_accessible', 'bikes_allowed'], trips);


}

runScheduleProcessor()
