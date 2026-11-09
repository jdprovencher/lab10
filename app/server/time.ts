import type { Season, TimeOfDay } from "../shared/types";

const DAY_MS = 86_400_000;
const DEG = Math.PI / 180;

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
  monthName: string;
  timeZone: string;
  dateLabel: string;
  timeLabel: string;
  minutes: number;
}

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  polar: "day" | "night" | null;
}

function partsMap(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, ...options });
  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
}

export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const named = partsMap(date, timeZone, {
    weekday: "long",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const numeric = partsMap(date, timeZone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const clock = partsMap(date, timeZone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const hour = Number(named.hour);
  const minute = Number(named.minute);
  const second = Number(named.second);

  return {
    year: Number(numeric.year),
    month: Number(numeric.month),
    day: Number(numeric.day),
    hour,
    minute,
    second,
    weekday: named.weekday,
    monthName: named.month,
    timeZone,
    dateLabel: `${named.weekday}, ${named.month} ${numeric.day}, ${numeric.year}`,
    timeLabel: `${clock.hour}:${clock.minute} ${clock.dayPeriod ?? ""}`.trim(),
    minutes: hour * 60 + minute,
  };
}

export function formatLocalTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getLocalMinutes(date: Date, timeZone: string): number {
  const parts = partsMap(date, timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = partsMap(date, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a wall-clock time in `timeZone` to the corresponding UTC instant. */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = timeZoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

function fromJulian(julian: number): Date {
  return new Date((julian - 2440587.5) * DAY_MS);
}

/**
 * NOAA sunrise/sunset approximation (accurate to a minute or two at
 * mid-latitudes). Returns null times during polar day/night.
 */
export function getSunTimes(args: {
  year: number;
  month: number;
  day: number;
  latitude: number;
  longitude: number;
  timeZone: string;
}): SunTimes {
  const localNoon = zonedTimeToUtc(
    args.year,
    args.month,
    args.day,
    12,
    0,
    args.timeZone,
  );
  const julian = localNoon.getTime() / DAY_MS + 2440587.5;
  const n = Math.round(julian - 2451545.0 + 0.0008);
  const meanSolarTime = n - args.longitude / 360;
  const meanAnomaly = (357.5291 + 0.98560028 * meanSolarTime) % 360;
  const equationOfCenter =
    1.9148 * Math.sin(meanAnomaly * DEG) +
    0.02 * Math.sin(2 * meanAnomaly * DEG) +
    0.0003 * Math.sin(3 * meanAnomaly * DEG);
  const eclipticLongitude = (meanAnomaly + equationOfCenter + 180 + 102.9372) % 360;
  const solarTransit =
    2451545.0 +
    meanSolarTime +
    0.0053 * Math.sin(meanAnomaly * DEG) -
    0.0069 * Math.sin(2 * eclipticLongitude * DEG);
  const declination = Math.asin(
    Math.sin(eclipticLongitude * DEG) * Math.sin(23.4397 * DEG),
  );
  const cosHourAngle =
    (Math.sin(-0.83 * DEG) -
      Math.sin(args.latitude * DEG) * Math.sin(declination)) /
    (Math.cos(args.latitude * DEG) * Math.cos(declination));

  if (cosHourAngle < -1) return { sunrise: null, sunset: null, polar: "day" };
  if (cosHourAngle > 1) return { sunrise: null, sunset: null, polar: "night" };

  const hourAngle = Math.acos(cosHourAngle) / DEG;
  return {
    sunrise: fromJulian(solarTransit - hourAngle / 360),
    sunset: fromJulian(solarTransit + hourAngle / 360),
    polar: null,
  };
}

export function classifyTimeOfDay(args: {
  minutes: number;
  sunriseMinutes: number | null;
  sunsetMinutes: number | null;
  polar: "day" | "night" | null;
}): TimeOfDay {
  const { minutes, sunriseMinutes: rise, sunsetMinutes: set, polar } = args;

  if (polar === "night") return "night";

  if (rise == null || set == null) {
    if (minutes < 5 * 60) return "night";
    if (minutes < 11 * 60) return "morning";
    if (minutes < 14 * 60) return "midday";
    if (minutes < 17 * 60) return "afternoon";
    if (minutes < 20 * 60) return "evening";
    return "night";
  }

  if (minutes < rise - 60 || minutes >= set + 30) return "night";
  if (minutes < rise + 60) return "dawn";
  if (minutes >= set - 60) return "evening";
  if (minutes < 11 * 60) return "morning";
  if (minutes < 14 * 60) return "midday";
  return "afternoon";
}

const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  dawn: "Dawn",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export function timeOfDayLabel(timeOfDay: TimeOfDay): string {
  return TIME_OF_DAY_LABELS[timeOfDay];
}

const SEASON_BY_MONTH: Record<number, { season: Season; label: string }> = {
  1: { season: "winter", label: "deep winter" },
  2: { season: "winter", label: "late winter" },
  3: { season: "spring", label: "early spring" },
  4: { season: "spring", label: "mid spring" },
  5: { season: "spring", label: "late spring" },
  6: { season: "summer", label: "early summer" },
  7: { season: "summer", label: "high summer" },
  8: { season: "summer", label: "late summer" },
  9: { season: "autumn", label: "early autumn" },
  10: { season: "autumn", label: "mid autumn" },
  11: { season: "autumn", label: "late autumn" },
  12: { season: "winter", label: "early winter" },
};

export function getSeasonInfo(month: number): { season: Season; label: string } {
  return SEASON_BY_MONTH[month] ?? { season: "winter", label: "winter" };
}
