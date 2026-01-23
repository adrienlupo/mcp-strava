import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const getActivityZonesSchema = z.object({
  activity_id: z.number().positive().describe("The Strava activity ID"),
});

function calculateZonePercentage(time: number, totalTime: number): number {
  if (totalTime === 0) return 0;
  return Math.round((time / totalTime) * 100);
}

export async function getActivityZones(
  client: StravaClient,
  input: z.infer<typeof getActivityZonesSchema>
): Promise<TextContent[]> {
  const activityZones = await client.getActivityZones(input.activity_id);

  const enriched = activityZones.map((zone) => {
    const totalTime = zone.distribution_buckets.reduce(
      (sum, bucket) => sum + bucket.time,
      0
    );

    return {
      type: zone.type,
      sensor_based: zone.sensor_based,
      score: zone.score,
      points: zone.points,
      custom_zones: zone.custom_zones,
      max: zone.max,
      total_time_seconds: totalTime,
      zones: zone.distribution_buckets.map((bucket, index) => ({
        zone: index + 1,
        min: bucket.min,
        max: bucket.max,
        time_seconds: bucket.time,
        percent: calculateZonePercentage(bucket.time, totalTime),
      })),
    };
  });

  return [{ type: "text", text: JSON.stringify(enriched) }];
}
