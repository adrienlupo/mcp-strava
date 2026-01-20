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

export interface DriftAnalysis {
  first_half: { avg_hr?: number; avg_power?: number };
  second_half: { avg_hr?: number; avg_power?: number };
  hr_drift_percent?: number;
  power_fade_percent?: number;
}

export interface Climb {
  start_km: number;
  end_km: number;
  gain: number;
  avg_grade: number;
  avg_hr?: number;
  avg_power?: number;
}

export interface TerrainDistribution {
  climbing: { percent: number; avg_grade: number };
  flat: { percent: number; avg_grade: number };
  descending: { percent: number; avg_grade: number };
}

export interface ElevationProfile {
  total_gain: number;
  total_loss: number;
  min_elevation: number;
  max_elevation: number;
  climbs: Climb[];
  terrain_distribution: TerrainDistribution;
}

export interface ExtendedStats {
  heartrate?: { min: number; max: number };
  power?: { min: number; max: number };
  cadence?: { min: number; max: number };
}

export interface OverallStats {
  velocity: { min_kph: number; max_kph: number; avg_kph: number };
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

export function calculateDriftAnalysis(streams: StreamSet): DriftAnalysis | null {
  const timeData = getStream<number>(streams, "time");
  if (!timeData || timeData.length < 10) return null;

  const hrData = getStream<number>(streams, "heartrate");
  const powerData = getStream<number>(streams, "watts");

  if (!hrData && !powerData) return null;

  const midpoint = Math.floor(timeData.length / 2);

  const result: DriftAnalysis = {
    first_half: {},
    second_half: {},
  };

  if (hrData) {
    const firstHalfHr = hrData.slice(0, midpoint).filter((h) => h > 0);
    const secondHalfHr = hrData.slice(midpoint).filter((h) => h > 0);

    if (firstHalfHr.length > 0 && secondHalfHr.length > 0) {
      const avgFirstHr = Math.round(avg(firstHalfHr));
      const avgSecondHr = Math.round(avg(secondHalfHr));

      result.first_half.avg_hr = avgFirstHr;
      result.second_half.avg_hr = avgSecondHr;

      if (avgFirstHr > 0) {
        result.hr_drift_percent =
          Math.round(((avgSecondHr - avgFirstHr) / avgFirstHr) * 1000) / 10;
      }
    }
  }

  if (powerData) {
    const firstHalfPower = powerData.slice(0, midpoint).filter((p) => p > 0);
    const secondHalfPower = powerData.slice(midpoint).filter((p) => p > 0);

    if (firstHalfPower.length > 0 && secondHalfPower.length > 0) {
      const avgFirstPower = Math.round(avg(firstHalfPower));
      const avgSecondPower = Math.round(avg(secondHalfPower));

      result.first_half.avg_power = avgFirstPower;
      result.second_half.avg_power = avgSecondPower;

      if (avgFirstPower > 0) {
        result.power_fade_percent =
          Math.round(((avgSecondPower - avgFirstPower) / avgFirstPower) * 1000) / 10;
      }
    }
  }

  const hasData =
    result.first_half.avg_hr !== undefined ||
    result.first_half.avg_power !== undefined;

  return hasData ? result : null;
}

export function calculateElevationProfile(streams: StreamSet): ElevationProfile | null {
  const altitudeData = getStream<number>(streams, "altitude");
  const distanceData = getStream<number>(streams, "distance");

  if (!altitudeData || altitudeData.length < 10) return null;
  if (!distanceData || distanceData.length !== altitudeData.length) return null;

  const hrData = getStream<number>(streams, "heartrate");
  const powerData = getStream<number>(streams, "watts");

  const delta = elevationDelta(altitudeData);

  const climbs = detectClimbs(altitudeData, distanceData, hrData, powerData);

  const terrain = calculateTerrainDistribution(altitudeData, distanceData);

  return {
    total_gain: delta.gain,
    total_loss: delta.loss,
    min_elevation: Math.round(Math.min(...altitudeData)),
    max_elevation: Math.round(Math.max(...altitudeData)),
    climbs,
    terrain_distribution: terrain,
  };
}

function detectClimbs(
  altitude: number[],
  distance: number[],
  hr: number[] | null,
  power: number[] | null
): Climb[] {
  const climbs: Climb[] = [];
  const MIN_CLIMB_GAIN = 20;
  const MIN_CLIMB_GRADE = 2.0;

  let climbStart: number | null = null;
  let climbGain = 0;

  for (let i = 1; i < altitude.length; i++) {
    const elevChange = altitude[i] - altitude[i - 1];
    const distChange = distance[i] - distance[i - 1];

    if (distChange <= 0) continue;

    const grade = (elevChange / distChange) * 100;

    if (grade >= MIN_CLIMB_GRADE) {
      if (climbStart === null) {
        climbStart = i - 1;
        climbGain = 0;
      }
      climbGain += elevChange;
    } else if (climbStart !== null) {
      if (climbGain >= MIN_CLIMB_GAIN) {
        const climb = buildClimb(climbStart, i - 1, altitude, distance, hr, power);
        if (climb) climbs.push(climb);
      }
      climbStart = null;
      climbGain = 0;
    }
  }

  if (climbStart !== null && climbGain >= MIN_CLIMB_GAIN) {
    const climb = buildClimb(
      climbStart,
      altitude.length - 1,
      altitude,
      distance,
      hr,
      power
    );
    if (climb) climbs.push(climb);
  }

  return climbs;
}

function buildClimb(
  startIdx: number,
  endIdx: number,
  altitude: number[],
  distance: number[],
  hr: number[] | null,
  power: number[] | null
): Climb | null {
  const startKm = Math.round((distance[startIdx] / 1000) * 10) / 10;
  const endKm = Math.round((distance[endIdx] / 1000) * 10) / 10;
  const gain = Math.round(altitude[endIdx] - altitude[startIdx]);
  const horizontalDist = distance[endIdx] - distance[startIdx];

  if (horizontalDist <= 0) return null;

  const avgGrade = Math.round((gain / horizontalDist) * 1000) / 10;

  const climb: Climb = {
    start_km: startKm,
    end_km: endKm,
    gain,
    avg_grade: avgGrade,
  };

  if (hr) {
    const hrSlice = hr.slice(startIdx, endIdx + 1).filter((h) => h > 0);
    if (hrSlice.length > 0) {
      climb.avg_hr = Math.round(avg(hrSlice));
    }
  }

  if (power) {
    const powerSlice = power.slice(startIdx, endIdx + 1).filter((p) => p > 0);
    if (powerSlice.length > 0) {
      climb.avg_power = Math.round(avg(powerSlice));
    }
  }

  return climb;
}

function calculateTerrainDistribution(
  altitude: number[],
  distance: number[]
): TerrainDistribution {
  let climbingDist = 0;
  let flatDist = 0;
  let descendingDist = 0;
  let climbingGrade = 0;
  let flatGrade = 0;
  let descendingGrade = 0;

  const FLAT_THRESHOLD = 2.0;

  for (let i = 1; i < altitude.length; i++) {
    const elevChange = altitude[i] - altitude[i - 1];
    const distChange = distance[i] - distance[i - 1];

    if (distChange <= 0) continue;

    const grade = (elevChange / distChange) * 100;

    if (grade >= FLAT_THRESHOLD) {
      climbingDist += distChange;
      climbingGrade += grade * distChange;
    } else if (grade <= -FLAT_THRESHOLD) {
      descendingDist += distChange;
      descendingGrade += grade * distChange;
    } else {
      flatDist += distChange;
      flatGrade += Math.abs(grade) * distChange;
    }
  }

  const totalDist = climbingDist + flatDist + descendingDist;

  if (totalDist === 0) {
    return {
      climbing: { percent: 0, avg_grade: 0 },
      flat: { percent: 100, avg_grade: 0 },
      descending: { percent: 0, avg_grade: 0 },
    };
  }

  return {
    climbing: {
      percent: Math.round((climbingDist / totalDist) * 100),
      avg_grade:
        climbingDist > 0
          ? Math.round((climbingGrade / climbingDist) * 10) / 10
          : 0,
    },
    flat: {
      percent: Math.round((flatDist / totalDist) * 100),
      avg_grade:
        flatDist > 0 ? Math.round((flatGrade / flatDist) * 10) / 10 : 0,
    },
    descending: {
      percent: Math.round((descendingDist / totalDist) * 100),
      avg_grade:
        descendingDist > 0
          ? Math.round((descendingGrade / descendingDist) * 10) / 10
          : 0,
    },
  };
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
    velocity: { min_kph: 0, max_kph: 0, avg_kph: 0 },
  };

  const velocity = getStream<number>(streams, "velocity_smooth");
  if (velocity) {
    const v = velocity.filter((x) => x > 0);
    if (v.length > 0) {
      stats.velocity = {
        min_kph: Math.round(Math.min(...v) * 3.6 * 10) / 10,
        max_kph: Math.round(Math.max(...v) * 3.6 * 10) / 10,
        avg_kph: Math.round(avg(v) * 3.6 * 10) / 10,
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
