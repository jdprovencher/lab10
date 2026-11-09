import { APP_ROOT } from "./env";
import express, { type ErrorRequestHandler } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { HealthInfo, ImageResult } from "../shared/types";
import { HttpError } from "./errors";
import { generateWeatherImage } from "./openrouter";
import { buildImagePrompt } from "./prompt";
import {
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  getWeather,
} from "./weather";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

function coordinate(
  value: unknown,
  fallback: number,
  name: "lat" | "lon",
): number {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `${name} must be a number.`);
  }
  if (name === "lat" && (parsed < -90 || parsed > 90)) {
    throw new HttpError(400, "Latitude must be between -90 and 90.");
  }
  if (name === "lon" && (parsed < -180 || parsed > 180)) {
    throw new HttpError(400, "Longitude must be between -180 and 180.");
  }
  return parsed;
}

app.get("/api/health", (_request, response) => {
  const health: HealthInfo = {
    ok: true,
    hasKey: Boolean(process.env.OPENROUTER_API_KEY),
    model: process.env.IMAGE_MODEL ?? "qwen/qwen-image-2.1-turbo",
    defaultLocation: { lat: DEFAULT_LATITUDE, lon: DEFAULT_LONGITUDE },
  };
  response.json(health);
});

app.get("/api/weather", async (request, response) => {
  const lat = coordinate(request.query.lat, DEFAULT_LATITUDE, "lat");
  const lon = coordinate(request.query.lon, DEFAULT_LONGITUDE, "lon");
  response.json(await getWeather(lat, lon));
});

app.post("/api/image", async (request, response) => {
  const body = request.body as
    | { lat?: unknown; lon?: unknown }
    | undefined;
  const lat = coordinate(body?.lat, DEFAULT_LATITUDE, "lat");
  const lon = coordinate(body?.lon, DEFAULT_LONGITUDE, "lon");

  const weather = await getWeather(lat, lon);
  const prompt = buildImagePrompt(weather);
  const generated = await generateWeatherImage(
    prompt,
    join(APP_ROOT, "public", "reference.jpg"),
  );

  const result: ImageResult = {
    image: generated.dataUrl,
    mediaType: generated.mediaType,
    prompt,
    model: generated.model,
    elapsedMs: generated.elapsedMs,
    cost: generated.cost,
    generatedAt: new Date().toISOString(),
    weather,
  };
  response.json(result);
});

// In production serve the Vite build from the same origin.
const distDir = join(APP_ROOT, "dist");
if (process.env.NODE_ENV === "production" && existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.sendFile(join(distDir, "index.html"));
  });
}

const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const status = error instanceof HttpError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Unexpected server error.";
  if (status >= 500) {
    console.error(`[${request.method} ${request.originalUrl}]`, error);
  }
  response.status(status).json({ error: message });
};
app.use(errorHandler);

const port = Number.parseInt(process.env.PORT ?? "3001", 10) || 3001;
app.listen(port, () => {
  console.log(`Weather Mood API listening on http://localhost:${port}`);
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn(
      "OPENROUTER_API_KEY is not set - image generation will fail until it is configured.",
    );
  }
});
