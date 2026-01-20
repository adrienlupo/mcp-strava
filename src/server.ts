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
import {
  getActivityStreams,
  getActivityStreamsSchema,
} from "src/tools/getActivityStreams.js";
import {
  getSegmentEffortStreams,
  getSegmentEffortStreamsSchema,
} from "src/tools/getSegmentEffortStreams.js";

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
        "Get authenticated athlete's Strava profile. " +
        "Returns: name, username, bio, location, weight, premium status, measurement preferences.",
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
        "Get aggregated activity statistics by sport type. " +
        "Returns: recent (4 weeks), YTD, all-time totals for ride/run/swim. " +
        "Each: count, distance (m), moving_time (s), elevation_gain (m).",
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
        "List activities with filtering and pagination. " +
        "Returns: id, name, type, sport_type, start_date, distance (m), moving_time (s), " +
        "elapsed_time (s), total_elevation_gain (m), average_speed (m/s), heartrate, watts. " +
        "Use week_offset for calendar weeks (0=this week, -1=last week). Monday-Sunday.",
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
        "Get activity metadata by ID. " +
        "Returns: name, description, splits, laps, segment_efforts, gear, calories. " +
        "segment_efforts contains Strava segments from THIS activity only (no historical data). " +
        "For segment analysis over time, pass segment_efforts[].id to get_segment_effort_streams. " +
        "For full activity time-series, use get_activity_streams.",
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
        "Get athlete's configured HR and power zones from Strava. " +
        "Returns: heart_rate.zones[], power.zones[] with min/max for each zone. " +
        "Requires profile:read_all scope.",
      inputSchema: getAthleteZonesSchema,
    },
    async (input) => ({
      content: await getAthleteZones(stravaClient, input as never),
    })
  );

  server.registerTool(
    "get_activity_streams",
    {
      description:
        "Returns second-by-second time-series data with pre-computed analysis. " +
        "Response: { workout_type, summary, overall_stats, zones, manual_laps }. " +
        "workout_type: auto-detected (recovery/base/tempo/threshold/vo2max/anaerobic). " +
        "Requires activity_id from list_activities.",
      inputSchema: getActivityStreamsSchema,
    },
    async (input) => ({
      content: await getActivityStreams(
        stravaClient,
        getActivityStreamsSchema.parse(input)
      ),
    })
  );

  server.registerTool(
    "get_segment_effort_streams",
    {
      description:
        "Analyze a Strava segment with full historical comparison. " +
        "ONE call returns EVERYTHING: segment info, current effort stats, AND comparison with " +
        "ALL previous attempts (best_time, average_time, total_efforts, rank, previous_efforts list). " +
        "No need to list_activities - this tool automatically fetches all historical data. " +
        "Use when user asks about segment history, progress, PRs, or performance over time. " +
        "Input: segment_effort_id from get_activity_detail's segment_efforts array.",
      inputSchema: getSegmentEffortStreamsSchema,
    },
    async (input) => ({
      content: await getSegmentEffortStreams(
        stravaClient,
        getSegmentEffortStreamsSchema.parse(input)
      ),
    })
  );

  return server;
}
