import { CalendarDate } from "./makeTripsStopTimes";
import { parseISO, eachDayOfInterval, format, getDay } from "date-fns";

interface OptimizedCalendar {
  calendar: CalendarEntry[];
  calendarDates: CalendarDate[];
}

interface CalendarEntry {
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
}

const dayOfWeekMap: { [index: number]: keyof CalendarEntry } = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function optimizeCalendar(
  calendarDates: CalendarDate[]
): OptimizedCalendar {
  const serviceDateMap: Map<string, Set<string>> = new Map();

  calendarDates.forEach(({ service_id, date }) => {
    if (!serviceDateMap.has(service_id)) {
      serviceDateMap.set(service_id, new Set());
    }
    serviceDateMap.get(service_id)!.add(date);
  });

  const calendar: CalendarEntry[] = [];
  const optimizedCalendarDates: CalendarDate[] = [];

  serviceDateMap.forEach((dates, service_id) => {
    const sortedDates = Array.from(dates).sort();
    const startDate = parseISO(sortedDates[0]);
    const endDate = parseISO(sortedDates[sortedDates.length - 1]);
    const totalDays = eachDayOfInterval({ start: startDate, end: endDate });
    const dayCounts = new Array(7).fill(0);
    const operationalDays = new Array(7).fill(0);

    totalDays.forEach((day) => {
      const dayIndex = getDay(day);
      dayCounts[dayIndex]++;
      if (dates.has(format(day, "yyyyMMdd"))) {
        operationalDays[dayIndex]++;
      }
    });

    const calendarEntry: CalendarEntry = {
      service_id,
      monday: operationalDays[1] / dayCounts[1] >= 0.5 ? 1 : 0,
      tuesday: operationalDays[2] / dayCounts[2] >= 0.5 ? 1 : 0,
      wednesday: operationalDays[3] / dayCounts[3] >= 0.5 ? 1 : 0,
      thursday: operationalDays[4] / dayCounts[4] >= 0.5 ? 1 : 0,
      friday: operationalDays[5] / dayCounts[5] >= 0.5 ? 1 : 0,
      saturday: operationalDays[6] / dayCounts[6] >= 0.5 ? 1 : 0,
      sunday: operationalDays[0] / dayCounts[0] >= 0.5 ? 1 : 0,
      start_date: format(startDate, "yyyyMMdd"),
      end_date: format(endDate, "yyyyMMdd"),
    };

    calendar.push(calendarEntry);

    totalDays.forEach((day) => {
      const dayIndex = getDay(day);
      const formattedDate = format(day, "yyyyMMdd");
      const weekdayKey = dayOfWeekMap[dayIndex];
      if (calendarEntry[weekdayKey] === 0 && dates.has(formattedDate)) {
        optimizedCalendarDates.push({
          service_id,
          date: formattedDate,
          exception_type: "1",
        });
      } else if (calendarEntry[weekdayKey] === 1 && !dates.has(formattedDate)) {
        optimizedCalendarDates.push({
          service_id,
          date: formattedDate,
          exception_type: "2",
        });
      }
    });
  });
  optimizedCalendarDates.sort(
    (a, b) =>
      a.service_id.localeCompare(b.service_id) || a.date.localeCompare(b.date)
  );
  calendar.sort((a, b) => a.service_id.localeCompare(b.service_id));

  return { calendar, calendarDates: optimizedCalendarDates };
}
