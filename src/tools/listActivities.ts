import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const listActivitiesSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe(
      "Maximum number of activities to return (1-30). Strava API limits to 200 per request but limited to 50 for token efficiency."
    ),
  before: z
    .number()
    .optional()
    .describe("Return activities before this Unix timestamp"),
  after: z
    .number()
    .optional()
    .describe(
      "Return activities after this Unix timestamp. Defaults to 3 months ago if neither before nor after are specified (token efficiency measure). Override by providing explicit timestamp."
    ),
  page: z
    .number()
    .min(1)
    .default(1)
    .describe(
      "Page number for pagination (use this to access older data beyond 30 activities)"
    ),
});

export async function listActivities(
  client: StravaClient,
  input: z.infer<typeof listActivitiesSchema>
): Promise<TextContent[]> {
  const activities = await client.listActivities({
    per_page: input.limit,
    before: input.before,
    after: input.after,
    page: input.page,
  });

  // Remove heavy/unnecessary data for token efficiency
  const strippedActivities = activities.map((activity) => {
    const { map, external_id, upload_id, ...rest } = activity;
    return rest;
  });

  return [{ type: "text", text: JSON.stringify(strippedActivities) }];
}
