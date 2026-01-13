/**
 * Date conversion utilities for Strava API.
 * Strava API requires Unix timestamps for date filtering parameters.
 * Calendar weeks are Monday to Sunday.
 */

/**
 * Get the Monday 00:00:00 of the week containing the given date.
 * Week starts on Monday (ISO 8601 standard).
 *
 * @param date - The reference date
 * @returns Date object set to Monday 00:00:00 of that week
 */
export function getMondayOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  // Sunday (0) -> go back 6 days, Monday (1) -> 0 days, Tuesday (2) -> 1 day, etc.
  const daysToSubtract = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get Unix timestamps for a calendar week relative to current week.
 * Weeks are Monday 00:00:00 to Sunday 23:59:59 (Monday to Monday exclusive).
 *
 * @param weekOffset - 0 = this week, -1 = last week, -2 = two weeks ago, etc.
 * @returns Object with 'after' (Monday start) and 'before' (next Monday) timestamps
 *
 * @example
 * // If today is Tuesday 2025-01-14:
 * getWeekRange(0)  // this week: Mon Jan 13 to Sun Jan 19
 * getWeekRange(-1) // last week: Mon Jan 6 to Sun Jan 12
 * getWeekRange(-2) // 2 weeks ago: Mon Dec 30 to Sun Jan 5
 */
export function getWeekRange(weekOffset: number): { after: number; before: number } {
  const now = new Date();
  const thisMonday = getMondayOfWeek(now);

  // Calculate target week's Monday
  const targetMonday = new Date(thisMonday);
  targetMonday.setDate(targetMonday.getDate() + weekOffset * 7);

  // Calculate the Monday after (exclusive end boundary)
  const nextMonday = new Date(targetMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  return {
    after: Math.floor(targetMonday.getTime() / 1000),
    before: Math.floor(nextMonday.getTime() / 1000),
  };
}

/**
 * Convert ISO date string to Unix timestamp (seconds since epoch).
 *
 * @param isoDate - ISO date string (e.g., "2024-01-01" or "2024-01-01T00:00:00Z")
 * @returns Unix timestamp in seconds, or undefined if input is undefined
 * @throws Error if date string is invalid
 */
export function isoToUnixTimestamp(
  isoDate: string | undefined
): number | undefined {
  if (!isoDate) return undefined;

  const timestamp = Math.floor(new Date(isoDate).getTime() / 1000);

  if (isNaN(timestamp)) {
    throw new Error(
      `Invalid date format: "${isoDate}". Use ISO format (e.g., "2024-01-01").`
    );
  }

  return timestamp;
}

/**
 * Convert Unix timestamp to ISO date string.
 * Useful for displaying dates from Strava API responses.
 *
 * @param unixTimestamp - Unix timestamp in seconds
 * @returns ISO date string
 */
export function unixTimestampToIso(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString();
}
