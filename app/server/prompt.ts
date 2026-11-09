import type { Season, TimeOfDay, WeatherSnapshot } from "../shared/types";

interface Conditions {
  clear: boolean;
  partly: boolean;
  overcast: boolean;
  rain: boolean;
  snow: boolean;
  fog: boolean;
  storm: boolean;
  windy: boolean;
  chance: boolean;
}

function analyzeConditions(text: string): Conditions {
  const value = text.toLowerCase();
  const snow = /snow|flurr|blizzard|sleet|freezing/.test(value);
  const rain = /rain|shower|drizzle|thunderstorm|t-storm/.test(value) && !snow;
  const storm = /thunder|t-storm|lightning/.test(value);
  const fog = /fog|mist|haze/.test(value);
  const partly = /partly/.test(value) || /mostly (clear|sunny)/.test(value);
  const overcast = /overcast|mostly cloudy|cloudy/.test(value) && !/partly/.test(value);
  const clear =
    /clear|sunny/.test(value) && !/partly|mostly|cloud/.test(value);

  return {
    clear,
    partly,
    overcast,
    rain,
    snow,
    fog,
    storm,
    windy: /wind|breez|gust/.test(value),
    chance: /slight chance|chance of|chance |scattered|isolated/.test(value),
  };
}

function currentSummary(weather: WeatherSnapshot): string {
  const observation = weather.observation;
  if (observation) {
    const parts = [observation.description];
    if (observation.temperatureF != null) {
      const celsius =
        observation.temperatureC == null
          ? ""
          : ` (${observation.temperatureC}\u00b0C)`;
      parts.push(`${observation.temperatureF}\u00b0F${celsius}`);
    }
    if (observation.humidity != null) {
      parts.push(`${observation.humidity}% humidity`);
    }
    if (observation.windSpeedMph != null) {
      const direction = observation.windDirection
        ? ` ${observation.windDirection}`
        : "";
      parts.push(`${observation.windSpeedMph} mph wind${direction}`);
    }
    return parts.join(", ");
  }

  const period = weather.forecast[0];
  return `${period.shortForecast}, ${period.temperature}\u00b0${period.temperatureUnit}`;
}

function forecastSummary(weather: WeatherSnapshot): string {
  return weather.forecast
    .slice(0, 3)
    .map(
      (period) =>
        `${period.name}: ${period.shortForecast}, ${
          period.isDaytime ? "high" : "low"
        } ${period.temperature}\u00b0${period.temperatureUnit}`,
    )
    .join("; ");
}

function lightDirection(timeOfDay: TimeOfDay, cloudy: boolean): string {
  switch (timeOfDay) {
    case "dawn":
      return cloudy
        ? "soft, pale dawn light filtering through cloud"
        : "pink and gold dawn light, low mist, and long shadows";
    case "morning":
      return cloudy
        ? "cool, diffuse morning light"
        : "bright morning sunlight and long, crisp shadows";
    case "midday":
      return cloudy
        ? "flat, even midday light under a cloud layer"
        : "high midday sun and short, crisp shadows";
    case "afternoon":
      return cloudy
        ? "soft, muted afternoon light"
        : "warm afternoon sunlight and lengthening shadows";
    case "evening":
      return cloudy
        ? "dim blue-hour dusk under cloud"
        : "golden-hour sunset light, warm glow, and long shadows";
    case "night":
      return cloudy
        ? "a dark, overcast night with almost no moonlight"
        : "a deep night sky with the moon and stars and cool blue moonlight";
  }
}

const SEASON_DIRECTION: Record<Season, string> = {
  winter: "bare deciduous branches, dormant brown grass, and cold, low winter light",
  spring: "fresh green buds, blossoms, and newly thawed ground",
  summer: "lush, full green foliage and dense grass",
  autumn: "orange, red, and gold foliage with fallen leaves on the ground",
};

function temperatureDirection(temperatureF: number | null): string | null {
  if (temperatureF == null) return null;
  if (temperatureF <= 20) return "bitter cold with frost and visible breath";
  if (temperatureF <= 35) return "cold air with frost on the grass";
  if (temperatureF <= 50) return "cool air with a crisp chill";
  if (temperatureF >= 90) return "hot, hazy air with heat shimmer";
  if (temperatureF >= 75) return "warm, hazy summer air";
  return null;
}

function weatherCues(conditions: Conditions): string[] {
  if (conditions.storm) {
    return [
      conditions.chance
        ? "distant dark storm clouds with a few flashes of lightning"
        : "dramatic storm clouds with flashes of lightning in the distance",
    ];
  }
  if (conditions.snow) {
    return [
      conditions.chance
        ? "a few passing snow flurries and a light dusting of snow"
        : "steady snowfall with snow accumulating on the ground, roof, and branches",
    ];
  }
  if (conditions.rain) {
    return [
      conditions.chance
        ? "a few light rain showers, damp ground, and wet reflective surfaces under a mostly cloudy sky"
        : "falling rain, wet reflective surfaces, puddles, and rain-darkened ground",
    ];
  }
  if (conditions.fog) {
    return ["low fog, soft mist, and reduced visibility in the distance"];
  }
  if (conditions.overcast) {
    return ["a heavy overcast sky with flat, diffuse light"];
  }
  if (conditions.partly) {
    return ["scattered clouds with patches of blue sky"];
  }
  if (conditions.clear) {
    return ["a clear sky with crisp, direct sunlight"];
  }
  return [];
}

export function buildImagePrompt(weather: WeatherSnapshot): string {
  const current = currentSummary(weather);
  const upcoming = forecastSummary(weather);
  const conditions = analyzeConditions(
    `${weather.observation?.description ?? ""} ${weather.forecast
      .slice(0, 3)
      .map((period) => period.shortForecast)
      .join(" ")}`,
  );
  const cloudy =
    conditions.overcast ||
    conditions.rain ||
    conditions.snow ||
    conditions.fog ||
    conditions.storm;

  const cues = weatherCues(conditions);
  if (conditions.windy) {
    cues.push("trees, grass, and the fence weathering a steady wind");
  }

  const temperatureF =
    weather.observation?.temperatureF ?? weather.forecast[0]?.temperature ?? null;
  const temperatureCue = temperatureDirection(temperatureF);
  if (temperatureCue) cues.push(temperatureCue);

  if (
    weather.local.timeOfDay === "night" ||
    weather.local.timeOfDay === "evening"
  ) {
    cues.push("warm light glowing from the windows of the farmhouse");
  }

  cues.push(SEASON_DIRECTION[weather.local.season]);
  cues.push(lightDirection(weather.local.timeOfDay, cloudy));

  const sunset = weather.local.sunsetLabel
    ? `; sunset around ${weather.local.sunsetLabel}`
    : "";

  return [
    "Create a new photographic version of the reference image that accurately reflects the real weather described below.",
    "",
    "PRESERVE the composition, camera angle, framing, main subject, buildings, trees, fence, pond, hills, and overall layout of the reference image. Keep every object in the same place.",
    "CHANGE ONLY the sky, lighting, weather, ground cover, foliage, and atmosphere so the scene matches the conditions.",
    "",
    "Real-world context:",
    `- Location: ${weather.location.name}, ${weather.location.state}, USA (${weather.location.latitude.toFixed(4)}, ${weather.location.longitude.toFixed(4)})`,
    `- Local time: ${weather.local.dateLabel} at ${weather.local.timeLabel} (${weather.local.timeZone})`,
    `- Time of day: ${weather.local.timeOfDayLabel}${sunset}`,
    `- Time of year: ${weather.local.seasonLabel}`,
    `- Current conditions: ${current}`,
    `- Forecast: ${upcoming}`,
    "",
    `Visual direction: ${cues.join("; ")}.`,
    "",
    "Make the result photorealistic, with natural, believable detail and the same photographic style as the reference. Do not add text, captions, watermarks, borders, or new objects. The weather and season must be obvious at a glance.",
  ].join("\n");
}
