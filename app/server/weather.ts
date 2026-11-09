import type {
  CloudLayer,
  ForecastPeriod,
  LocalTimeInfo,
  Observation,
  WeatherSnapshot,
} from "../shared/types";
import { HttpError } from "./errors";
import {
  classifyTimeOfDay,
  formatLocalTime,
  getLocalMinutes,
  getLocalParts,
  getSeasonInfo,
  getSunTimes,
  timeOfDayLabel,
} from "./time";

export const DEFAULT_LATITUDE = 43.7589;
export const DEFAULT_LONGITUDE = -71.6892;

const POINTS_TTL = 12 * 60 * 60 * 1000;
const FORECAST_TTL = 10 * 60 * 1000;
const STATIONS_TTL = 12 * 60 * 60 * 1000;
const OBSERVATION_TTL = 5 * 60 * 1000;

interface StationProperties {
  stationIdentifier: string;
  name: string;
}

interface PointsResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    observationStations: string;
    relativeLocation: {
      properties: { city: string; state: string };
    };
    timeZone: string;
  };
}

interface StationsResponse {
  features: Array<{ properties: StationProperties }>;
}

interface ObservationResponse {
  properties: {
    timestamp: string;
    textDescription: string | null;
    temperature: { value: number | null };
    dewpoint: { value: number | null };
    relativeHumidity: { value: number | null };
    windSpeed: { value: number | null };
    windDirection: { value: number | null };
    windChill: { value: number | null };
    heatIndex: { value: number | null };
    barometricPressure: { value: number | null };
    cloudLayers: Array<{
      amount: string;
      base: { value: number | null };
    }> | null;
    icon: string | null;
  };
}

interface ForecastResponse {
  properties: {
    periods: Array<{
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
      icon: string;
    }>;
  };
}

const cache = new Map<string, { expires: number; value: unknown }>();

async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const value = await load();
  cache.set(key, { expires: Date.now() + ttlMs, value });
  if (cache.size > 200) {
    for (const [entryKey, entry] of cache) {
      if (entry.expires <= Date.now()) cache.delete(entryKey);
    }
  }
  return value;
}

function userAgent(): string {
  return (
    process.env.WEATHER_USER_AGENT ??
    "cs2010-weather-mood/1.0 (student@example.com)"
  );
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": userAgent(),
        Accept: "application/geo+json",
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error(`weather.gov request failed: ${url}`, error);
    throw new HttpError(
      502,
      "Could not reach weather.gov. Check your network connection and try again.",
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`weather.gov ${response.status}: ${url}`, detail.slice(0, 300));
    if (response.status === 404) {
      throw new HttpError(
        404,
        "No weather data for this location. weather.gov only covers the United States.",
      );
    }
    throw new HttpError(
      502,
      `Weather service is unavailable (HTTP ${response.status}). Try again shortly.`,
    );
  }

  return (await response.json()) as T;
}

function toFahrenheit(celsius: number | null): number | null {
  return celsius == null ? null : Math.round((celsius * 9) / 5 + 32);
}

const COMPASS_POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

function compass(degrees: number | null): string | null {
  if (degrees == null) return null;
  const normalized = ((degrees % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 22.5) % 16];
}

function normalizeObservation(
  properties: ObservationResponse["properties"],
  station: StationProperties,
): Observation {
  const temperatureC = properties.temperature?.value ?? null;
  const feelsLikeC =
    properties.windChill?.value ?? properties.heatIndex?.value ?? null;
  const pressurePa = properties.barometricPressure?.value ?? null;

  const cloudLayers: CloudLayer[] = (properties.cloudLayers ?? []).map(
    (layer) => ({
      amount: layer.amount,
      baseM: layer.base?.value == null ? null : Math.round(layer.base.value),
    }),
  );

  return {
    station: station.stationIdentifier,
    stationName: station.name,
    observedAt: properties.timestamp,
    description: properties.textDescription ?? "Unknown conditions",
    temperatureF: toFahrenheit(temperatureC),
    temperatureC:
      temperatureC == null ? null : Math.round(temperatureC),
    feelsLikeF: toFahrenheit(feelsLikeC),
    dewpointF: toFahrenheit(properties.dewpoint?.value ?? null),
    humidity:
      properties.relativeHumidity?.value == null
        ? null
        : Math.round(properties.relativeHumidity.value),
    windSpeedMph:
      properties.windSpeed?.value == null
        ? null
        : Math.round(properties.windSpeed.value * 0.621371),
    windDirection: compass(properties.windDirection?.value ?? null),
    windDirectionDegrees:
      properties.windDirection?.value == null
        ? null
        : Math.round(properties.windDirection.value),
    pressureInHg:
      pressurePa == null
        ? null
        : Math.round(pressurePa * 0.0002953 * 100) / 100,
    cloudLayers,
    icon: properties.icon ?? null,
  };
}

async function loadObservation(
  stationsUrl: string,
  gridKey: string,
): Promise<Observation | null> {
  try {
    const stations = await cached(`stations:${gridKey}`, STATIONS_TTL, () =>
      getJson<StationsResponse>(stationsUrl),
    );

    for (const station of stations.features.slice(0, 3)) {
      const id = station.properties.stationIdentifier;
      try {
        const observation = await cached(
          `observation:${id}`,
          OBSERVATION_TTL,
          () =>
            getJson<ObservationResponse>(
              `https://api.weather.gov/stations/${id}/observations/latest`,
            ),
        );
        if (observation.properties.temperature?.value == null) continue;
        return normalizeObservation(observation.properties, station.properties);
      } catch (error) {
        console.warn(
          `Observation from ${id} unavailable:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  } catch (error) {
    console.warn(
      "Could not load observation stations:",
      error instanceof Error ? error.message : error,
    );
  }
  return null;
}

export async function getWeather(
  latitude = DEFAULT_LATITUDE,
  longitude = DEFAULT_LONGITUDE,
): Promise<WeatherSnapshot> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new HttpError(400, "Latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new HttpError(400, "Longitude must be between -180 and 180.");
  }

  const pointsUrl = `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const points = await cached(`points:${pointsUrl}`, POINTS_TTL, () =>
    getJson<PointsResponse>(pointsUrl),
  );
  const point = points.properties;
  const gridKey = `${point.gridId}/${point.gridX},${point.gridY}`;

  const [forecastResponse, observation] = await Promise.all([
    cached(`forecast:${gridKey}`, FORECAST_TTL, () =>
      getJson<ForecastResponse>(point.forecast),
    ),
    loadObservation(point.observationStations, gridKey),
  ]);

  const periods = forecastResponse.properties.periods ?? [];
  if (periods.length === 0) {
    throw new HttpError(502, "Weather service returned no forecast periods.");
  }

  const forecast: ForecastPeriod[] = periods.slice(0, 10).map((period) => ({
    name: period.name,
    startTime: period.startTime,
    endTime: period.endTime,
    isDaytime: period.isDaytime,
    temperature: period.temperature,
    temperatureUnit: period.temperatureUnit,
    windSpeed: period.windSpeed,
    windDirection: period.windDirection,
    shortForecast: period.shortForecast,
    detailedForecast: period.detailedForecast,
    icon: period.icon ?? null,
  }));

  const now = new Date();
  const localBase = getLocalParts(now, point.timeZone);
  const sun = getSunTimes({
    year: localBase.year,
    month: localBase.month,
    day: localBase.day,
    latitude,
    longitude,
    timeZone: point.timeZone,
  });
  const sunriseMinutes = sun.sunrise
    ? getLocalMinutes(sun.sunrise, point.timeZone)
    : null;
  const sunsetMinutes = sun.sunset
    ? getLocalMinutes(sun.sunset, point.timeZone)
    : null;
  const timeOfDay = classifyTimeOfDay({
    minutes: localBase.minutes,
    sunriseMinutes,
    sunsetMinutes,
    polar: sun.polar,
  });
  const season = getSeasonInfo(localBase.month);

  const local: LocalTimeInfo = {
    iso: now.toISOString(),
    timeZone: point.timeZone,
    dateLabel: localBase.dateLabel,
    timeLabel: localBase.timeLabel,
    hour: localBase.hour,
    minute: localBase.minute,
    timeOfDay,
    timeOfDayLabel: timeOfDayLabel(timeOfDay),
    sunrise: sun.sunrise?.toISOString() ?? null,
    sunset: sun.sunset?.toISOString() ?? null,
    sunriseLabel: sun.sunrise
      ? formatLocalTime(sun.sunrise, point.timeZone)
      : null,
    sunsetLabel: sun.sunset
      ? formatLocalTime(sun.sunset, point.timeZone)
      : null,
    season: season.season,
    seasonLabel: season.label,
  };

  return {
    location: {
      name: point.relativeLocation.properties.city,
      state: point.relativeLocation.properties.state,
      latitude,
      longitude,
      timeZone: point.timeZone,
      grid: `${point.gridId} ${point.gridX},${point.gridY}`,
    },
    fetchedAt: now.toISOString(),
    local,
    observation,
    forecast,
  };
}
