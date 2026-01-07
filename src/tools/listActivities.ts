import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const listActivitiesSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(200)
    .default(30)
    .describe("Maximum number of activities to return (1-200)"),
  before: z
    .number()
    .optional()
    .describe("Return activities before this Unix timestamp"),
  after: z
    .number()
    .optional()
    .describe("Return activities after this Unix timestamp"),
  page: z
    .number()
    .min(1)
    .default(1)
    .describe("Page number for pagination"),
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

  return [{ type: "text", text: JSON.stringify(activities, null, 2) }];
}
