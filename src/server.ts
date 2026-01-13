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
        "Get the authenticated athlete's Strava profile information. " +
        "Returns: firstname, lastname, username, bio, city, state, country, sex, " +
        "profile photo URLs, created_at, premium/Summit status, weight, and measurement preferences. " +
        "Use when the user asks about their profile, account info, or 'who am I on Strava'. " +
        "No parameters required.",
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
        "Get comprehensive activity statistics for the authenticated athlete. " +
        "Returns aggregated metrics by sport type (ride, run, swim) across three time periods:\n" +
        "- recent_ride/run/swim_totals: Last 4 weeks\n" +
        "- ytd_ride/run/swim_totals: Year-to-date\n" +
        "- all_ride/run/swim_totals: All-time\n" +
        "Each includes: count, distance (m), moving_time (s), elapsed_time (s), elevation_gain (m). " +
        "Also includes biggest_ride_distance and biggest_climb_elevation_gain. " +
        "Use for 'how far have I run this year', 'my cycling totals', or 'compare my stats'. " +
        "No parameters required.",
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
        "List activities for the authenticated athlete with optional filtering and pagination. " +
        "Returns activity summaries: id, name, type, sport_type, start_date, distance (m), " +
        "moving_time (s), elapsed_time (s), total_elevation_gain (m), average_speed (m/s), " +
        "max_speed, average_heartrate, max_heartrate, average_watts, kudos_count, comment_count. " +
        "Example queries:\n" +
        "- 'my last 5 runs' -> limit=5 (no date filters needed)\n" +
        "- 'activities this week' -> after='<this monday>'\n" +
        "- 'activities last week' -> after='<previous monday>', before='<previous sunday end>' (Mon-Sun calendar week)\n" +
        "- 'rides in January' -> after='2024-01-01', before='2024-02-01'\n" +
        "Tip: For recent activities, just use limit. 'Last week' means the previous calendar week (Monday to Sunday).",
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
        "Get detailed information about a specific activity by its ID. " +
        "Returns comprehensive data: name, description, distance, moving_time, elapsed_time, " +
        "total_elevation_gain, calories, average_speed, max_speed, average_heartrate, max_heartrate, " +
        "average_watts, weighted_average_watts, kilojoules, average_cadence, splits_metric, " +
        "splits_standard, laps, segment_efforts, gear, device_name, and embed_token. " +
        "Workflow: First call list_activities to find the activity ID, then call this for details. " +
        "Use for 'analyze my last run', 'show lap times', or 'what gear did I use'.",
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
        "Get the authenticated athlete's heart rate and power zones. " +
        "Returns zone configuration:\n" +
        "- heart_rate: custom_zones (boolean), zones[] with min/max bpm for each zone (typically 5 zones)\n" +
        "- power: zones[] with min/max watts for each zone (FTP-based, typically 7 zones)\n" +
        "Use for 'what are my HR zones', 'show my power zones', 'what is my FTP', " +
        "or to interpret zone data from activities. " +
        "Note: Requires profile:read_all scope. Power zones require a power meter. " +
        "No parameters required.",
      inputSchema: getAthleteZonesSchema,
    },
    async (input) => ({
      content: await getAthleteZones(stravaClient, input as never),
    })
  );

  return server;
}
