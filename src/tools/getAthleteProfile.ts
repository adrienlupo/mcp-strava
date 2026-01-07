import { z } from "zod";
import { StravaClient } from "src/strava/client.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

export const getAthleteProfileSchema = z.object({});

export async function getAthleteProfile(
  client: StravaClient,
  _input: Record<string, never>
): Promise<TextContent[]> {
  const profile = await client.getAthlete();
  return [{ type: "text", text: JSON.stringify(profile, null, 2) }];
}
