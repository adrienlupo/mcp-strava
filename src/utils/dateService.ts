import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday.js";
import updateLocale from "dayjs/plugin/updateLocale.js";

dayjs.extend(weekday);
dayjs.extend(updateLocale);
dayjs.updateLocale("en", { weekStart: 1 });

export function getWeekRange(weekOffset: number): { after: number; before: number } {
  const targetMonday = dayjs().startOf("week").add(weekOffset, "week");
  return {
    after: targetMonday.unix(),
    before: targetMonday.add(1, "week").unix(),
  };
}

export function isoToUnixTimestamp(isoDate: string | undefined): number | undefined {
  if (!isoDate) return undefined;

  const parsed = dayjs(isoDate);
  if (!parsed.isValid()) {
    throw new Error(`Invalid date format: "${isoDate}". Use ISO format (e.g., "2024-01-01").`);
  }

  return parsed.unix();
}
