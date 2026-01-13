export interface AthleteProfile {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  weight: number | null;
  profile_medium: string;
  profile: string;
  friend: boolean | null;
  follower: boolean | null;
}

export interface AthleteStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: ActivityTotals;
  recent_run_totals: ActivityTotals;
  recent_swim_totals: ActivityTotals;
  ytd_ride_totals: ActivityTotals;
  ytd_run_totals: ActivityTotals;
  ytd_swim_totals: ActivityTotals;
  all_ride_totals: ActivityTotals;
  all_run_totals: ActivityTotals;
  all_swim_totals: ActivityTotals;
}

export interface ActivityTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
}

export interface ActivitySummary {
  id: number;
  external_id: string;
  upload_id: number;
  athlete: { id: number; resource_state: number };
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  elev_high: number;
  elev_low: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  location_city: string;
  location_state: string;
  location_country: string;
  start_latlng: [number, number];
  end_latlng: [number, number];
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline: string;
    polyline: string;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  flagged: boolean;
  workout_type: number | null;
  average_speed: number;
  max_speed: number;
  average_cadence: number;
  average_watts: number;
  weighted_average_watts: number;
  kilojoules: number;
  device_watts: boolean;
  average_heartrate: number;
  max_heartrate: number;
  resource_state: number;
}

export interface ActivityDetail extends ActivitySummary {
  description: string;
  calories: number;
  splits_metric: Split[];
  splits_standard: Split[];
  laps: Lap[];
  gear: Gear;
  partner_brand_tag: string | null;
  photos: Photo[];
  similar_activities: SimilarActivity[];
  available_zones: string[];
}

export interface Split {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  average_grade_adjusted_speed: number;
  average_heartrate: number;
  keywords: string[];
}

export interface Lap {
  id: number;
  activity: { id: number };
  athlete: { id: number };
  average_cadence: number;
  average_speed: number;
  distance: number;
  elapsed_time: number;
  start_index: number;
  end_index: number;
  lap_index: number;
  moving_time: number;
  name: string;
  pace_zone: number;
  split: number;
  start_date: string;
  start_date_local: string;
  total_elevation_gain: number;
  average_heartrate: number;
  max_heartrate: number;
  resource_state: number;
}

export interface Gear {
  id: string;
  resource_state: number;
  name: string;
  distance: number;
  primary: boolean;
}

export interface Photo {
  id: number;
  resource_state: number;
  ref: string;
  uid: string;
  caption: string;
  type: string;
  source: number;
  urls: Record<string, string>;
  created_at: string;
  created_at_local: string;
}

export interface SimilarActivity {
  id: number;
  name: string;
  type: string;
  athlete_count: number;
  average_speed: number;
  distance: number;
  elapsed_time: number;
  elevation_gain: number;
  effort_count: number;
  frequency: number;
  kilojoules: number;
  max_speed: number;
  moving_time: number;
  pr_time: number;
  resource_state: number;
  starred_count: number;
  total_elevation_gain: number;
}

export interface AthleteZones {
  heart_rate?: HeartRateZones;
  power?: PowerZones;
}

export interface HeartRateZones {
  custom_zones: boolean;
  zones: Zone[];
}

export interface PowerZones {
  zones: Zone[];
}

export interface Zone {
  min: number;
  max: number;
}
