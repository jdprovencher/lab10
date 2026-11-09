# Weather Mood

A small Express + Vite/React app for CS2010 Lab 10. It pulls live weather from
[weather.gov](https://www.weather.gov/documentation/services-web-api) and asks an
image model to redraw a reference scene to match the **time of day**, **time of
year**, and **forecast**.

![Reference scene](public/reference.jpg)

## What it does

1. Fetches the latest observation + forecast for a latitude/longitude
   (defaults to Plymouth, NH: `43.7589, -71.6892`).
2. Computes the local time zone, sunrise/sunset, time-of-day bucket
   (dawn / morning / midday / afternoon / evening / night), and season
   (early spring, late autumn, deep winter, …).
3. Builds a detailed prompt from those details.
4. Sends the prompt plus `public/reference.jpg` to OpenRouter's Image API using
   `qwen/qwen-image-2.1-turbo`.
5. Shows the result in a before/after slider, with a download button and the
   exact prompt used.

## Setup

From this `app/` directory:

```bash
npm install
```

Set an OpenRouter key in either place:

- `app/.env`
  ```bash
  OPENROUTER_API_KEY=sk-or-v1-...
  ```
- or the repo-level `../openrouter.env` (already used by the other lab scripts)
  ```bash
  export OPENROUTER_API_KEY=sk-or-v1-...
  ```

The server loads `app/.env` first, then `../openrouter.env`. Existing environment
variables win.

## Run

Development (Vite on <http://localhost:5173>, API on port 3001, proxied):

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Then open <http://localhost:3001>.

Other scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run preview     # preview the built frontend only
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | — | Required for image generation |
| `IMAGE_MODEL` | `qwen/qwen-image-2.1-turbo` | OpenRouter image model |
| `PORT` | `3001` | Express port |
| `WEATHER_USER_AGENT` | `cs2010-weather-mood/1.0 (student@example.com)` | weather.gov requires a descriptive User-Agent; set your own contact |
| `OPENROUTER_SITE_URL` | `http://localhost:5173` | Sent as `HTTP-Referer` |

Each image generation costs about **$0.02** and takes **15–30 seconds**.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Key presence + default location |
| `GET` | `/api/weather?lat=&lon=` | Normalized current observation + forecast |
| `POST` | `/api/image` | Body `{ "lat": 43.7589, "lon": -71.6892 }`; generates the scene |

The OpenRouter key never reaches the browser; the Express server reads the
reference image and makes the API call.

## Structure

```
app/
  server/
    index.ts       Express routes + static production serving
    weather.ts     weather.gov client, caching, normalization
    time.ts        sunrise/sunset, time-of-day and season
    prompt.ts      image prompt built from the weather snapshot
    openrouter.ts  OpenRouter Image API client
    env.ts         loads app/.env or ../openrouter.env
  shared/
    types.ts       types shared by server and client
  src/
    App.tsx        page state + layout
    components/    LocationBar, WeatherCard, ForecastStrip, SceneCard
    weather.ts     display helpers + sky gradients
    api.ts         browser API calls
  public/
    reference.jpg  base scene (generated with Qwen Image 2.1 Turbo)
```

## Notes

- weather.gov only covers the United States.
- Responses are cached in memory: points/stations for 12 hours, forecasts for
  10 minutes, observations for 5 minutes.
- To use your own base image, replace `public/reference.jpg` with a 16:9 JPEG.
  The prompt assumes a landscape with a main subject, buildings, trees, and
  terrain.
- The reference image was generated for this lab with the same Qwen image model.
