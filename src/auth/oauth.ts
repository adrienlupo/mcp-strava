import axios from "axios";
import { config } from "src/config.js";

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/api/v3/oauth/token";

/**
 * Generates the Strava OAuth authorization URL
 */
export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: config.stravaClientId,
    redirect_uri: config.stravaRedirectUri,
    response_type: "code",
    scope: "read,activity:read_all",
  });

  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an aJust uthorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<StravaTokens> {
  try {
    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: config.stravaClientId,
      client_secret: config.stravaClientSecret,
      code,
      grant_type: "authorization_code",
    });

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: response.data.expires_at,
      token_type: response.data.token_type,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to exchange code for tokens: ${
          error.response?.data?.message || error.message
        }`
      );
    }
    throw error;
  }
}

/**
 * Refreshes an access token using a refresh token
 * Important: Strava returns a NEW refresh token with each refresh
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<StravaTokens> {
  try {
    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: config.stravaClientId,
      client_secret: config.stravaClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: response.data.expires_at,
      token_type: response.data.token_type,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to refresh access token: ${
          error.response?.data?.message || error.message
        }`
      );
    }
    throw error;
  }
}
