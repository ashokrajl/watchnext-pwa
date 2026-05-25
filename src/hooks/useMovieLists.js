import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { CLIENT_ID_KEY, STORAGE_KEY } from '../constants';

function generateClientId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getOrCreateClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = generateClientId();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

async function loadFromSupabase(clientId) {
  const { data, error } = await supabase
    .from('movie_lists')
    .select('seen, rejected, to_watch')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveToSupabase(clientId, seenSet, rejectedSet, toWatchMovies) {
  const { error } = await supabase.from('movie_lists').upsert(
    {
      client_id: clientId,
      seen: [...seenSet],
      rejected: [...rejectedSet],
      to_watch: toWatchMovies,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  );
  if (error) throw error;
}

export function useMovieLists({ setError }) {
  const [seen, setSeen] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());
  const [toWatch, setToWatch] = useState([]);
  const [clientId] = useState(() => getOrCreateClientId());

  const persistMovieLists = useCallback(
    async (seenSet, rejectedSet, toWatchMovies) => {
      // Write to localStorage immediately (works offline)
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            seen: [...seenSet],
            rejected: [...rejectedSet],
            toWatch: toWatchMovies,
          })
        );
      } catch (e) {
        setError(`Failed to save movie lists: ${String(e?.message || e)}`);
      }

      // Sync to Supabase in the background; failures are non-fatal
      if (supabase && clientId) {
        saveToSupabase(clientId, seenSet, rejectedSet, toWatchMovies).catch((e) =>
          console.warn('Supabase sync failed:', e?.message || e)
        );
      }
    },
    [setError, clientId]
  );

  useEffect(() => {
    (async () => {
      // Prefer Supabase; fall back to localStorage if unavailable or offline
      if (supabase) {
        try {
          const remote = await loadFromSupabase(clientId);
          if (remote) {
            setSeen(new Set(remote.seen || []));
            setRejected(new Set(remote.rejected || []));
            setToWatch(Array.isArray(remote.to_watch) ? remote.to_watch : []);
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                seen: remote.seen || [],
                rejected: remote.rejected || [],
                toWatch: remote.to_watch || [],
              })
            );
            return;
          }
        } catch (e) {
          console.warn('Supabase load failed, using local cache:', e?.message || e);
        }
      }

      // localStorage fallback
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSeen(new Set(parsed));
        } else {
          setSeen(new Set(parsed?.seen || []));
          setRejected(new Set(parsed?.rejected || []));
          setToWatch(Array.isArray(parsed?.toWatch) ? parsed.toWatch : []);
        }
      } catch (e) {
        setError(`Failed to load movie lists: ${String(e?.message || e)}`);
      }
    })();
  }, [clientId, setError]);

  const markSeen = async (movieId) => {
    const nextSeen = new Set(seen);
    const nextRejected = new Set(rejected);
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    nextSeen.add(movieId);
    nextRejected.delete(movieId);
    setSeen(nextSeen);
    setRejected(nextRejected);
    setToWatch(nextToWatch);
    await persistMovieLists(nextSeen, nextRejected, nextToWatch);
  };

  const markRejected = async (movieId) => {
    const nextSeen = new Set(seen);
    const nextRejected = new Set(rejected);
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    nextRejected.add(movieId);
    nextSeen.delete(movieId);
    setSeen(nextSeen);
    setRejected(nextRejected);
    setToWatch(nextToWatch);
    await persistMovieLists(nextSeen, nextRejected, nextToWatch);
  };

  const addToWatch = async (movie) => {
    if (toWatch.some((existing) => existing.id === movie.id)) return;
    const nextToWatch = [movie, ...toWatch];
    setToWatch(nextToWatch);
    await persistMovieLists(seen, rejected, nextToWatch);
  };

  const removeFromToWatch = async (movieId) => {
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    setToWatch(nextToWatch);
    await persistMovieLists(seen, rejected, nextToWatch);
  };

  const clearSeen = () => {
    if (!window.confirm('Clear hidden movies? This will make both seen and rejected movies visible again.')) return;
    const nextSeen = new Set();
    const nextRejected = new Set();
    setSeen(nextSeen);
    setRejected(nextRejected);
    persistMovieLists(nextSeen, nextRejected, toWatch);
  };

  return {
    seen,
    rejected,
    toWatch,
    markSeen,
    markRejected,
    addToWatch,
    removeFromToWatch,
    clearSeen,
  };
}
