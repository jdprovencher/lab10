import type { WeatherSnapshot } from "../../shared/types";
import { weatherEmoji } from "../weather";

export function ForecastStrip({ weather }: { weather: WeatherSnapshot }) {
  const periods = weather.forecast.slice(0, 8);

  return (
    <section className="forecast-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Upcoming</p>
          <h2>Forecast</h2>
        </div>
        <p className="muted">
          weather.gov · grid {weather.location.grid}
        </p>
      </div>

      <div className="forecast-grid">
        {periods.map((period, index) => (
          <article
            className={`forecast-card ${
              index === 0 ? "forecast-card--now" : ""
            }`}
            key={`${period.name}-${period.startTime}`}
          >
            <div className="forecast-card__top">
              <span className="forecast-card__name">{period.name}</span>
              <span className="forecast-card__emoji" aria-hidden="true">
                {weatherEmoji(period.shortForecast, period.isDaytime)}
              </span>
            </div>
            <strong className="forecast-card__temp">
              {period.temperature}°{period.temperatureUnit}
            </strong>
            <p className="forecast-card__desc">{period.shortForecast}</p>
            <p className="forecast-card__wind">
              {period.windDirection} {period.windSpeed}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
