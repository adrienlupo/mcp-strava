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

  // Filter splits_metric to keep only essential fields
  const filteredSplits = activity.splits_metric?.map((split) => ({
    split: split.split,
    distance: split.distance,
    moving_time: split.moving_time,
    elevation_difference: split.elevation_difference,
    average_heartrate: split.average_heartrate,
  }));

  // Build optimized response with only essential fields
  const strippedActivity = {
    id: activity.id,
    name: activity.name,
    description: activity.description,
    type: activity.type,
    sport_type: activity.sport_type,
    start_date_local: activity.start_date_local,
    moving_time: activity.moving_time,
    distance: activity.distance,
    total_elevation_gain: activity.total_elevation_gain,
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    suffer_score: activity.suffer_score,
    splits_metric: filteredSplits,
    laps: activity.laps,
    segment_efforts: activity.segment_efforts,
    available_zones: activity.available_zones,
  };

  return [{ type: "text", text: JSON.stringify(strippedActivity) }];
}
