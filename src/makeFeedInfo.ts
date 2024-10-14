import axios from "axios";
import fs from "fs";
import path from "path";
import {
  addDays,
  format,
  formatRFC3339,
  startOfMonth,
  endOfMonth,
} from "date-fns";

const feedInfo: {
  feed_publisher_name: string;
  feed_publisher_url: string;
  feed_lang: string;
  default_lang: string;
  feed_start_date: string;
  feed_end_date: string;
  feed_version: string;
  feed_contact_url: string;
}[] = [];

export async function createFeedInfo() {
  const config = JSON.parse(
    fs.readFileSync(path.resolve("data/config.json"), "utf-8")
  );

  const today = new Date();
  let startDate = addDays(today, config.earliest_day);
  let endDate = addDays(today, config.latest_day);

  // Adjusting dates to cover full months if required
  if (config.get_full_months !== false) {
    // Default behavior is to get full months unless explicitly set to false
    startDate = startOfMonth(startDate);
    endDate = endOfMonth(endDate);
  }

  const scheduleData = [];

  const formattedStartDate = format(startDate, "yyyyMMdd");
  const formattedEndDate = format(endDate, "yyyyMMdd");

  feedInfo.push({
    feed_publisher_name: "Brody Flannigan Transit Data",
    feed_publisher_url: "https://transitdata.ca/",
    feed_lang: "fr",
    default_lang: "fr",
    feed_start_date: formattedStartDate,
    feed_end_date: formattedEndDate,
    feed_version: formatRFC3339(Date.now()),
    feed_contact_url: "https://github.com/brodyFlannigan/stq-gtfs/issues",
  });
  return feedInfo;
}

export default createFeedInfo;
