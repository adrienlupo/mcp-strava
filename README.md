# Strava MCP Server

Model Context Protocol server for Strava API integration. Built with TypeScript and Express.

## Tools

- `get_athlete_profile` - Get authenticated athlete's profile
- `get_athlete_stats` - Get activity statistics (recent, YTD, all-time)
- `list_activities` - List activities with filtering and pagination
- `get_activity_detail` - Get detailed activity information by ID

## Setup

1. Create Strava API application at https://www.strava.com/settings/api
2. Copy `.env.example` to `.env` and add your credentials
3. Run with Docker:

```bash
docker-compose up -d
```

4. Authorize: Visit `http://localhost:3000/auth/strava`

## Development

```bash
npm install
npm run dev
```

## Endpoints

- `/mcp` - MCP protocol endpoint
- `/health` - Health check
- `/auth/strava` - OAuth authorization
- `/auth/status` - Check authorization status