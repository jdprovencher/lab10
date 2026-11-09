import { useEffect, useState, type FormEvent } from "react";

interface LocationBarProps {
  latitude: number;
  longitude: number;
  busy: boolean;
  onApply: (lat: number, lon: number) => void;
}

export function LocationBar({
  latitude,
  longitude,
  busy,
  onApply,
}: LocationBarProps) {
  const [latDraft, setLatDraft] = useState(latitude.toFixed(4));
  const [lonDraft, setLonDraft] = useState(longitude.toFixed(4));

  useEffect(() => {
    setLatDraft(latitude.toFixed(4));
    setLonDraft(longitude.toFixed(4));
  }, [latitude, longitude]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (latDraft.trim() === "" || lonDraft.trim() === "") return;
    const lat = Number(latDraft);
    const lon = Number(lonDraft);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    onApply(clamp(lat, -90, 90), clamp(lon, -180, 180));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        onApply(position.coords.latitude, position.coords.longitude),
      () => alert("Could not read your location. Enter coordinates manually."),
      { timeout: 10_000 },
    );
  };

  return (
    <form className="location-bar" onSubmit={submit}>
      <span className="location-bar__label">Location</span>
      <label className="location-bar__field">
        <span>Lat</span>
        <input
          value={latDraft}
          onChange={(event) => setLatDraft(event.target.value)}
          inputMode="decimal"
          aria-label="Latitude"
        />
      </label>
      <label className="location-bar__field">
        <span>Lon</span>
        <input
          value={lonDraft}
          onChange={(event) => setLonDraft(event.target.value)}
          inputMode="decimal"
          aria-label="Longitude"
        />
      </label>
      <button className="btn btn--small" type="submit" disabled={busy}>
        {busy ? "Loading…" : "Update"}
      </button>
      <button
        className="btn btn--small btn--ghost"
        type="button"
        onClick={useMyLocation}
        disabled={busy}
      >
        My location
      </button>
    </form>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
