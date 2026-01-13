/**
 * Date conversion utilities for Strava API.
 * Strava API requires Unix timestamps for date filtering parameters.
 */

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
