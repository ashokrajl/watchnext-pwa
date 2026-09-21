// Local taste profile for the AI recommender.
//
// The synced movie lists store only TMDB ids for seen/rejected movies, but the
// AI needs titles to understand taste. This module keeps a small local cache
// (id -> title/year) that is filled whenever the user marks a movie seen or
// rejected. It never leaves the device except inside a recommendation request.

const KEY = 'watchnext-taste-profile';
const MAX_ENTRIES = 200;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { liked: {}, disliked: {} };
    const parsed = JSON.parse(raw);
    return {
      liked: parsed?.liked && typeof parsed.liked === 'object' ? parsed.liked : {},
      disliked: parsed?.disliked && typeof parsed.disliked === 'object' ? parsed.disliked : {},
    };
  } catch {
    return { liked: {}, disliked: {} };
  }
}

function write(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // quota exceeded — non-fatal
  }
}

function yearOf(movie) {
  const y = Number.parseInt(String(movie?.release_date || '').slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

// kind: 'liked' (marked seen) or 'disliked' (rejected)
export function recordTaste(movie, kind) {
  if (!movie || movie.id == null || !movie.title) return;
  if (kind !== 'liked' && kind !== 'disliked') return;
  const profile = read();
  const bucket = profile[kind];
  bucket[String(movie.id)] = { t: movie.title, y: yearOf(movie), p: movie.poster_path || null };
  // A movie can't be both liked and disliked — latest action wins.
  const other = kind === 'liked' ? profile.disliked : profile.liked;
  delete other[String(movie.id)];
  // Trim oldest entries if the cache grows too large.
  for (const b of [profile.liked, profile.disliked]) {
    const keys = Object.keys(b);
    if (keys.length > MAX_ENTRIES) {
      for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete b[k];
    }
  }
  write(profile);
}

function toList(bucket) {
  return Object.values(bucket)
    .map((e) => ({ title: e.t, year: e.y }))
    .filter((e) => e.title);
}

export function getTasteProfile() {
  const profile = read();
  return { liked: toList(profile.liked), disliked: toList(profile.disliked) };
}

// Look up one cached title/year/poster by TMDB id (used by the history screen).
// Returns { title, year, poster, kind } where kind is 'liked' | 'disliked', or null.
export function getTasteEntry(movieId) {
  if (movieId == null) return null;
  const profile = read();
  const key = String(movieId);
  const liked = profile.liked[key];
  const entry = liked || profile.disliked[key] || null;
  if (!entry || !entry.t) return null;
  return { title: entry.t, year: entry.y || null, poster: entry.p || null, kind: liked ? 'liked' : 'disliked' };
}

// Drop a movie from the taste cache — used when restoring an accidental hide
// so the AI doesn't keep treating it as a like/dislike.
export function forgetTaste(movieId) {
  if (movieId == null) return;
  const profile = read();
  const key = String(movieId);
  delete profile.liked[key];
  delete profile.disliked[key];
  write(profile);
}

export function clearTasteProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // non-fatal
  }
}
