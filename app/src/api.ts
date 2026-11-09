import type {
  HealthInfo,
  ImageResult,
  WeatherSnapshot,
} from "../shared/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Fall through to the generic error below.
  }
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const response = await fetch(
    `/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    { signal },
  );
  return parseResponse<WeatherSnapshot>(response);
}

export async function fetchHealth(): Promise<HealthInfo> {
  const response = await fetch("/api/health");
  return parseResponse<HealthInfo>(response);
}

export async function generateWeatherImage(
  lat: number,
  lon: number,
): Promise<ImageResult> {
  const response = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon }),
  });
  return parseResponse<ImageResult>(response);
}
