import { useCallback, useEffect, useRef, useState } from "react";
import type { HealthInfo, ImageResult, WeatherSnapshot } from "../shared/types";
import { fetchHealth, fetchWeather, generateWeatherImage } from "./api";
import { ForecastStrip } from "./components/ForecastStrip";
import { LocationBar } from "./components/LocationBar";
import { SceneCard } from "./components/SceneCard";
import { WeatherCard } from "./components/WeatherCard";
import { skyGradient } from "./weather";

const DEFAULT_LOCATION = { lat: 43.7589, lon: -71.6892 };

export default function App() {
  const [coordinates, setCoordinates] = useState(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [image, setImage] = useState<ImageResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadWeather = useCallback(async (lat: number, lon: number) => {
    const id = ++requestId.current;
    setLoading(true);
    setWeatherError(null);
    setImage(null);
    setImageError(null);

    try {
      const snapshot = await fetchWeather(lat, lon);
      if (id === requestId.current) setWeather(snapshot);
    } catch (error) {
      if (id === requestId.current) {
        setWeatherError(
          error instanceof Error ? error.message : "Could not load the weather.",
        );
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
  }, [loadWeather]);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const applyLocation = (lat: number, lon: number) => {
    setCoordinates({ lat, lon });
    void loadWeather(lat, lon);
  };

  const refresh = () => {
    void loadWeather(coordinates.lat, coordinates.lon);
  };

  const generate = async () => {
    setGenerating(true);
    setImageError(null);
    try {
      const result = await generateWeatherImage(
        coordinates.lat,
        coordinates.lon,
      );
      setImage(result);
      setWeather(result.weather);
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Could not generate the image.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="app"
      style={{
        backgroundImage: skyGradient(weather),
      }}
    >
      <div className="app__veil" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            🌦️
          </div>
          <div>
            <h1>Weather Mood</h1>
            <p>Live weather, re-imagined</p>
          </div>
        </div>

        <LocationBar
          latitude={coordinates.lat}
          longitude={coordinates.lon}
          busy={loading}
          onApply={applyLocation}
        />
      </header>

      <main className="main">
        {weatherError && (
          <div className="banner banner--error">
            <strong>Weather unavailable.</strong> {weatherError}
          </div>
        )}

        {!weather && loading && <LoadingState />}

        {!weather && !loading && (
          <div className="loading-state">
            <p>No weather loaded yet.</p>
            <button className="btn btn--primary" type="button" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {weather && (
          <>
            <div className="hero">
              <WeatherCard
                weather={weather}
                loading={loading}
                onRefresh={refresh}
              />
              <SceneCard
                weather={weather}
                image={image}
                generating={generating}
                error={imageError}
                hasKey={health?.hasKey ?? null}
                onGenerate={() => void generate()}
              />
            </div>
            <ForecastStrip weather={weather} />
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Weather data from{" "}
          <a href="https://www.weather.gov/documentation/services-web-api">
            weather.gov
          </a>
          . Images by Qwen Image 2.1 Turbo via{" "}
          <a href="https://openrouter.ai">OpenRouter</a>.
        </p>
        <p>CS2010 · Lab 10 · {health == null ? "API status unknown" : health.hasKey ? "API ready" : "API key missing"}</p>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Reading the sky…</p>
    </div>
  );
}
