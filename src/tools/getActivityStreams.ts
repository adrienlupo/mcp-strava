import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { StreamType } from "src/strava/types.js";
import {
  calculateZoneDistribution,
  calculatePowerAnalysis,
  calculateExtendedStats,
} from "src/utils/workoutAnalysis.js";

const REQUIRED_STREAMS: StreamType[] = [
  "time",
  "distance",
  "heartrate",
  "cadence",
  "watts",
];

export const getActivityStreamsSchema = z.object({
  activity_id: z
    .number()
    .positive()
    .describe(
      "Activity ID. Returns zone distribution, power analysis (NP/VI), " +
        "and min/max stats - insights not available in get_activity_detail."
    ),
});

export async function getActivityStreams(
  client: StravaClient,
  input: z.infer<typeof getActivityStreamsSchema>
): Promise<TextContent[]> {
  const [streams, athleteZones] = await Promise.all([
    client.getActivityStreams(input.activity_id, REQUIRED_STREAMS, {
      resolution: "high",
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

  const zones = calculateZoneDistribution(streams, athleteZones);
  const powerAnalysis = calculatePowerAnalysis(streams);
  const extendedStats = calculateExtendedStats(streams);

  const response: Record<string, unknown> = {
    activity_id: input.activity_id,
  };

  if (zones) {
    response.zone_distribution = zones;
  }

  if (powerAnalysis) {
    response.power_analysis = powerAnalysis;
  }

  if (extendedStats) {
    response.extended_stats = extendedStats;
  }

  return [{ type: "text", text: JSON.stringify(response) }];
}
