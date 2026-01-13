import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday.js";
import updateLocale from "dayjs/plugin/updateLocale.js";

dayjs.extend(weekday);
dayjs.extend(updateLocale);
dayjs.updateLocale("en", { weekStart: 1 });

export function getWeekRange(weekOffset: number): { from: string; to: string } {
  const monday = dayjs().startOf("week").add(weekOffset, "week");
  const sunday = monday.add(6, "day");
  return {
    from: monday.format("YYYY-MM-DD"),
    to: sunday.format("YYYY-MM-DD"),
  };
}

export function isoToUnixTimestamp(isoDate: string, endOfDay = false): number {
  const parsed = dayjs(isoDate);
  if (!parsed.isValid()) {
    throw new Error(`Invalid date format: "${isoDate}". Use ISO format (e.g., "2024-01-01").`);
  }
  return endOfDay ? parsed.add(1, "day").unix() : parsed.unix();
}
