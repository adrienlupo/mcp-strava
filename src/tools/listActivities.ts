import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import { isoToUnixTimestamp, getWeekRange } from "src/utils/dateService.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const listActivitiesSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(200)
    .default(10)
    .describe(
      "Maximum number of activities to return (1-200, default: 10). " +
        "For 'recent' or 'last N' queries, set this limit without date filters. " +
        "Ignored when week_offset is set or both before/after are provided (fetches all in range)."
    ),
  week_offset: z
    .number()
    .int()
    .optional()
    .describe(
      "Get activities from a specific calendar week (Monday-Sunday). " +
        "0 = this week, -1 = last week, -2 = two weeks ago, etc. " +
        "PREFERRED for week-based queries. When set, 'before' and 'after' are ignored."
    ),
  before: z
    .string()
    .optional()
    .describe(
      "ISO date string (e.g., '2024-12-31'). Activities before this date (exclusive). " +
        "Ignored if week_offset is set. Use for custom date ranges only."
    ),
  after: z
    .string()
    .optional()
    .describe(
      "ISO date string (e.g., '2024-01-01'). Activities after this date. " +
        "Ignored if week_offset is set. Use for custom date ranges only."
    ),
  page: z
    .number()
    .min(1)
    .default(1)
    .describe(
      "Page number for pagination (default: 1). " +
        "Use to access older activities beyond the limit. " +
        "Example: limit=10, page=2 returns activities 11-20."
    ),
});

export async function listActivities(
  client: StravaClient,
  input: z.infer<typeof listActivitiesSchema>
): Promise<TextContent[]> {
  let before: number | undefined;
  let after: number | undefined;
  let perPage = input.limit;

  if (input.week_offset !== undefined) {
    const weekRange = getWeekRange(input.week_offset);
    after = weekRange.after;
    before = weekRange.before;
    perPage = 200; // Fetch all activities in the date range
  } else {
    before = isoToUnixTimestamp(input.before);
    after = isoToUnixTimestamp(input.after);
    // When both before and after are set, fetch all in range
    if (before !== undefined && after !== undefined) {
      perPage = 200;
    }
  }

  const activities = await client.listActivities({
    per_page: perPage,
    before,
    after,
    page: input.page,
  });

  // Remove heavy/unnecessary data for token efficiency
  const strippedActivities = activities.map((activity) => {
    const { map, external_id, upload_id, ...rest } = activity;
    return rest;
  });

  return [{ type: "text", text: JSON.stringify(strippedActivities) }];
}
