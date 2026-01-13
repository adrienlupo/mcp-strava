# Strava MCP Server

Model Context Protocol server for Strava API integration. Built with TypeScript and uses stdio transport for Claude Desktop.

## Tools

- `get_athlete_profile` - Get authenticated athlete's profile
- `get_athlete_stats` - Get activity statistics (recent, YTD, all-time)
- `get_athlete_zones` - Get heart rate and power zones
- `list_activities` - List activities with filtering and pagination
- `get_activity_detail` - Get detailed activity information by ID

### Date Filtering

The `list_activities` tool accepts ISO date strings for filtering:

```
after: "2024-01-01"     # Activities after this date
before: "2024-12-31"    # Activities before this date
```

For recent activities, just use `limit` without date filters.

## Setup with Claude Desktop

### 1. Create Strava API Application

Visit https://www.strava.com/settings/api and create an application to get your Client ID and Secret.

### 2. Build the Project

```bash
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "Strava MCP": {
      "command": "node",
      "args": ["/absolute/path/to/strava-mcp/dist/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "your_client_id",
        "STRAVA_CLIENT_SECRET": "your_client_secret",
        "STRAVA_REDIRECT_URI": "http://localhost:3000/auth/callback",
        "TOKEN_FILE_PATH": "/absolute/path/to/strava-mcp/data/tokens.json"
      }
    }
  }
}
```

### 4. Authorize with Strava

Create a `.env` file in the project root with your Strava credentials:

```bash
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback
TOKEN_FILE_PATH=/absolute/path/to/strava-mcp/data/tokens.json
```

Then run the authorization server:

```bash
npm run auth
```

Visit `http://localhost:3000/auth/strava` in your browser to authorize. After successful authorization, stop the server (Ctrl+C).

### 5. Restart Claude Desktop

Restart Claude Desktop to load the MCP server.

## Development

```bash
npm install
npm run build
npm start
```
