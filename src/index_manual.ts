import { readJsonAndWriteGtfs } from "./readJsonWriteGtfs";
import fetchSchedules from "./fetchSchedules";
import makeCalendarDates from "./makeCalendarDates";
import { createTrips } from "./makeTrips";
import writeGtfsFile from "./gtfsWriter";
import { loadServicePatterns } from "./loadServicePatterns";
import { createTripsAndStopTimes } from "./makeTripsStopTimes";

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
  const schedules = [{"date": "2024-04-24",
  "route": "ile-d-entree-cap-aux-meules",
  "data": {
    "journee_locale": "2024-04-24",
    "heure_locale": "09:20:32",
    "jour_demande": "2024-04-24",
    "type": {
      "regular": "D\u00e9part R\u00e9gulier",
      "commercial-only": "V\u00e9hicules lourds interdits",
      "delivery-period": "P\u00e9riode de livraison",
      "dangerous-cargo": "Marchandises dangereuses. Capacit\u00e9 du navire r\u00e9duite \u00e0 16 passagers.",
      "air-transport": "Transport par avion seulement. Tarifs applicables. <br>R\u00e9servation requise aupr\u00e8s de Air Montmagny au <span style=\"white-space: nowrap;\">418 248-3545</span>.",
      "required-reservation": "Ces travers\u00e9es auront lieu seulement si une r\u00e9servation a \u00e9t\u00e9 effectu\u00e9e 24 heures \u00e0 l\u2019avance, pour au moins un v\u00e9hicule ou trois passagers",
      "notice-tide": "Travers\u00e9es sujet \u00e0 pr\u00e9avis selon la mar\u00e9e.",
      "foot-only": "Travers\u00e9e pi\u00e9tons seulement",
      "pedestrians-and-cyclists-only": "Travers\u00e9e pi\u00e9tons et cyclistes seulement"
    },
    "trajet": [
      {
        "rive_depart": "Ile d'Entrée",
        "rive_arrivee": "Cap-aux-Meules",
        "jour": [
          {
            "date": "2024-04-24",
            "depart": [
              {
                "type": "regular",
                "heure": "14:15:00",
                "date": "2024-04-24",
                "is_past": false
              },
              {
                "type": "regular",
                "heure": "01:45:00",
                "date": "2024-04-25",
                "is_past": false
              }
            ]
          }
        ]
      },
      {
        "rive_depart": "Cap-aux-Meules",
        "rive_arrivee": "Ile d'Entrée",
        "jour": [
          {
            "date": "2024-04-24",
            "depart": [
              {
                "type": "regular",
                "heure": "15:00:00",
                "date": "2024-04-24",
                "is_past": false
              },
              {
                "type": "regular",
                "heure": "23:55:00",
                "date": "2024-04-24",
                "is_past": false
              }
            ]
          }
        ]
      }
    ]
  }
  }]
  const calendarDates = makeCalendarDates(schedules);
  const servicePatterns = loadServicePatterns();
  // const trips = createTrips(schedules,servicePatterns)
  const TripsAndStopTimes = createTripsAndStopTimes(schedules, servicePatterns);

  writeGtfsFile(
    "data/gtfs/calendar_dates.txt",
    ["service_id", "date", "exception_type"],
    calendarDates
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
    ],
    TripsAndStopTimes.stopTimesData
  );
}

runScheduleProcessor();
