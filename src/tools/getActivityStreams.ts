import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { StreamType, StreamResolution } from "src/strava/types.js";
import { STREAM_TYPES, STREAM_RESOLUTIONS } from "src/strava/constants.js";
import {
  detectIntervals,
  calculateSummary,
  calculateOverallStats,
  calculateZoneDistribution,
  detectWorkoutType,
  WORKOUT_TYPE_DESCRIPTIONS,
} from "src/utils/workoutAnalysis.js";

export const getActivityStreamsSchema = z.object({
  activity_id: z
    .number()
    .positive()
    .describe(
      "The unique Strava activity ID to retrieve streams for. " +
        "Find this ID by first calling list_activities."
    ),
  types: z
    .array(z.enum(STREAM_TYPES))
    .default([
      "time",
      "distance",
      "heartrate",
      "cadence",
      "watts",
      "velocity_smooth",
      "altitude",
    ])
    .describe(
      "Array of stream types to fetch. Default includes all needed for full analysis."
    ),
  resolution: z
    .enum(STREAM_RESOLUTIONS)
    .optional()
    .describe(
      "Data resolution. low (~100 points), medium (~1000 points), high (~10000 points). " +
        "Default: Strava auto-selects based on activity length."
    ),
});

export async function getActivityStreams(
  client: StravaClient,
  input: z.infer<typeof getActivityStreamsSchema>
): Promise<TextContent[]> {
  const [streams, athleteZones] = await Promise.all([
    client.getActivityStreams(input.activity_id, input.types as StreamType[], {
      resolution: input.resolution as StreamResolution | undefined,
    }),
    client.getAthleteZones().catch(() => null),
  ]);

  if (!streams || streams.length === 0) {
    return [
      {
        type: "text",
        text: JSON.stringify({
          error: "No streams returned",
          message: "The activity may not have this data, or it may be too old.",
        }),
      },
    ];
  }

  const intervals = detectIntervals(streams);
  const summary = calculateSummary(intervals, streams);
  const stats = calculateOverallStats(streams);
  const zones = calculateZoneDistribution(streams, athleteZones);
  const workoutType = detectWorkoutType(intervals, zones?.heart_rate ?? []);

  const response = {
    activity_id: input.activity_id,
    workout_type: workoutType,
    workout_type_description: WORKOUT_TYPE_DESCRIPTIONS[workoutType],
    summary,
    overall_stats: stats,
    zones,
    intervals,
  };

  return [{ type: "text", text: JSON.stringify(response) }];
}
