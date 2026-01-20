import type { StreamSet, AthleteZones, Zone } from "src/strava/types.js";
import { HR_ZONE_NAMES, POWER_ZONE_NAMES } from "src/strava/constants.js";
import {
  avg,
  minMaxAvg,
  elevationDelta,
  calculateNormalizedPower,
} from "src/utils/math.js";

export interface ZoneAnalysis {
  zone: number;
  name: string;
  range: string;
  minutes: number;
  percent: number;
}

export interface ZoneDistribution {
  heart_rate?: ZoneAnalysis[];
  power?: ZoneAnalysis[];
}

export interface PowerAnalysis {
  normalized_power: number;
  average_power: number;
  variability_index: number;
  intensity_factor?: number;
}

export interface ExtendedStats {
  heartrate?: { min: number; max: number };
  power?: { min: number; max: number };
  cadence?: { min: number; max: number };
}

export interface OverallStats {
  velocity: {
    min_kph: number;
    max_kph: number;
    avg_kph: number;
    min_per_km: number;
    max_per_km: number;
    avg_per_km: number;
  };
  heartrate?: { min: number; max: number; avg: number };
  power?: { min: number; max: number; avg: number; normalized: number };
  cadence?: { min: number; max: number; avg: number };
  altitude?: { min: number; max: number; gain: number; loss: number };
}

function getStream<T>(streams: StreamSet, type: string): T[] | null {
  const stream = streams.find((s) => s.type === type);
  return stream ? (stream.data as T[]) : null;
}

export function calculateTimeInZones(
  dataStream: number[],
  timeStream: number[],
  zones: Zone[],
  zoneNames: string[]
): ZoneAnalysis[] {
  if (dataStream.length === 0 || dataStream.length !== timeStream.length) {
    return [];
  }

  const zoneTimes: number[] = new Array(zones.length).fill(0);
  let totalTime = 0;

  for (let i = 1; i < dataStream.length; i++) {
    const value = dataStream[i];
    const dt = timeStream[i] - timeStream[i - 1];
    if (dt <= 0 || dt > 60) continue;

    totalTime += dt;

    for (let z = 0; z < zones.length; z++) {
      const zone = zones[z];
      if (value >= zone.min && (value < zone.max || zone.max === -1)) {
        zoneTimes[z] += dt;
        break;
      }
    }
  }

  return zones.map((zone, i) => ({
    zone: i + 1,
    name: zoneNames[i] || `Zone ${i + 1}`,
    range: zone.max === -1 ? `${zone.min}+` : `${zone.min}-${zone.max}`,
    minutes: Math.round((zoneTimes[i] / 60) * 10) / 10,
    percent: totalTime > 0 ? Math.round((zoneTimes[i] / totalTime) * 100) : 0,
  }));
}

export function calculateZoneDistribution(
  streams: StreamSet,
  athleteZones: AthleteZones | null
): ZoneDistribution | null {
  if (!athleteZones) return null;

  const timeData = getStream<number>(streams, "time");
  if (!timeData) return null;

  const result: ZoneDistribution = {};

  const hrData = getStream<number>(streams, "heartrate");
  if (hrData && athleteZones.heart_rate?.zones?.length) {
    result.heart_rate = calculateTimeInZones(
      hrData,
      timeData,
      athleteZones.heart_rate.zones,
      HR_ZONE_NAMES
    );
  }

  const powerData = getStream<number>(streams, "watts");
  if (powerData && athleteZones.power?.zones?.length) {
    result.power = calculateTimeInZones(
      powerData,
      timeData,
      athleteZones.power.zones,
      POWER_ZONE_NAMES
    );
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function calculatePowerAnalysis(
  streams: StreamSet,
  ftp?: number
): PowerAnalysis | null {
  const powerData = getStream<number>(streams, "watts");
  if (!powerData) return null;

  const validPower = powerData.filter((p) => p > 0);
  if (validPower.length < 30) return null;

  const avgPower = Math.round(avg(validPower));
  const np = calculateNormalizedPower(validPower);

  if (avgPower === 0) return null;

  const result: PowerAnalysis = {
    normalized_power: np,
    average_power: avgPower,
    variability_index: Math.round((np / avgPower) * 100) / 100,
  };

  if (ftp && ftp > 0) {
    result.intensity_factor = Math.round((np / ftp) * 100) / 100;
  }

  return result;
}

export function calculateExtendedStats(streams: StreamSet): ExtendedStats | null {
  const stats: ExtendedStats = {};

  const hrData = getStream<number>(streams, "heartrate");
  if (hrData) {
    const validHr = hrData.filter((h) => h > 0);
    if (validHr.length > 0) {
      stats.heartrate = {
        min: Math.min(...validHr),
        max: Math.max(...validHr),
      };
    }
  }

  const powerData = getStream<number>(streams, "watts");
  if (powerData) {
    const validPower = powerData.filter((p) => p > 0);
    if (validPower.length > 0) {
      stats.power = {
        min: Math.min(...validPower),
        max: Math.max(...validPower),
      };
    }
  }

  const cadenceData = getStream<number>(streams, "cadence");
  if (cadenceData) {
    const validCadence = cadenceData.filter((c) => c > 0);
    if (validCadence.length > 0) {
      stats.cadence = {
        min: Math.min(...validCadence),
        max: Math.max(...validCadence),
      };
    }
  }

  return Object.keys(stats).length > 0 ? stats : null;
}

export function calculateOverallStats(streams: StreamSet): OverallStats {
  const stats: OverallStats = {
    velocity: {
      min_kph: 0,
      max_kph: 0,
      avg_kph: 0,
      min_per_km: 0,
      max_per_km: 0,
      avg_per_km: 0,
    },
  };

  const velocity = getStream<number>(streams, "velocity_smooth");
  if (velocity) {
    const v = velocity.filter((x) => x > 0);
    if (v.length > 0) {
      const minV = Math.min(...v);
      const maxV = Math.max(...v);
      const avgV = avg(v);
      stats.velocity = {
        min_kph: Math.round(minV * 3.6 * 10) / 10,
        max_kph: Math.round(maxV * 3.6 * 10) / 10,
        avg_kph: Math.round(avgV * 3.6 * 10) / 10,
        min_per_km: Math.round(1000 / maxV),
        max_per_km: Math.round(1000 / minV),
        avg_per_km: Math.round(1000 / avgV),
      };
    }
  }

  const hrStats = minMaxAvg(getStream<number>(streams, "heartrate") || []);
  if (hrStats) stats.heartrate = hrStats;

  const powerData = getStream<number>(streams, "watts") || [];
  const powerStats = minMaxAvg(powerData);
  if (powerStats) {
    stats.power = {
      ...powerStats,
      normalized: calculateNormalizedPower(powerData.filter((x) => x > 0)),
    };
  }

  const cadenceStats = minMaxAvg(getStream<number>(streams, "cadence") || []);
  if (cadenceStats) stats.cadence = cadenceStats;

  const altitude = getStream<number>(streams, "altitude");
  if (altitude && altitude.length > 0) {
    const delta = elevationDelta(altitude);
    stats.altitude = {
      min: Math.round(Math.min(...altitude)),
      max: Math.round(Math.max(...altitude)),
      ...delta,
    };
  }

  return stats;
}
