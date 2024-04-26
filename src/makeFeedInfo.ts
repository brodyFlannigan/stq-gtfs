import axios from "axios";
import fs from "fs";
import path from "path";
import { addDays, format, formatRFC3339 } from "date-fns";

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
  const startDate = addDays(today, config.earliest_day);
  const endDate = addDays(today, config.latest_day);

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
    feed_contact_url: "https://github.com/brodyFlannigan/stq-gtfs-v2/issues",
  });
  return feedInfo;
}

export default createFeedInfo;
