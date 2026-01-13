export function getMondayOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const daysToSubtract = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getWeekRange(weekOffset: number): { after: number; before: number } {
  const now = new Date();
  const thisMonday = getMondayOfWeek(now);

  const targetMonday = new Date(thisMonday);
  targetMonday.setDate(targetMonday.getDate() + weekOffset * 7);

  const nextMonday = new Date(targetMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  return {
    after: Math.floor(targetMonday.getTime() / 1000),
    before: Math.floor(nextMonday.getTime() / 1000),
  };
}

export function isoToUnixTimestamp(isoDate: string | undefined): number | undefined {
  if (!isoDate) return undefined;

  const timestamp = Math.floor(new Date(isoDate).getTime() / 1000);

  if (isNaN(timestamp)) {
    throw new Error(`Invalid date format: "${isoDate}". Use ISO format (e.g., "2024-01-01").`);
  }

  return timestamp;
}

export function unixTimestampToIso(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString();
}
