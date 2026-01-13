import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import { getWeekRange, isoToUnixTimestamp } from "src/utils/dateService.js";
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
  let fromIso: string | undefined;
  let toIso: string | undefined;
  let perPage = input.limit;

  if (input.week_offset !== undefined) {
    const range = getWeekRange(input.week_offset);
    fromIso = range.from;
    toIso = range.to;
    perPage = 200;
  } else {
    fromIso = input.after;
    toIso = input.before;
    if (fromIso && toIso) {
      perPage = 200;
    }
  }

  const activities = await client.listActivities({
    per_page: perPage,
    after: fromIso ? isoToUnixTimestamp(fromIso) : undefined,
    before: toIso ? isoToUnixTimestamp(toIso, true) : undefined,
    page: input.page,
  });

  const strippedActivities = activities.map((activity) => {
    const { map, external_id, upload_id, ...rest } = activity;
    return rest;
  });

  const response: {
    queried_range?: { from: string; to: string };
    activities: typeof strippedActivities;
  } = { activities: strippedActivities };

  if (fromIso && toIso) {
    response.queried_range = { from: fromIso, to: toIso };
  }

  return [{ type: "text", text: JSON.stringify(response) }];
}
