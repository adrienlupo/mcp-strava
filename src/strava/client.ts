import axios, { AxiosInstance } from "axios";
import JSONBigInt from "json-bigint";
import { TokenManager } from "src/auth/tokenManager.js";
import type {
  AthleteProfile,
  AthleteStats,
  ActivitySummary,
  ActivityDetail,
  AthleteZones,
  StreamType,
  StreamResolution,
  StreamSet,
  SegmentEffort,
} from "src/strava/types.js";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// Configure json-bigint to convert large integers to strings
// This preserves precision for IDs that exceed Number.MAX_SAFE_INTEGER
const jsonBigInt = JSONBigInt({ storeAsString: true });

export class StravaClient {
  private axios: AxiosInstance;
  private tokenManager: TokenManager;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
    this.axios = axios.create({
      baseURL: STRAVA_API_BASE,
      transformResponse: (data: string) => {
        try {
          return jsonBigInt.parse(data);
        } catch {
          return data;
        }
      },
    });

    this.axios.interceptors.request.use(
      async (config) => {
        const token = await this.tokenManager.getValidAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error(
            "Unauthorized: Token refresh failed or Strava revoked access",
          );
        }
        if (error.response?.status === 429) {
          throw new Error(
            `Rate limited: ${
              error.response.data?.message || "Too many requests"
            }`,
          );
        }
        throw error;
      },
    );
  }

  async getAthlete(): Promise<AthleteProfile> {
    const response = await this.axios.get<AthleteProfile>("/athlete");
    return response.data;
  }

  async getAthleteStats(): Promise<AthleteStats> {
    const athlete = await this.getAthlete();
    const response = await this.axios.get<AthleteStats>(
      `/athletes/${athlete.id}/stats`,
    );
    return response.data;
  }

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
      { params: Object.fromEntries(params) },
    );
    return response.data;
  }

  async getActivityDetail(id: number): Promise<ActivityDetail> {
    const response = await this.axios.get<ActivityDetail>(`/activities/${id}`);
    return response.data;
  }

  // Requires profile:read_all scope
  async getAthleteZones(): Promise<AthleteZones> {
    const response = await this.axios.get<AthleteZones>("/athlete/zones");
    return response.data;
  }

  async getActivityStreams(
    id: number,
    types: StreamType[],
    options?: {
      resolution?: StreamResolution;
      series_type?: "time" | "distance";
    },
  ): Promise<StreamSet> {
    const params: Record<string, string> = {};
    if (options?.resolution) params.resolution = options.resolution;
    if (options?.series_type) params.series_type = options.series_type;

    const response = await this.axios.get<StreamSet>(
      `/activities/${id}/streams/${types.join(",")}`,
      { params },
    );
    return response.data;
  }

  async getSegmentEffortById(id: string): Promise<SegmentEffort> {
    const response = await this.axios.get<SegmentEffort>(
      `/segment_efforts/${id}`,
    );
    return response.data;
  }

  async listSegmentEfforts(
    segmentId: number | string,
  ): Promise<SegmentEffort[]> {
    const params: Record<string, string | number> = { segment_id: segmentId };
    const response = await this.axios.get<SegmentEffort[]>("/segment_efforts", {
      params,
    });
    return response.data;
  }
}
