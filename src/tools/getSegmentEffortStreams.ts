import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { SegmentEffort } from "src/strava/types.js";

export const getSegmentEffortStreamsSchema = z.object({
  segment_effort_id: z
    .string()
    .regex(/^\d+$/, "Must be a numeric string")
    .describe(
      "The Strava segment effort ID as a string (to preserve precision for large IDs). " +
        "Get this from get_activity_detail response which includes segment_efforts array.",
    ),
});

interface EffortMetrics {
  date: string;
  elapsed_time: number;
  moving_time: number;
  avg_heartrate?: number;
  max_heartrate?: number;
  avg_watts?: number;
  pr_rank: number | null;
}

interface ComparisonData {
  total_efforts: number;
  best_time: number;
  average_time: number;
  this_effort_rank: number;
  previous_efforts: EffortMetrics[];
}

function computeComparison(
  currentEffort: SegmentEffort,
  allEfforts: SegmentEffort[],
): ComparisonData {
  const sortedByTime = [...allEfforts].sort(
    (a, b) => a.elapsed_time - b.elapsed_time,
  );

  const currentRank =
    sortedByTime.findIndex((e) => e.id === currentEffort.id) + 1;

  const times = allEfforts.map((e) => e.elapsed_time);
  const bestTime = Math.min(...times);
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

  const previousEfforts = allEfforts
    .filter((e) => e.id !== currentEffort.id)
    .sort(
      (a, b) =>
        new Date(b.start_date_local).getTime() -
        new Date(a.start_date_local).getTime(),
    )
    .slice(0, 10)
    .map((e) => ({
      date: e.start_date_local,
      elapsed_time: e.elapsed_time,
      moving_time: e.moving_time,
      avg_heartrate: e.average_heartrate,
      max_heartrate: e.max_heartrate,
      avg_watts: e.average_watts,
      pr_rank: e.pr_rank,
    }));

  return {
    total_efforts: allEfforts.length,
    best_time: bestTime,
    average_time: avgTime,
    this_effort_rank: currentRank,
    previous_efforts: previousEfforts,
  };
}

export async function getSegmentEffortStreams(
  client: StravaClient,
  input: z.infer<typeof getSegmentEffortStreamsSchema>,
): Promise<TextContent[]> {
  const effort = await client.getSegmentEffortById(input.segment_effort_id);
  const allEfforts = await client.listSegmentEfforts(effort.segment.id);
  const comparison = computeComparison(effort, allEfforts);

  const response = {
    segment_effort_id: input.segment_effort_id,
    segment: {
      id: effort.segment.id,
      name: effort.segment.name,
      distance: effort.segment.distance,
      elevation: effort.segment.elevation_high - effort.segment.elevation_low,
    },
    effort: {
      elapsed_time: effort.elapsed_time,
      moving_time: effort.moving_time,
      start_date: effort.start_date_local,
      avg_heartrate: effort.average_heartrate,
      max_heartrate: effort.max_heartrate,
      avg_watts: effort.average_watts,
      pr_rank: effort.pr_rank,
      kom_rank: effort.kom_rank,
    },
    comparison,
  };

  return [{ type: "text", text: JSON.stringify(response) }];
}
