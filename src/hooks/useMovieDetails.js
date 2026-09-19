import { useCallback, useEffect, useState } from 'react';

import { API_BASE } from '../constants';

// Module-level cache: details survive across modal open/close.
const detailCache = new Map();

async function fetchDetail(id) {
  if (detailCache.has(id)) return detailCache.get(id);
  const res = await fetch(`${API_BASE}?mode=detail&id=${encodeURIComponent(id)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load movie details.');
  detailCache.set(id, data);
  return data;
}

export function useMovieDetails(movieId) {
  const [detail, setDetail] = useState(() =>
    movieId && detailCache.has(movieId) ? detailCache.get(movieId) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!movieId) return;
    if (detailCache.has(movieId)) {
      setDetail(detailCache.get(movieId));
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchDetail(movieId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e?.message || e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, reloadKey]);

  const reload = useCallback(() => {
    if (movieId) detailCache.delete(movieId);
    setDetail(null);
    setReloadKey((k) => k + 1);
  }, [movieId]);

  return { detail, loading, error, reload };
}

// First YouTube trailer, falling back to any YouTube video.
export function getTrailerKey(detail) {
  const videos = detail?.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find((v) => v.site === 'YouTube');
  return trailer?.key || null;
}

export function getCast(detail, limit = 12) {
  return (detail?.credits?.cast || []).slice(0, limit);
}

// Watch providers for a region, grouped for display.
export function getProviders(detail, region = 'US') {
  const entry = detail?.['watch/providers']?.results?.[region];
  if (!entry) return null;
  const groups = [];
  if (entry.flatrate?.length) groups.push({ label: 'Stream', providers: entry.flatrate });
  if (entry.rent?.length) groups.push({ label: 'Rent', providers: entry.rent });
  if (entry.buy?.length) groups.push({ label: 'Buy', providers: entry.buy });
  return groups.length ? groups : null;
}

export function formatRuntime(minutes) {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
