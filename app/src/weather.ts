import type {
  Season,
  TimeOfDay,
  WeatherSnapshot,
} from "../shared/types";

export interface CurrentConditions {
  temperatureF: number | null;
  temperatureC: number | null;
  feelsLikeF: number | null;
  description: string;
  humidity: number | null;
  windSpeedMph: number | null;
  windDirection: string | null;
  dewpointF: number | null;
  pressureInHg: number | null;
  observedAt: string;
  station: string | null;
  stationName: string | null;
  fromObservation: boolean;
}

export function currentConditions(weather: WeatherSnapshot): CurrentConditions {
  const observation = weather.observation;
  const first = weather.forecast[0];

  if (observation) {
    return {
      temperatureF: observation.temperatureF,
      temperatureC: observation.temperatureC,
      feelsLikeF: observation.feelsLikeF,
      description: observation.description,
      humidity: observation.humidity,
      windSpeedMph: observation.windSpeedMph,
      windDirection: observation.windDirection,
      dewpointF: observation.dewpointF,
      pressureInHg: observation.pressureInHg,
      observedAt: observation.observedAt,
      station: observation.station,
      stationName: observation.stationName,
      fromObservation: true,
    };
  }

  return {
    temperatureF: first?.temperature ?? null,
    temperatureC: null,
    feelsLikeF: null,
    description: first?.shortForecast ?? "Conditions unavailable",
    humidity: null,
    windSpeedMph: null,
    windDirection: first?.windDirection ?? null,
    dewpointF: null,
    pressureInHg: null,
    observedAt: weather.fetchedAt,
    station: null,
    stationName: null,
    fromObservation: false,
  };
}

export function todayHighLow(weather: WeatherSnapshot): {
  high: number | null;
  low: number | null;
} {
  const daytime = weather.forecast.find((period) => period.isDaytime);
  const nighttime = weather.forecast.find((period) => !period.isDaytime);
  return {
    high: daytime?.temperature ?? null,
    low: nighttime?.temperature ?? null,
  };
}

export function weatherEmoji(description: string, isDaytime = true): string {
  const value = description.toLowerCase();
  if (/thunder|t-storm|lightning/.test(value)) return "\u26c8\ufe0f";
  if (/snow|flurr|blizzard|sleet|freezing/.test(value)) return "\u2744\ufe0f";
  if (/rain|shower|drizzle/.test(value)) return "\ud83c\udf27\ufe0f";
  if (/fog|mist|haze/.test(value)) return "\ud83c\udf2b\ufe0f";
  if (/wind/.test(value)) return "\ud83d\udca8";
  if (/partly/.test(value)) return isDaytime ? "\u26c5" : "\u2601\ufe0f";
  if (/mostly clear|mostly sunny/.test(value)) {
    return isDaytime ? "\ud83c\udf24\ufe0f" : "\ud83c\udf19";
  }
  if (/cloud|overcast/.test(value)) return "\u2601\ufe0f";
  if (/clear|sunny/.test(value)) return isDaytime ? "\u2600\ufe0f" : "\ud83c\udf19";
  return isDaytime ? "\ud83c\udf24\ufe0f" : "\ud83c\udf19";
}

export function timeOfDayIcon(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case "dawn":
      return "\ud83c\udf05";
    case "morning":
      return "\ud83c\udf24\ufe0f";
    case "midday":
      return "\u2600\ufe0f";
    case "afternoon":
      return "\ud83c\udf24\ufe0f";
    case "evening":
      return "\ud83c\udf07";
    case "night":
      return "\ud83c\udf19";
  }
}

export function seasonIcon(season: Season): string {
  switch (season) {
    case "winter":
      return "\u2744\ufe0f";
    case "spring":
      return "\ud83c\udf31";
    case "summer":
      return "\u2600\ufe0f";
    case "autumn":
      return "\ud83c\udf42";
  }
}

export function skyGradient(weather: WeatherSnapshot | null): string {
  if (!weather) {
    return "linear-gradient(155deg, #07111f 0%, #0e1e35 50%, #060a12 100%)";
  }

  const description = (
    weather.observation?.description ??
    weather.forecast[0]?.shortForecast ??
    ""
  ).toLowerCase();

  if (/rain|shower|drizzle|thunder|storm/.test(description)) {
    return "linear-gradient(155deg, #0b1520 0%, #1d3142 45%, #0a111a 100%)";
  }
  if (/snow|flurr|blizzard|sleet/.test(description)) {
    return "linear-gradient(155deg, #101c2e 0%, #33506b 48%, #131f30 100%)";
  }
  if (/fog|mist|haze/.test(description)) {
    return "linear-gradient(155deg, #1a2430 0%, #45525e 50%, #101820 100%)";
  }

  switch (weather.local.timeOfDay) {
    case "dawn":
      return "linear-gradient(155deg, #171a38 0%, #5b4777 42%, #e39a6f 100%)";
    case "morning":
      return "linear-gradient(155deg, #0a2338 0%, #1a5a7a 52%, #8dc4d8 100%)";
    case "midday":
      return "linear-gradient(155deg, #0a2f6b 0%, #1478bd 50%, #76c8e8 100%)";
    case "afternoon":
      return "linear-gradient(155deg, #0e2f50 0%, #2a6b94 50%, #d5a06b 100%)";
    case "evening":
      return "linear-gradient(155deg, #191a3d 0%, #743d61 45%, #eaa25c 100%)";
    case "night":
      return "linear-gradient(155deg, #03050c 0%, #0b1426 55%, #172743 100%)";
  }
}

export function formatTime(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "\u2014";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function windLabel(
  speed: number | null,
  direction: string | null,
): string {
  if (speed == null) return "\u2014";
  return `${speed} mph${direction ? ` ${direction}` : ""}`;
}
