import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { StreamType, StreamResolution } from "src/strava/types.js";
import { STREAM_TYPES, STREAM_RESOLUTIONS } from "src/strava/constants.js";
import {
  processManualLaps,
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
    .default("high")
    .describe("Data resolution. Defaults to high for accurate analysis."),
});

export async function getActivityStreams(
  client: StravaClient,
  input: z.infer<typeof getActivityStreamsSchema>
): Promise<TextContent[]> {
  const [streams, athleteZones, activityDetail] = await Promise.all([
    client.getActivityStreams(input.activity_id, input.types as StreamType[], {
      resolution: input.resolution as StreamResolution,
    }),
    client.getAthleteZones().catch(() => null),
    client.getActivityDetail(input.activity_id).catch(() => null),
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

  const laps = activityDetail?.laps || [];
  const sportType = activityDetail?.sport_type || "Unknown";
  const manualLaps = processManualLaps(laps, streams);
  const summary = calculateSummary(streams, manualLaps);
  const stats = calculateOverallStats(streams);
  const zones = calculateZoneDistribution(streams, athleteZones);
  const workoutType = detectWorkoutType(
    sportType,
    zones?.heart_rate ?? [],
    manualLaps
  );

  const response = {
    activity_id: input.activity_id,
    sport_type: sportType,
    workout_type: workoutType,
    workout_type_description:
      WORKOUT_TYPE_DESCRIPTIONS[workoutType] || `${sportType} activity`,
    summary,
    overall_stats: stats,
    zones,
    manual_laps: manualLaps.length > 0 ? manualLaps : undefined,
  };

  return [{ type: "text", text: JSON.stringify(response) }];
}
