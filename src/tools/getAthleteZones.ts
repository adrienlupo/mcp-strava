import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const getAthleteZonesSchema = z.object({});

export async function getAthleteZones(
  client: StravaClient,
  _input: Record<string, never>
): Promise<TextContent[]> {
  const zones = await client.getAthleteZones();
  return [{ type: "text", text: JSON.stringify(zones, null, 2) }];
}
