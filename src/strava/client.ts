import axios, { AxiosInstance } from "axios";
import { TokenManager } from "src/auth/tokenManager.js";
import type {
  AthleteProfile,
  AthleteStats,
  ActivitySummary,
  ActivityDetail,
  AthleteZones,
} from "src/strava/types.js";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export class StravaClient {
  private axios: AxiosInstance;
  private tokenManager: TokenManager;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
    this.axios = axios.create({
      baseURL: STRAVA_API_BASE,
    });

    this.axios.interceptors.request.use(
      async (config) => {
        const token = await this.tokenManager.getValidAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error(
            "Unauthorized: Token refresh failed or Strava revoked access"
          );
        }
        if (error.response?.status === 429) {
          throw new Error(
            `Rate limited: ${
              error.response.data?.message || "Too many requests"
            }`
          );
        }
        throw error;
      }
    );
  }

  /**
   * Get the authenticated athlete's profile
   */
  async getAthlete(): Promise<AthleteProfile> {
    const response = await this.axios.get<AthleteProfile>("/athlete");
    return response.data;
  }

  /**
   * Get stats for the authenticated athlete
   */
  async getAthleteStats(): Promise<AthleteStats> {
    const athlete = await this.getAthlete();
    const response = await this.axios.get<AthleteStats>(
      `/athletes/${athlete.id}/stats`
    );
    return response.data;
  }

  /**
   * List activities for the authenticated athlete
   * @param options Filter options
   */
  async listActivities(options?: {
    before?: number;
    after?: number;
    page?: number;
    per_page?: number;
  }): Promise<ActivitySummary[]> {
    const params = new URLSearchParams();

    if (options?.before) params.append("before", options.before.toString());
    if (options?.after) params.append("after", options.after.toString());
    if (options?.page) params.append("page", options.page.toString());
    if (options?.per_page)
      params.append("per_page", options.per_page.toString());

    const response = await this.axios.get<ActivitySummary[]>(
      "/athlete/activities",
      { params: Object.fromEntries(params) }
    );
    return response.data;
  }

  /**
   * Get detailed information about a specific activity
   * @param id Activity ID
   */
  async getActivityDetail(id: number): Promise<ActivityDetail> {
    const response = await this.axios.get<ActivityDetail>(`/activities/${id}`);
    return response.data;
  }

  /**
   * Get the authenticated athlete's heart rate and power zones
   * Requires profile:read_all scope
   */
  async getAthleteZones(): Promise<AthleteZones> {
    const response = await this.axios.get<AthleteZones>("/athlete/zones");
    return response.data;
  }
}
