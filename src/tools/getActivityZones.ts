import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { calculateZoneDistribution } from "src/utils/workoutAnalysis.js";

export const getActivityZonesSchema = z.object({
  activity_id: z
    .number()
    .positive()
    .describe(
      "Activity ID. Returns heart rate and power zone distribution as percentages of total training time."
    ),
});

export async function getActivityZones(
  client: StravaClient,
  input: z.infer<typeof getActivityZonesSchema>
): Promise<TextContent[]> {
  const [streams, athleteZones] = await Promise.all([
    client.getActivityStreams(input.activity_id, ["time", "heartrate", "watts"], {
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

  if (!zones) {
    return [
      {
        type: "text",
        text: JSON.stringify({
          error: "No zone data available",
          message: "Athlete zones not configured or no heart rate/power data.",
        }),
      },
    ];
  }

  const toPercentMap = (zoneList: typeof zones.heart_rate) =>
    Object.fromEntries(zoneList!.map((z) => [z.name, z.percent]));

  const response = {
    ...(zones.heart_rate && { heart_rate_zones: toPercentMap(zones.heart_rate) }),
    ...(zones.power && { power_zones: toPercentMap(zones.power) }),
  };

  return [{ type: "text", text: JSON.stringify(response) }];
}
