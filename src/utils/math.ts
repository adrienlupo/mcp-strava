export function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export interface MinMaxAvg {
  min: number;
  max: number;
  avg: number;
}

export function minMaxAvg(arr: number[]): MinMaxAvg | null {
  const filtered = arr.filter((x) => x > 0);
  if (filtered.length === 0) return null;
  return {
    min: Math.min(...filtered),
    max: Math.max(...filtered),
    avg: Math.round(avg(filtered)),
  };
}

export interface ElevationDelta {
  gain: number;
  loss: number;
}

export function elevationDelta(altitude: number[]): ElevationDelta {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < altitude.length; i++) {
    const diff = altitude[i] - altitude[i - 1];
    if (diff > 0) gain += diff;
    else loss -= diff;
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
}

export function velocityToPace(velocityKph: number): string {
  if (velocityKph <= 0) return "-";
  const paceMinPerKm = 60 / velocityKph;
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function calculateNormalizedPower(powerData: number[]): number {
  if (powerData.length < 30) return 0;

  const windowSize = 30;
  const movingAvg: number[] = [];

  for (let i = windowSize - 1; i < powerData.length; i++) {
    const window = powerData.slice(i - windowSize + 1, i + 1);
    movingAvg.push(Math.pow(avg(window), 4));
  }

  return Math.round(Math.pow(avg(movingAvg), 0.25));
}
