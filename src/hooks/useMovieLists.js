import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../lib/supabase';
import { CLIENT_ID_KEY, CLIENT_SECRET_KEY, STORAGE_KEY } from '../constants';

// Returned when the secure RPC functions don't exist yet (migration not applied).
const RPC_MISSING = 'RPC_MISSING';

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getOrCreate(key) {
  let value = null;
  try {
    value = localStorage.getItem(key);
  } catch {
    // storage unavailable — fall through and generate
  }
  if (!value) {
    value = randomId();
    try {
      localStorage.setItem(key, value);
    } catch {
      // non-fatal
    }
  }
  return value;
}

// Keep only the fields the To Watch screen needs — full TMDB payloads bloat the row.
function slimMovie(movie) {
  if (!movie) return movie;
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    overview: movie.overview,
    original_language: movie.original_language,
    genre_ids: movie.genre_ids,
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Very old format: just an array of seen ids.
      return { seen: parsed, rejected: [], toWatch: [], updatedAt: 0 };
    }
    return {
      seen: parsed?.seen || [],
      rejected: parsed?.rejected || [],
      toWatch: Array.isArray(parsed?.toWatch) ? parsed.toWatch : [],
      updatedAt: parsed?.updatedAt || 0,
    };
  } catch {
    return null;
  }
}

function writeLocal(seen, rejected, toWatch, updatedAt) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        seen: [...seen],
        rejected: [...rejected],
        toWatch,
        updatedAt,
      })
    );
  } catch {
    // quota exceeded — non-fatal, cloud copy still has the data
  }
}

// Merge two copies of the lists so offline changes are never lost:
// union of ids, "seen" wins a seen-vs-rejected conflict, to_watch unioned by id.
function mergeLists(local, remote) {
  const seen = new Set([...(local?.seen || []), ...(remote?.seen || [])]);
  const rejected = new Set([...(local?.rejected || []), ...(remote?.rejected || [])]);
  for (const id of seen) rejected.delete(id);
  const byId = new Map();
  for (const movie of [...(local?.toWatch || []), ...(remote?.toWatch || [])]) {
    if (movie && movie.id != null && !byId.has(movie.id) && !seen.has(movie.id)) {
      byId.set(movie.id, slimMovie(movie));
    }
  }
  return { seen, rejected, toWatch: [...byId.values()] };
}

function asRpcMissing(error) {
  const err = new Error('secure RPC functions not installed');
  err.code = RPC_MISSING;
  err.cause = error;
  return err;
}

// --- Secure path (after the 20260919 migration): per-row secret checked in Postgres ---

async function rpcLoad(clientId, secret) {
  const { data, error } = await supabase
    .rpc('get_movie_list', { p_client_id: clientId, p_secret: secret })
    .maybeSingle();
  if (error) {
    if (error.code === 'PGRST202') throw asRpcMissing(error);
    throw error;
  }
  if (!data) return null;
  return {
    seen: data.seen || [],
    rejected: data.rejected || [],
    toWatch: Array.isArray(data.to_watch) ? data.to_watch : [],
    updatedAt: data.updated_at ? Date.parse(data.updated_at) : 0,
  };
}

async function rpcSave(clientId, secret, seen, rejected, toWatch) {
  const { error } = await supabase.rpc('save_movie_list', {
    p_client_id: clientId,
    p_secret: secret,
    p_seen: [...seen],
    p_rejected: [...rejected],
    p_to_watch: toWatch,
  });
  if (error) {
    if (error.code === 'PGRST202') throw asRpcMissing(error);
    throw error;
  }
}

// --- Legacy path (before the migration is applied): direct table access ---

async function legacyLoad(clientId) {
  const { data, error } = await supabase
    .from('movie_lists')
    .select('seen, rejected, to_watch, updated_at')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    seen: data.seen || [],
    rejected: data.rejected || [],
    toWatch: Array.isArray(data.to_watch) ? data.to_watch : [],
    updatedAt: data.updated_at ? Date.parse(data.updated_at) : 0,
  };
}

async function legacySave(clientId, seen, rejected, toWatch) {
  const { error } = await supabase.from('movie_lists').upsert(
    {
      client_id: clientId,
      seen: [...seen],
      rejected: [...rejected],
      to_watch: toWatch,
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
  // idle | saving | saved | offline | error
  const [syncState, setSyncState] = useState('idle');

  const [clientId] = useState(() => getOrCreate(CLIENT_ID_KEY));
  const [clientSecret] = useState(() => getOrCreate(CLIENT_SECRET_KEY));
  const useLegacyRef = useRef(false);
  // Serialize cloud writes so rapid taps can't reorder them.
  const saveQueueRef = useRef(Promise.resolve());

  const loadRemote = useCallback(async () => {
    if (!supabase || !clientId) return null;
    if (!useLegacyRef.current) {
      try {
        return await rpcLoad(clientId, clientSecret);
      } catch (e) {
        if (e?.code === RPC_MISSING) {
          useLegacyRef.current = true; // migration not applied yet — fall back
        } else {
          throw e;
        }
      }
    }
    return legacyLoad(clientId);
  }, [clientId, clientSecret]);

  const saveRemote = useCallback(
    (seenSet, rejectedSet, toWatchMovies) => {
      if (!supabase || !clientId) return;
      const slimmed = toWatchMovies.map(slimMovie);
      saveQueueRef.current = saveQueueRef.current
        .then(async () => {
          if (!useLegacyRef.current) {
            try {
              await rpcSave(clientId, clientSecret, seenSet, rejectedSet, slimmed);
            } catch (e) {
              if (e?.code === RPC_MISSING) {
                useLegacyRef.current = true;
                await legacySave(clientId, seenSet, rejectedSet, slimmed);
              } else {
                throw e;
              }
            }
          } else {
            await legacySave(clientId, seenSet, rejectedSet, slimmed);
          }
          setSyncState('saved');
        })
        .catch((e) => {
          console.warn('Supabase sync failed:', e?.message || e);
          setSyncState('error');
        });
    },
    [clientId, clientSecret]
  );

  const persistMovieLists = useCallback(
    (seenSet, rejectedSet, toWatchMovies) => {
      // Write to localStorage immediately (works offline).
      const updatedAt = Date.now();
      const slimmed = toWatchMovies.map(slimMovie);
      try {
        writeLocal(seenSet, rejectedSet, slimmed, updatedAt);
      } catch (e) {
        setError(`Failed to save movie lists: ${String(e?.message || e)}`);
      }

      // Sync to Supabase in the background; failures are non-fatal.
      if (!supabase || !clientId) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncState('offline');
        return;
      }
      setSyncState('saving');
      saveRemote(seenSet, rejectedSet, slimmed);
    },
    [saveRemote, setError, clientId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal();
      let remote = null;
      if (supabase && clientId) {
        try {
          remote = await loadRemote();
        } catch (e) {
          console.warn('Supabase load failed, using local cache:', e?.message || e);
          if (!cancelled) {
            setSyncState(
              typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error'
            );
          }
        }
      }
      if (cancelled) return;
      // Merge instead of letting one side clobber the other.
      const merged = mergeLists(local, remote);
      setSeen(merged.seen);
      setRejected(merged.rejected);
      setToWatch(merged.toWatch);
      writeLocal(
        merged.seen,
        merged.rejected,
        merged.toWatch,
        Math.max(local?.updatedAt || 0, remote?.updatedAt || 0)
      );
      if (remote) {
        // Push the merged copy up so every device converges.
        setSyncState('saving');
        saveRemote(merged.seen, merged.rejected, merged.toWatch);
      } else if (local) {
        setSyncState(supabase ? 'saved' : 'idle');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, loadRemote, saveRemote]);

  const markSeen = (movieId) => {
    const nextSeen = new Set(seen);
    const nextRejected = new Set(rejected);
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    nextSeen.add(movieId);
    nextRejected.delete(movieId);
    setSeen(nextSeen);
    setRejected(nextRejected);
    setToWatch(nextToWatch);
    persistMovieLists(nextSeen, nextRejected, nextToWatch);
  };

  const markRejected = (movieId) => {
    const nextSeen = new Set(seen);
    const nextRejected = new Set(rejected);
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    nextRejected.add(movieId);
    nextSeen.delete(movieId);
    setSeen(nextSeen);
    setRejected(nextRejected);
    setToWatch(nextToWatch);
    persistMovieLists(nextSeen, nextRejected, nextToWatch);
  };

  const addToWatch = (movie) => {
    if (toWatch.some((existing) => existing.id === movie.id)) return;
    const nextToWatch = [slimMovie(movie), ...toWatch];
    setToWatch(nextToWatch);
    persistMovieLists(seen, rejected, nextToWatch);
  };

  const removeFromToWatch = (movieId) => {
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    setToWatch(nextToWatch);
    persistMovieLists(seen, rejected, nextToWatch);
  };

  const clearSeen = () => {
    if (
      !window.confirm(
        'Clear hidden movies? This will make both seen and rejected movies visible again.'
      )
    )
      return;
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
    syncState,
    markSeen,
    markRejected,
    addToWatch,
    removeFromToWatch,
    clearSeen,
  };
}
