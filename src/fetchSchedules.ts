import axios from "axios";
import fs from "fs";
import path from "path";
import { addDays, format, startOfMonth, endOfMonth } from "date-fns";

async function fetchSchedules() {
  const config = JSON.parse(
    fs.readFileSync(path.resolve("data/config.json"), "utf-8")
  );
  const routes = JSON.parse(
    fs.readFileSync(path.resolve("data/static/routes.json"), "utf-8")
  ).data;

  const today = new Date();
  let startDate = addDays(today, config.earliest_day);
  let endDate = addDays(today, config.latest_day);

  // Adjusting dates to cover full months if required
  if (config.get_full_months !== false) { // Default behavior is to get full months unless explicitly set to false
    startDate = startOfMonth(startDate);
    endDate = endOfMonth(endDate);
  }

  const delayBetweenRequests = config.delay_between_requests;
  let currentDate = startDate;

  const scheduleData = [];

  while (currentDate <= endDate) {
    const formattedDate = format(currentDate, "yyyy-MM-dd");

    for (const route of routes) {
      const url = `https://donnees.traversiers.com/horaires/${route.route_id}/${formattedDate}`;
      try {
        const response = await axios.get(url);
        console.log(`Fetching data for ${formattedDate} on ${route.route_id}`);
        scheduleData.push({
          date: formattedDate,
          route: route.route_id,
          data: response.data,
        });
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenRequests)
        );
      } catch (error) {
        console.error(
          `Error fetching data for ${route.route_id} on ${formattedDate}: ${error}`
        );
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return scheduleData;
}

export default fetchSchedules;
