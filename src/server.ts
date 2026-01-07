import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StravaClient } from "src/strava/client.js";
import {
  getAthleteProfile,
  getAthleteProfileSchema,
} from "src/tools/getAthleteProfile.js";
import {
  getAthleteStats,
  getAthleteStatsSchema,
} from "src/tools/getAthleteStats.js";
import {
  listActivities,
  listActivitiesSchema,
} from "src/tools/listActivities.js";
import {
  getActivityDetail,
  getActivityDetailSchema,
} from "src/tools/getActivityDetail.js";
import {
  getAthleteZones,
  getAthleteZonesSchema,
} from "src/tools/getAthleteZones.js";

export function createMcpServer(stravaClient: StravaClient) {
  const server = new McpServer({
    name: "strava-mcp-server",
    version: "1.0.0",
  });

  server.registerTool(
    "ping",
    {
      description: "A simple test tool that verifies the server is running",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: "Strava MCP server is running successfully.",
        },
      ],
    })
  );

  server.registerTool(
    "get_athlete_profile",
    {
      description:
        "Get the authenticated athlete's Strava profile information. Returns personal details including: full name, username, location (city, state, country), bio, gender, profile photos, account creation date, and Summit membership status. Use this when the user asks about their profile, account information, or personal details. No parameters required.",
      inputSchema: getAthleteProfileSchema,
    },
    async (input) => ({
      content: await getAthleteProfile(stravaClient, input as never),
    })
  );

  server.registerTool(
    "get_athlete_stats",
    {
      description:
        "Get comprehensive activity statistics for the authenticated athlete. Returns aggregated metrics broken down by sport type (ride, run, swim) across three time periods: recent (last 4 weeks), year-to-date, and all-time. Includes total counts, distance, moving time, elapsed time, and elevation gain for each category. Use this when the user asks about their overall performance, totals, records, or wants to compare different time periods. No parameters required.",
      inputSchema: getAthleteStatsSchema,
    },
    async (input) => ({
      content: await getAthleteStats(stravaClient, input as never),
    })
  );

  server.registerTool(
    "list_activities",
    {
      description:
        "List activities for the authenticated athlete with optional filtering and pagination. Returns activity summaries including: activity name, type, date, distance, duration, elevation gain, average speed, heart rate, power data, kudos count, and summary statistics. Use this when the user wants to see their recent activities, search for specific workouts, or analyze activity history. Parameters: limit (1-200, default 30), before (Unix timestamp), after (Unix timestamp), page (for pagination). Supports queries like 'show my last 10 runs', 'activities from last month', or 'all workouts this week'.",
      inputSchema: listActivitiesSchema,
    },
    async (input) => ({
      content: await listActivities(
        stravaClient,
        listActivitiesSchema.parse(input)
      ),
    })
  );

  server.registerTool(
    "get_activity_detail",
    {
      description:
        "Get detailed information about a specific activity by its ID. Returns comprehensive data including: full activity metrics (distance, time, pace, speed, elevation), split-by-split breakdown, lap data, segment efforts, gear used, photos, route map polyline, calories burned, heart rate zones, power zones, and similar activities. Use this when the user asks about a specific workout, wants detailed analysis of an activity, or references a particular activity by ID or name (search with list_activities first to get the ID). Required parameter: activity_id (number).",
      inputSchema: getActivityDetailSchema,
    },
    async (input) => ({
      content: await getActivityDetail(
        stravaClient,
        getActivityDetailSchema.parse(input)
      ),
    })
  );

  server.registerTool(
    "get_athlete_zones",
    {
      description:
        "Get the authenticated athlete's heart rate and power zones. Returns zone configuration for both heart rate (if configured) and power (if available). Heart rate zones include custom zone settings and min/max values for each zone. Power zones include FTP-based zone ranges. Use this when the user asks about their training zones, heart rate zones, power zones, or FTP settings. Requires profile:read_all scope. No parameters required.",
      inputSchema: getAthleteZonesSchema,
    },
    async (input) => ({
      content: await getAthleteZones(stravaClient, input as never),
    })
  );

  return server;
}
