import { useEffect, useState } from "react";
import type { ImageResult, WeatherSnapshot } from "../../shared/types";
import { formatDateTime, seasonIcon, timeOfDayIcon } from "../weather";

const REFERENCE_IMAGE = "/reference.jpg";

const PROGRESS_MESSAGES = [
  "Reading the current weather…",
  "Choosing the light and season…",
  "Painting the sky…",
  "Adding weather and atmosphere…",
  "Finishing the scene…",
];

interface SceneCardProps {
  weather: WeatherSnapshot;
  image: ImageResult | null;
  generating: boolean;
  error: string | null;
  hasKey: boolean | null;
  onGenerate: () => void;
}

export function SceneCard({
  weather,
  image,
  generating,
  error,
  hasKey,
  onGenerate,
}: SceneCardProps) {
  const [split, setSplit] = useState(50);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!generating) {
      setMessageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % PROGRESS_MESSAGES.length);
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [generating]);

  const condition =
    weather.observation?.description ??
    weather.forecast[0]?.shortForecast ??
    "weather";

  return (
    <section className="card scene-card">
      <div className="scene-card__header">
        <div>
          <p className="eyebrow">Weather-matched scene</p>
          <h2>Your view, re-imagined</h2>
          <p className="muted">
            {timeOfDayIcon(weather.local.timeOfDay)}{" "}
            {weather.local.timeOfDayLabel} ·{" "}
            {seasonIcon(weather.local.season)} {weather.local.seasonLabel} ·{" "}
            {condition}
          </p>
        </div>
        <span className={`status-pill ${generating ? "status-pill--busy" : ""}`}>
          {generating ? "Generating" : image ? "Ready" : "Reference"}
        </span>
      </div>

      <div className={`scene-frame ${generating ? "scene-frame--busy" : ""}`}>
        <img
          className="scene-image"
          src={REFERENCE_IMAGE}
          alt="Reference scene: a New England farmhouse on a green hill"
        />

        {image && (
          <>
            <img
              className="scene-image scene-image--after"
              src={image.image}
              alt={`Weather-matched scene: ${weather.local.timeOfDayLabel}, ${weather.local.seasonLabel}, ${condition}`}
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div className="compare-labels" aria-hidden="true">
              <span>Reference</span>
              <span>Weather-matched</span>
            </div>
            <div
              className="compare-handle"
              style={{ left: `${split}%` }}
              aria-hidden="true"
            >
              <span>↔</span>
            </div>
            <input
              className="compare-range"
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(event) => setSplit(Number(event.target.value))}
              aria-label="Compare reference and weather-matched image"
            />
          </>
        )}

        {!image && !generating && (
          <div className="scene-placeholder">
            <span className="scene-placeholder__icon" aria-hidden="true">
              ✦
            </span>
            <p>Generate to see this scene under today's sky.</p>
            <p className="muted">
              The reference image is redrawn with the current time of day, time
              of year, and forecast.
            </p>
          </div>
        )}

        {generating && (
          <div className="scene-loading" role="status" aria-live="polite">
            <div className="spinner" />
            <p>{PROGRESS_MESSAGES[messageIndex]}</p>
            <span className="muted">Usually takes 15–30 seconds</span>
          </div>
        )}
      </div>

      {hasKey === false && (
        <div className="banner banner--warning">
          <strong>OPENROUTER_API_KEY is not set.</strong> Add it to{" "}
          <code>app/.env</code> or the repo-level <code>openrouter.env</code>,
          then restart the server.
        </div>
      )}

      {error && <div className="banner banner--error">{error}</div>}

      <div className="scene-actions">
        <button
          className="btn btn--primary"
          type="button"
          onClick={onGenerate}
          disabled={generating || hasKey === false}
        >
          {generating
            ? "Generating…"
            : image
              ? "Generate again"
              : "Generate weather scene"}
        </button>

        {image && (
          <>
            <a
              className="btn btn--ghost"
              href={image.image}
              download={`weather-${weather.location.name
                .toLowerCase()
                .replace(/\s+/g, "-")}.png`}
            >
              Download image
            </a>
            <p className="scene-meta">
              {image.model} · {(image.elapsedMs / 1000).toFixed(1)}s ·{" "}
              {formatDateTime(image.generatedAt, weather.local.timeZone)}
              {image.cost != null
                ? ` · $${image.cost.toFixed(4)}`
                : ""}
            </p>
          </>
        )}
      </div>

      {image && (
        <details className="prompt-details">
          <summary>View the prompt sent to the image model</summary>
          <pre>{image.prompt}</pre>
        </details>
      )}
    </section>
  );
}
