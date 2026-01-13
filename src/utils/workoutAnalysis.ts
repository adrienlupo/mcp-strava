import type {
  StreamSet,
  AthleteZones,
  Zone,
  Lap,
} from "src/strava/types.js";
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

export interface ManualLap {
  lap_number: number;
  name: string;
  duration: number;
  distance: number;
  avg_pace: string;
  avg_heartrate?: number;
  max_heartrate?: number;
  avg_power?: number;
  avg_cadence?: number;
  elevation_gain?: number;
}

export interface WorkoutSummary {
  total_duration: number;
  total_distance: number;
  total_elevation_gain: number;
  manual_laps_count: number;
  avg_pace: string;
  avg_heartrate?: number;
  max_heartrate?: number;
  avg_power?: number;
  normalized_power?: number;
  avg_cadence?: number;
}

export interface OverallStats {
  velocity: { min_kph: number; max_kph: number; avg_kph: number };
  heartrate?: { min: number; max: number; avg: number };
  power?: { min: number; max: number; avg: number; normalized: number };
  cadence?: { min: number; max: number; avg: number };
  altitude?: { min: number; max: number; gain: number; loss: number };
}

export type WorkoutType =
  | "recovery"
  | "base"
  | "tempo"
  | "threshold"
  | "vo2max"
  | "anaerobic"
  | string;

export const WORKOUT_TYPE_DESCRIPTIONS: Record<string, string> = {
  recovery: "Easy recovery session, primarily in Zone 1",
  base: "Aerobic base building, primarily in Zone 2",
  tempo: "Tempo effort, primarily in Zone 3",
  threshold: "Threshold training, primarily in Zone 4",
  vo2max: "VO2max work, primarily in Zone 5",
  anaerobic: "Anaerobic/sprint work, maximal effort",
};

const ENDURANCE_SPORT_TYPES = [
  "Run",
  "Ride",
  "Swim",
  "VirtualRun",
  "VirtualRide",
  "Walk",
  "Hike",
  "TrailRun",
  "MountainBikeRide",
  "GravelRide",
  "EBikeRide",
  "Rowing",
  "Kayaking",
  "NordicSki",
  "BackcountrySki",
  "RollerSki",
];

const HIGH_INTENSITY_THRESHOLDS = {
  anaerobic_z5: 5 * 60,
  vo2max_z5: 8 * 60,
  threshold_z4: 15 * 60,
  threshold_z4z5: 20 * 60,
};

function isEnduranceSport(sportType: string): boolean {
  return ENDURANCE_SPORT_TYPES.includes(sportType);
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
  sportType: string,
  hrZones: ZoneAnalysis[],
  manualLaps: ManualLap[]
): string {
  if (!isEnduranceSport(sportType)) {
    return sportType;
  }

  if (!hrZones || hrZones.length === 0) {
    return sportType;
  }

  const getZoneTime = (zone: number) =>
    hrZones.find((z) => z.zone === zone)?.time_seconds || 0;
  const getZonePercent = (zone: number) =>
    hrZones.find((z) => z.zone === zone)?.percent || 0;

  const z1Time = getZoneTime(1);
  const z2Time = getZoneTime(2);
  const z3Time = getZoneTime(3);
  const z4Time = getZoneTime(4);
  const z5Time = getZoneTime(5);

  const z1 = getZonePercent(1);
  const z2 = getZonePercent(2);
  const z3 = getZonePercent(3);

  if (
    manualLaps.length >= 3 &&
    z5Time >= HIGH_INTENSITY_THRESHOLDS.anaerobic_z5
  ) {
    return "anaerobic";
  }

  if (z5Time >= HIGH_INTENSITY_THRESHOLDS.vo2max_z5) {
    return "vo2max";
  }

  if (
    z4Time >= HIGH_INTENSITY_THRESHOLDS.threshold_z4 ||
    z4Time + z5Time >= HIGH_INTENSITY_THRESHOLDS.threshold_z4z5
  ) {
    return "threshold";
  }

  if (z3 >= 35 || (z3 >= 25 && z3Time >= 20 * 60)) {
    return "tempo";
  }

  if (z2 >= 50 || (z2 >= 40 && z1 + z2 >= 70)) {
    return "base";
  }

  if (z1 >= 40 || (z1 + z2 >= 80 && z1 >= 25)) {
    return "recovery";
  }

  if (z1 + z2 >= 60) {
    return "base";
  }

  return "tempo";
}

function isManualLap(lap: Lap): boolean {
  return !/^Lap \d+$/.test(lap.name);
}

export function processManualLaps(
  laps: Lap[],
  streams: StreamSet
): ManualLap[] {
  const manual = laps.filter(isManualLap);
  if (manual.length === 0) return [];

  const hr = getStream<number>(streams, "heartrate");
  const power = getStream<number>(streams, "watts");
  const cadence = getStream<number>(streams, "cadence");
  const altitude = getStream<number>(streams, "altitude");

  return manual.map((lap, idx) => {
    const result: ManualLap = {
      lap_number: idx + 1,
      name: lap.name,
      duration: lap.moving_time,
      distance: Math.round(lap.distance),
      avg_pace: velocityToPace(lap.average_speed * 3.6),
    };

    if (hr && lap.start_index !== undefined) {
      const slice = hr
        .slice(lap.start_index, lap.end_index + 1)
        .filter((x) => x > 0);
      if (slice.length > 0) {
        result.avg_heartrate = Math.round(avg(slice));
        result.max_heartrate = Math.max(...slice);
      }
    } else if (lap.average_heartrate) {
      result.avg_heartrate = Math.round(lap.average_heartrate);
      result.max_heartrate = lap.max_heartrate;
    }

    if (power && lap.start_index !== undefined) {
      const slice = power
        .slice(lap.start_index, lap.end_index + 1)
        .filter((x) => x > 0);
      if (slice.length > 0) {
        result.avg_power = Math.round(avg(slice));
      }
    }

    if (cadence && lap.start_index !== undefined) {
      const slice = cadence
        .slice(lap.start_index, lap.end_index + 1)
        .filter((x) => x > 0);
      if (slice.length > 0) {
        result.avg_cadence = Math.round(avg(slice));
      }
    } else if (lap.average_cadence) {
      result.avg_cadence = Math.round(lap.average_cadence);
    }

    if (altitude && lap.start_index !== undefined) {
      const slice = altitude.slice(lap.start_index, lap.end_index + 1);
      result.elevation_gain = elevationDelta(slice).gain;
    }

    return result;
  });
}

export function calculateSummary(
  streams: StreamSet,
  manualLaps: ManualLap[]
): WorkoutSummary {
  const velocity = getStream<number>(streams, "velocity_smooth") || [];
  const hr = getStream<number>(streams, "heartrate") || [];
  const power = getStream<number>(streams, "watts") || [];
  const cadence = getStream<number>(streams, "cadence") || [];
  const altitude = getStream<number>(streams, "altitude") || [];
  const time = getStream<number>(streams, "time") || [];
  const distance = getStream<number>(streams, "distance") || [];

  const totalDuration = time.length > 1 ? time[time.length - 1] - time[0] : 0;
  const totalDistance = distance.length > 1 ? distance[distance.length - 1] : 0;
  const avgVelocity = velocity.filter((v) => v > 0);

  const summary: WorkoutSummary = {
    total_duration: Math.round(totalDuration),
    total_distance: Math.round(totalDistance),
    total_elevation_gain: elevationDelta(altitude).gain,
    manual_laps_count: manualLaps.length,
    avg_pace:
      avgVelocity.length > 0 ? velocityToPace(avg(avgVelocity) * 3.6) : "-",
  };

  const validHr = hr.filter((h) => h > 0);
  if (validHr.length > 0) {
    summary.avg_heartrate = Math.round(avg(validHr));
    summary.max_heartrate = Math.max(...validHr);
  }

  const validPower = power.filter((p) => p > 0);
  if (validPower.length > 0) {
    summary.avg_power = Math.round(avg(validPower));
    summary.normalized_power = calculateNormalizedPower(validPower);
  }

  const validCadence = cadence.filter((c) => c > 0);
  if (validCadence.length > 0) {
    summary.avg_cadence = Math.round(avg(validCadence));
  }

  return summary;
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
