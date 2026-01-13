import type { StreamSet, AthleteZones, Zone } from "src/strava/types.js";
import { HR_ZONE_NAMES, POWER_ZONE_NAMES } from "src/strava/constants.js";
import {
  avg,
  minMaxAvg,
  elevationDelta,
  velocityToPace,
  calculateNormalizedPower,
} from "src/utils/math.js";

export interface ZoneAnalysis {
  zone: number;
  name: string;
  min: number;
  max: number;
  time_seconds: number;
  percent: number;
}

export interface ZoneDistribution {
  heart_rate?: ZoneAnalysis[];
  power?: ZoneAnalysis[];
  zones_source: "athlete_configured" | "activity_estimated";
}

export interface DetectedInterval {
  type: "work" | "rest" | "warmup" | "cooldown";
  interval_number: number;
  start_time: number;
  end_time: number;
  duration: number;
  distance: number;
  avg_pace_min_km: string;
  avg_velocity_kph: number;
  avg_heartrate?: number;
  max_heartrate?: number;
  min_heartrate?: number;
  avg_power?: number;
  normalized_power?: number;
  avg_cadence?: number;
  elevation_gain?: number;
  elevation_loss?: number;
}

export interface WorkoutSummary {
  total_duration: number;
  total_distance: number;
  total_elevation_gain: number;
  work_intervals_count: number;
  rest_intervals_count: number;
  total_work_time: number;
  total_rest_time: number;
  work_rest_ratio: number;
  avg_work_pace_min_km: string;
  avg_work_velocity_kph: number;
  avg_work_heartrate?: number;
  max_heartrate?: number;
  avg_work_power?: number;
  avg_cadence?: number;
}

export interface OverallStats {
  velocity: { min_kph: number; max_kph: number; avg_kph: number };
  heartrate?: { min: number; max: number; avg: number };
  power?: { min: number; max: number; avg: number; normalized: number };
  cadence?: { min: number; max: number; avg: number };
  altitude?: { min: number; max: number; gain: number; loss: number };
}

export type WorkoutType = "intervals" | "steady_state" | "tempo" | "mixed";

export const WORKOUT_TYPE_DESCRIPTIONS: Record<WorkoutType, string> = {
  intervals: "High-intensity interval training with clear work/rest periods",
  steady_state: "Consistent effort, primarily in Zone 2 (endurance/aerobic base)",
  tempo: "Sustained moderate-high effort, primarily in Zone 3",
  mixed: "Varied intensity without clear pattern",
};

function getStream<T>(streams: StreamSet, type: string): T[] | null {
  const stream = streams.find((s) => s.type === type);
  return stream ? (stream.data as T[]) : null;
}

function slicePositive(arr: number[] | null, start: number, end: number): number[] {
  if (!arr) return [];
  return arr.slice(start, end + 1).filter((v) => v > 0);
}

function weightedAvg(
  intervals: DetectedInterval[],
  totalTime: number,
  getter: (i: DetectedInterval) => number | undefined
): number | undefined {
  if (intervals.length === 0 || totalTime === 0) return undefined;
  const firstValue = getter(intervals[0]);
  if (firstValue === undefined) return undefined;
  const sum = intervals.reduce((acc, i) => acc + (getter(i) || 0) * i.duration, 0);
  return Math.round(sum / totalTime);
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
    min: zone.min,
    max: zone.max === -1 ? Infinity : zone.max,
    time_seconds: Math.round(zoneTimes[i]),
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

  const result: ZoneDistribution = { zones_source: "athlete_configured" };

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

  return result;
}

export function detectWorkoutType(
  intervals: DetectedInterval[],
  hrZones: ZoneAnalysis[]
): WorkoutType {
  const workIntervals = intervals.filter((i) => i.type === "work");
  if (workIntervals.length >= 3) return "intervals";

  const getZonePercent = (zone: number) =>
    hrZones.find((z) => z.zone === zone)?.percent || 0;

  const z2Time = getZonePercent(2);
  const z3Time = getZonePercent(3);
  const z4z5Time = getZonePercent(4) + getZonePercent(5);

  if (z2Time >= 50) return "steady_state";
  if (z3Time >= 40) return "tempo";
  if (z4z5Time >= 30 && workIntervals.length >= 1) return "intervals";

  return "mixed";
}

export function detectIntervals(streams: StreamSet): DetectedInterval[] {
  const velocity = getStream<number>(streams, "velocity_smooth");
  const time = getStream<number>(streams, "time");
  const distance = getStream<number>(streams, "distance");

  if (!velocity || !time || !distance || velocity.length === 0) return [];

  const hr = getStream<number>(streams, "heartrate");
  const power = getStream<number>(streams, "watts");
  const cadence = getStream<number>(streams, "cadence");
  const altitude = getStream<number>(streams, "altitude");

  const maxVelocity = Math.max(...velocity);
  const restThreshold = Math.min(maxVelocity * 0.5, 2.5);

  const rawIntervals = detectRawIntervals(velocity, restThreshold);
  const mergedIntervals = mergeShortIntervals(rawIntervals, time);

  return buildFinalIntervals(
    mergedIntervals,
    { velocity, time, distance, hr, power, cadence, altitude },
    maxVelocity
  );
}

interface RawInterval {
  type: "work" | "rest";
  start: number;
  end: number;
}

function detectRawIntervals(velocity: number[], restThreshold: number): RawInterval[] {
  const intervals: RawInterval[] = [];
  let currentType: "work" | "rest" = velocity[0] >= restThreshold ? "work" : "rest";
  let intervalStart = 0;

  for (let i = 1; i < velocity.length; i++) {
    const newType = velocity[i] >= restThreshold ? "work" : "rest";
    if (newType !== currentType) {
      intervals.push({ type: currentType, start: intervalStart, end: i - 1 });
      currentType = newType;
      intervalStart = i;
    }
  }
  intervals.push({ type: currentType, start: intervalStart, end: velocity.length - 1 });

  return intervals;
}

function mergeShortIntervals(intervals: RawInterval[], time: number[]): RawInterval[] {
  const merged: RawInterval[] = [];
  for (const interval of intervals) {
    const duration = time[interval.end] - time[interval.start];
    if (duration < 30 && merged.length > 0) {
      merged[merged.length - 1].end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

interface StreamData {
  velocity: number[];
  time: number[];
  distance: number[];
  hr: number[] | null;
  power: number[] | null;
  cadence: number[] | null;
  altitude: number[] | null;
}

function buildFinalIntervals(
  intervals: RawInterval[],
  data: StreamData,
  maxVelocity: number
): DetectedInterval[] {
  const result: DetectedInterval[] = [];
  let intervalNumber = 1;

  for (let idx = 0; idx < intervals.length; idx++) {
    const interval = intervals[idx];
    const duration = data.time[interval.end] - data.time[interval.start];
    if (duration < 60) continue;

    const velocitySlice = data.velocity.slice(interval.start, interval.end + 1);
    const avgVelocityKph = avg(velocitySlice) * 3.6;

    const detected: DetectedInterval = {
      type: determineIntervalType(interval, idx, intervals.length, avgVelocityKph, maxVelocity),
      interval_number: intervalNumber++,
      start_time: Math.round(data.time[interval.start]),
      end_time: Math.round(data.time[interval.end]),
      duration: Math.round(duration),
      distance: Math.round(data.distance[interval.end] - data.distance[interval.start]),
      avg_pace_min_km: velocityToPace(avgVelocityKph),
      avg_velocity_kph: Math.round(avgVelocityKph * 100) / 100,
    };

    addOptionalMetrics(detected, interval, data);
    result.push(detected);
  }

  return result;
}

function determineIntervalType(
  interval: RawInterval,
  idx: number,
  total: number,
  avgVelocityKph: number,
  maxVelocity: number
): "work" | "rest" | "warmup" | "cooldown" {
  const threshold = maxVelocity * 3.6 * 0.7;
  if (idx === 0 && interval.type === "work" && avgVelocityKph < threshold) return "warmup";
  if (idx === total - 1 && interval.type === "work" && avgVelocityKph < threshold) return "cooldown";
  return interval.type;
}

function addOptionalMetrics(
  detected: DetectedInterval,
  interval: RawInterval,
  data: StreamData
): void {
  const hrSlice = slicePositive(data.hr, interval.start, interval.end);
  if (hrSlice.length > 0) {
    detected.avg_heartrate = Math.round(avg(hrSlice));
    detected.max_heartrate = Math.max(...hrSlice);
    detected.min_heartrate = Math.min(...hrSlice);
  }

  const powerSlice = slicePositive(data.power, interval.start, interval.end);
  if (powerSlice.length > 0) {
    detected.avg_power = Math.round(avg(powerSlice));
    detected.normalized_power = calculateNormalizedPower(powerSlice);
  }

  const cadenceSlice = slicePositive(data.cadence, interval.start, interval.end);
  if (cadenceSlice.length > 0) {
    detected.avg_cadence = Math.round(avg(cadenceSlice));
  }

  if (data.altitude) {
    const altSlice = data.altitude.slice(interval.start, interval.end + 1);
    const delta = elevationDelta(altSlice);
    detected.elevation_gain = delta.gain;
    detected.elevation_loss = delta.loss;
  }
}

export function calculateSummary(
  intervals: DetectedInterval[],
  streams: StreamSet
): WorkoutSummary {
  const time = getStream<number>(streams, "time") || [];
  const distance = getStream<number>(streams, "distance") || [];
  const altitude = getStream<number>(streams, "altitude") || [];

  const totalDuration = time.length > 0 ? time[time.length - 1] - time[0] : 0;
  const totalDistance = distance.length > 0 ? distance[distance.length - 1] - distance[0] : 0;
  const totalElevationGain = elevationDelta(altitude).gain;

  const workIntervals = intervals.filter((i) => i.type === "work");
  const restIntervals = intervals.filter((i) => i.type === "rest");

  const totalWorkTime = workIntervals.reduce((sum, i) => sum + i.duration, 0);
  const totalRestTime = restIntervals.reduce((sum, i) => sum + i.duration, 0);

  const avgWorkVelocity =
    totalWorkTime > 0
      ? workIntervals.reduce((sum, i) => sum + i.avg_velocity_kph * i.duration, 0) / totalWorkTime
      : 0;

  return {
    total_duration: Math.round(totalDuration),
    total_distance: Math.round(totalDistance),
    total_elevation_gain: totalElevationGain,
    work_intervals_count: workIntervals.length,
    rest_intervals_count: restIntervals.length,
    total_work_time: Math.round(totalWorkTime),
    total_rest_time: Math.round(totalRestTime),
    work_rest_ratio: totalRestTime > 0 ? Math.round((totalWorkTime / totalRestTime) * 100) / 100 : 0,
    avg_work_pace_min_km: velocityToPace(avgWorkVelocity),
    avg_work_velocity_kph: Math.round(avgWorkVelocity * 100) / 100,
    avg_work_heartrate: weightedAvg(workIntervals, totalWorkTime, (i) => i.avg_heartrate),
    max_heartrate: workIntervals.length > 0
      ? Math.max(...workIntervals.map((i) => i.max_heartrate || 0))
      : undefined,
    avg_work_power: weightedAvg(workIntervals, totalWorkTime, (i) => i.avg_power),
    avg_cadence: weightedAvg(workIntervals, totalWorkTime, (i) => i.avg_cadence),
  };
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
    stats.power = { ...powerStats, normalized: calculateNormalizedPower(powerData.filter((x) => x > 0)) };
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
