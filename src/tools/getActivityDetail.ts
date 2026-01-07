import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const getActivityDetailSchema = z.object({
  activity_id: z
    .number()
    .positive()
    .describe("The Strava activity ID to retrieve details for"),
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
