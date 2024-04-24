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

export function createTrips(
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

  scheduleData.forEach(({ route, data }) => {
    const patterns = servicePatterns.find(
      (pattern) => pattern.route_id === route
    );


    if (!patterns) {
      throw new Error(`No service patterns found for route_id: ${route}`);
    }

    data.trajet.forEach(
      (trajet: { rive_depart: string; rive_arrivee: string; jour: any[] }) => {
        const pattern = patterns.service_patterns.find(
          (p) =>
            p.departure_shore === trajet.rive_depart &&
            p.arrival_shore === trajet.rive_arrivee
        );

        if (!pattern) {
          throw new Error(
            `No matching service pattern for departure: ${trajet.rive_depart} and arrival: ${trajet.rive_arrivee}`
          );
        }

        // Check if `jour` array exists and has content
        if (trajet.jour && trajet.jour.length > 0) {
          trajet.jour.forEach((jour) => {
            // Check if `depart` array exists and has content
            if (jour.depart && jour.depart.length > 0) {
              jour.depart.forEach((depart: { heure: string }) => {
                const serviceId = jour.date;
                const tripId = `${route}_${serviceId}_${
                  pattern.gtfs_departure_stop_id
                }_${pattern.gtfs_arrival_stop_id}_${depart.heure.replace(
                  /:/g,
                  ""
                )}`;
                tripsData.push({
                  route_id: route,
                  service_id: serviceId,
                  trip_id: tripId,
                  trip_headsign: pattern.gtfs_trip_headsign,
                  direction_id: pattern.gtfs_direction_id,
                  wheelchair_accessible:
                    patterns.access_data.wheelchair_accessible,
                  bikes_allowed: patterns.access_data.bikes_allowed,
                });
              });
            }
          });
        }
      }
    );
  });

  return tripsData;
}
