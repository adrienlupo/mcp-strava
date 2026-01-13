import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import { isoToUnixTimestamp } from "src/services/dateService.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const listActivitiesSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe(
      "Maximum number of activities to return (1-50, default: 10). " +
        "For 'recent' or 'last N' queries, just set this limit without date filters. " +
        "Examples: limit=5 for 'my last 5 runs', limit=20 for 'recent activities'."
    ),
  before: z
    .string()
    .optional()
    .describe(
      "ISO date string for activities before this date (e.g., '2024-12-31'). " +
        "Use with 'after' for date ranges. For 'last week', set to the Monday after (end of Sunday). " +
        "Omit for most recent activities."
    ),
  after: z
    .string()
    .optional()
    .describe(
      "ISO date string for activities after this date (e.g., '2024-01-01'). " +
        "For 'last week', use previous Monday. Week = Monday to Sunday (calendar week). " +
        "Omit for 'recent' or 'last N' queries - just use limit instead."
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
  const activities = await client.listActivities({
    per_page: input.limit,
    before: isoToUnixTimestamp(input.before),
    after: isoToUnixTimestamp(input.after),
    page: input.page,
  });

  // Remove heavy/unnecessary data for token efficiency
  const strippedActivities = activities.map((activity) => {
    const { map, external_id, upload_id, ...rest } = activity;
    return rest;
  });

  return [{ type: "text", text: JSON.stringify(strippedActivities) }];
}
