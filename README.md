# Strava MCP Server

Model Context Protocol server for Strava API integration. Built with TypeScript and Express.

## Tools

- `get_athlete_profile` - Get authenticated athlete's profile
- `get_athlete_stats` - Get activity statistics (recent, YTD, all-time)
- `list_activities` - List activities with filtering and pagination
- `get_activity_detail` - Get detailed activity information by ID

## Setup with Claude Desktop

### 1. Create Strava API Application

Visit https://www.strava.com/settings/api and create an application to get your Client ID and Secret.

### 2. Build the Project

```bash
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "strava": {
      "command": "npx",
      "args": ["-y", "/absolute/path/to/strava-mcp"],
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

**Note:** All credentials are configured in Claude Desktop's config. No `.env` file is needed.

### 4. Restart Claude Desktop

Restart Claude Desktop to load the MCP server.

### 5. Authorize with Strava

Visit `http://localhost:3000/auth/strava` to authorize the application with your Strava account.

## Development

For standalone development (without Claude Desktop):

1. Create a `.env` file based on `.env.example`
2. Run the dev server:

```bash
npm install
npm run dev
```

## Endpoints

- `/mcp` - MCP protocol endpoint
- `/health` - Health check
- `/auth/strava` - OAuth authorization
- `/auth/status` - Check authorization status
