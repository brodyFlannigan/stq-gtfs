import fs from "fs";
import path from "path";

interface ServicePattern {
  route_id: string;
  access_data: { wheelchair_accessible: string; bikes_allowed: string };
  service_patterns: Array<{
    departure_shore: string;
    arrival_shore: string;
    gtfs_trip_headsign: string;
    gtfs_direction_id: string;
    gtfs_departure_stop_id: string;
    gtfs_arrival_stop_id: string;
    travel_minutes: number;
    wheelchair_accessible: string;
    bikes_allowed: string;
  }>;
}

export function loadServicePatterns(): ServicePattern[] {
  const data = fs.readFileSync(
    path.resolve("data/service_patterns.json"),
    "utf-8"
  );
  return JSON.parse(data).routes;
}
