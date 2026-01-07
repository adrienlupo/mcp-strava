import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const getAthleteStatsSchema = z.object({});

export async function getAthleteStats(
  client: StravaClient,
  _input: Record<string, never>
): Promise<TextContent[]> {
  const stats = await client.getAthleteStats();
  return [{ type: "text", text: JSON.stringify(stats) }];
}
