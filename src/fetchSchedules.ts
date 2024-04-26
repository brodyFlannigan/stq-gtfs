import axios from "axios";
import fs from "fs";
import path from "path";
import { addDays, format } from "date-fns";

async function fetchSchedules() {
  const config = JSON.parse(
    fs.readFileSync(path.resolve("data/config.json"), "utf-8")
  );
  const routes = JSON.parse(
    fs.readFileSync(path.resolve("data/static/routes.json"), "utf-8")
  ).data;

  const today = new Date();
  const startDate = addDays(today, config.earliest_day);
  const endDate = addDays(today, config.latest_day);
  let currentDate = startDate;

  const scheduleData = [];

  while (currentDate <= endDate) {
    const formattedDate = format(currentDate, "yyyy-MM-dd");

    for (const route of routes) {
      const url = `https://donnees.traversiers.com/horaires/${route.route_id}/${formattedDate}`;
      try {
        const response = await axios.get(url);
        console.log(`Fetching data for ${formattedDate} on ${route.route_id}`)
        scheduleData.push({
          date: formattedDate,
          route: route.route_id,
          data: response.data,
        });
        await new Promise((resolve) => setTimeout(resolve, 0)); // Change the 0 here to something like 1000 to set a delay (in ms) between requests.
      } catch (error) {
        console.error(
          `Error fetching data for ${route.route_id} on ${formattedDate}: ${error}`
        );
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return  scheduleData ;
}

export default fetchSchedules;
