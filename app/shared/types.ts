export type TimeOfDay = "dawn" | "morning" | "midday" | "afternoon" | "evening" | "night";

export type Season = "winter" | "spring" | "summer" | "autumn";

export interface LocalTimeInfo {
  iso: string;
  timeZone: string;
  dateLabel: string;
  timeLabel: string;
  hour: number;
  minute: number;
  timeOfDay: TimeOfDay;
  timeOfDayLabel: string;
  sunrise: string | null;
  sunset: string | null;
  sunriseLabel: string | null;
  sunsetLabel: string | null;
  season: Season;
  seasonLabel: string;
}

export interface CloudLayer {
  amount: string;
  baseM: number | null;
}

export interface Observation {
  station: string;
  stationName: string;
  observedAt: string;
  description: string;
  temperatureF: number | null;
  temperatureC: number | null;
  feelsLikeF: number | null;
  dewpointF: number | null;
  humidity: number | null;
  windSpeedMph: number | null;
  windDirection: string | null;
  windDirectionDegrees: number | null;
  pressureInHg: number | null;
  cloudLayers: CloudLayer[];
  icon: string | null;
}

export interface ForecastPeriod {
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  icon: string | null;
}

export interface LocationInfo {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  grid: string;
}

export interface WeatherSnapshot {
  location: LocationInfo;
  fetchedAt: string;
  local: LocalTimeInfo;
  observation: Observation | null;
  forecast: ForecastPeriod[];
}

export interface ImageResult {
  image: string;
  mediaType: string;
  prompt: string;
  model: string;
  elapsedMs: number;
  cost: number | null;
  generatedAt: string;
  weather: WeatherSnapshot;
}

export interface HealthInfo {
  ok: boolean;
  hasKey: boolean;
  model: string;
  defaultLocation: { lat: number; lon: number };
}
