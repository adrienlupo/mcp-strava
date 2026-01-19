# Strava MCP Server

Minimalist Strava integration for Claude.

5 focused tools. One-time auth. Zero bloat.

## What You Can Ask Claude

- "How was my training this week vs last?"
- "What's my average heart rate on tempo runs?"
- "Break down yesterday's workout by zones"

## Tools

| Tool                  | What it does                  |
| --------------------- | ----------------------------- |
| `get_athlete_profile` | Your profile info             |
| `get_athlete_stats`   | Totals: recent, YTD, all-time |
| `get_athlete_zones`   | HR and power zones            |
| `list_activities`     | Browse with date filtering    |
| `get_activity_detail` | Full workout breakdown        |

### Date Filtering

The `list_activities` tool accepts ISO date strings for filtering:

```
after: "2024-01-01"     # Activities after this date
before: "2024-12-31"    # Activities before this date
```

For recent activities, just use `limit` without date filters.

## Quick Start with npx

```
1. Create Strava App     →  strava.com/settings/api → get Client ID + Secret
2. Configure Claude      →  Add credentials to claude_desktop_config.json (see details below)
3. Authorize (one-time)  →  STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=xxx \
                            STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback \
                            npx mcp-strava-auth
4. Restart Claude        →  Done! Ask Claude about your workouts
```

### 1. Create Strava API Application

Visit https://www.strava.com/settings/api and create an application to get your Client ID and Secret.

### 2. Configure Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```bash
open ~/Library/Application\ Support/Claude/
```

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "strava": {
      "command": "npx",
      "args": ["-y", "mcp-strava"],
      "env": {
        "STRAVA_CLIENT_ID": "your_client_id",
        "STRAVA_CLIENT_SECRET": "your_client_secret",
        "STRAVA_REDIRECT_URI": "http://localhost:3000/auth/callback"
      }
    }
  }
}
```

### 3. Authorize with Strava (one-time setup)

Run the auth server to authorize with your Strava account:

```bash
STRAVA_CLIENT_ID=your_client_id \
STRAVA_CLIENT_SECRET=your_client_secret \
STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback \
npx mcp-strava-auth
```

Then:

1. Visit `http://localhost:3000/auth/strava` in your browser
2. Authorize on Strava's page
3. You'll see "Authorization Successful!" when complete
4. Stop the server with Ctrl+C

Tokens are stored in `~/.strava-mcp/tokens.json`.

### 4. Restart Claude Desktop

Restart Claude Desktop to load the MCP server.

## Manual Setup (Alternative)

If you prefer to clone and build locally:

### 1. Create Strava API Application

Visit https://www.strava.com/settings/api and create an application to get your Client ID and Secret.

### 2. Build the Project

```bash
git clone https://github.com/adrienlupo/mcp-strava.git
cd mcp-strava
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```bash
open ~/Library/Application\ Support/Claude/
```

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "strava": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-strava/dist/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "your_client_id",
        "STRAVA_CLIENT_SECRET": "your_client_secret",
        "STRAVA_REDIRECT_URI": "http://localhost:3000/auth/callback"
      }
    }
  }
}
```

### 4. Authorize with Strava

Run the authorization server with your Strava credentials:

```bash
STRAVA_CLIENT_ID=your_client_id \
STRAVA_CLIENT_SECRET=your_client_secret \
STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback \
npm run auth
```

Then:

1. Visit `http://localhost:3000/auth/strava` in your browser
2. Authorize on Strava's page
3. You'll see "Authorization Successful!" when complete
4. Stop the server with Ctrl+C

### 5. Restart Claude Desktop

Restart Claude Desktop to load the MCP server.

## Development

```bash
npm install
npm run build
npm start
```

## License

MIT
