import type { WeatherSnapshot } from "../../shared/types";
import {
  currentConditions,
  formatDateTime,
  formatTime,
  seasonIcon,
  timeOfDayIcon,
  todayHighLow,
  weatherEmoji,
  windLabel,
} from "../weather";

interface WeatherCardProps {
  weather: WeatherSnapshot;
  loading: boolean;
  onRefresh: () => void;
}

export function WeatherCard({
  weather,
  loading,
  onRefresh,
}: WeatherCardProps) {
  const current = currentConditions(weather);
  const { high, low } = todayHighLow(weather);
  const isDaytime = weather.local.timeOfDay !== "night";
  const emoji = weatherEmoji(current.description, isDaytime);
  const feelsLike =
    current.feelsLikeF != null &&
    current.temperatureF != null &&
    Math.abs(current.feelsLikeF - current.temperatureF) >= 2
      ? current.feelsLikeF
      : null;

  return (
    <section className="card weather-card">
      <div className="weather-card__top">
        <div>
          <p className="eyebrow">Current weather</p>
          <h2>
            {weather.location.name}, {weather.location.state}
          </h2>
          <p className="muted">
            {weather.local.dateLabel} · {weather.local.timeLabel} local
          </p>
        </div>
        <button
          className="icon-btn"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh weather"
          aria-label="Refresh weather"
        >
          <span className={loading ? "spin" : undefined}>↻</span>
        </button>
      </div>

      <div className="current">
        <div className="current__emoji" aria-hidden="true">
          {emoji}
        </div>
        <div className="current__temp">
          <span>{current.temperatureF != null ? `${current.temperatureF}°` : "—°"}</span>
          <small>{current.description}</small>
          {feelsLike != null && (
            <small className="muted">Feels like {feelsLike}°</small>
          )}
          <small className="muted">
            High {high ?? "—"}° · Low {low ?? "—"}°
          </small>
        </div>
      </div>

      <div className="badges">
        <span className="badge">
          {timeOfDayIcon(weather.local.timeOfDay)} {weather.local.timeOfDayLabel}
        </span>
        <span className="badge">
          {seasonIcon(weather.local.season)} {weather.local.seasonLabel}
        </span>
        <span className="badge badge--live">
          <span className="live-dot" /> Live
        </span>
      </div>

      <div className="stats-grid">
        <Stat
          label="Humidity"
          value={current.humidity != null ? `${current.humidity}%` : "—"}
        />
        <Stat label="Wind" value={windLabel(current.windSpeedMph, current.windDirection)} />
        <Stat
          label="Dew point"
          value={current.dewpointF != null ? `${current.dewpointF}°F` : "—"}
        />
        <Stat
          label="Pressure"
          value={
            current.pressureInHg != null
              ? `${current.pressureInHg.toFixed(2)} inHg`
              : "—"
          }
        />
      </div>

      <div className="sun-row">
        <div>
          <span className="stat__label">Sunrise</span>
          <strong>{weather.local.sunriseLabel ?? "—"}</strong>
        </div>
        <div>
          <span className="stat__label">Sunset</span>
          <strong>{weather.local.sunsetLabel ?? "—"}</strong>
        </div>
        <div>
          <span className="stat__label">Observed</span>
          <strong>{formatTime(current.observedAt, weather.local.timeZone)}</strong>
        </div>
      </div>

      <p className="meta">
        {current.fromObservation
          ? `${current.stationName ?? "Nearest station"}${
              current.station ? ` (${current.station})` : ""
            } · ${formatDateTime(current.observedAt, weather.local.timeZone)}`
          : `Based on the latest forecast · ${formatDateTime(
              weather.fetchedAt,
              weather.local.timeZone,
            )}`}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
    </div>
  );
}
