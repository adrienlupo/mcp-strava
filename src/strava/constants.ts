export const STREAM_TYPES = [
  "time",
  "distance",
  "latlng",
  "altitude",
  "heartrate",
  "cadence",
  "watts",
  "velocity_smooth",
  "grade_smooth",
  "moving",
  "temp",
] as const;

export const STREAM_RESOLUTIONS = ["low", "medium", "high"] as const;

export const HR_ZONE_NAMES = [
  "Recovery",
  "Endurance",
  "Tempo",
  "Threshold",
  "VO2max",
];

export const POWER_ZONE_NAMES = [
  "Active Recovery",
  "Endurance",
  "Tempo",
  "Threshold",
  "VO2max",
  "Anaerobic",
  "Neuromuscular",
];
