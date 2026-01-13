import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const getActivityDetailSchema = z.object({
  activity_id: z
    .number()
    .positive()
    .describe(
      "The unique Strava activity ID to retrieve details for. " +
        "Find this ID by first calling list_activities, or from a Strava URL " +
        "(e.g., strava.com/activities/12345678 -> activity_id=12345678). " +
        "Returns comprehensive data: splits, laps, segments, gear, and calories."
    ),
});

export async function getActivityDetail(
  client: StravaClient,
  input: z.infer<typeof getActivityDetailSchema>
): Promise<TextContent[]> {
  const activity = await client.getActivityDetail(input.activity_id);

  // Remove heavy/unnecessary data for token efficiency
  const { map, photos, external_id, upload_id, similar_activities, ...strippedActivity } = activity;

  return [{ type: "text", text: JSON.stringify(strippedActivity) }];
}
