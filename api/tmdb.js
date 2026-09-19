// TMDB proxy for the WatchNext app.
//
// The browser never talks to TMDB directly, so the TMDB_BEARER token stays
// server-side. Every query parameter is validated before it is forwarded,
// upstream failures are converted into clean JSON errors, and a best-effort
// per-IP rate limiter keeps one abusive client from burning the TMDB quota.

// --- Best-effort in-memory rate limiter -------------------------------------
// Note: serverless instances don't share memory, so this only throttles
// bursts against a single warm instance. It is a speed bump, not a wall.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const rateBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (rateBuckets.size > 5000) {
    for (const [key, entry] of rateBuckets) {
      if (now > entry.reset) rateBuckets.delete(key);
    }
  }
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

// --- Parameter validation ---------------------------------------------------

function parsePage(value) {
  const n = Number.parseInt(value ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 500); // TMDB caps discover/search at 500 pages
}

function parseCsvIds(value) {
  if (typeof value !== 'string' || !/^[0-9,\s]+$/.test(value)) return null;
  const ids = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids.join(',') : null;
}

function parseRating(value) {
  if (value == null || value === '') return null;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return String(Math.max(0, Math.min(10, n)));
}

function parseDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseLanguage(value) {
  return typeof value === 'string' && /^[a-z]{2}$/i.test(value) ? value.toLowerCase() : null;
}

function parseQuery(value) {
  if (typeof value !== 'string') return null;
  const q = value.trim().slice(0, 100);
  return q.length > 0 ? q : null;
}

const CERTIFICATIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

// --- Handler ----------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (isRateLimited(getClientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
  }

  if (!process.env.TMDB_BEARER) {
    return res.status(500).json({ error: 'Server misconfigured: TMDB_BEARER is not set.' });
  }

  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const mode = searchParams.get('mode') || 'discover';

  let endpoint;
  const extra = new URLSearchParams();

  if (mode === 'genres' || pathname.endsWith('/genres')) {
    endpoint = '/genre/movie/list';
  } else if (mode === 'search') {
    const query = parseQuery(searchParams.get('query'));
    if (!query) return res.status(400).json({ error: 'Missing "query" parameter.' });
    endpoint = '/search/movie';
    extra.set('query', query);
    extra.set('include_adult', 'false');
  } else if (mode === 'discover') {
    endpoint = '/discover/movie';
    const genres = parseCsvIds(searchParams.get('genres'));
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));
    const ratingMin = parseRating(searchParams.get('ratingMin'));
    const ratingMax = parseRating(searchParams.get('ratingMax'));
    const originalLanguage = parseLanguage(searchParams.get('originalLanguage'));
    const certificationCountry = searchParams.get('certificationCountry');
    const certificationLte = searchParams.get('certificationLte');

    if (genres) extra.set('with_genres', genres);
    if (from) extra.set('primary_release_date.gte', from);
    if (to) extra.set('primary_release_date.lte', to);
    if (ratingMin) extra.set('vote_average.gte', ratingMin);
    if (ratingMax) extra.set('vote_average.lte', ratingMax);
    if (originalLanguage) extra.set('with_original_language', originalLanguage);
    if (certificationCountry === 'US' && CERTIFICATIONS.includes(certificationLte)) {
      extra.set('certification_country', 'US');
      extra.set('certification.lte', certificationLte);
    }
    extra.set('include_adult', 'false');
    extra.set('sort_by', 'popularity.desc');
  } else {
    return res.status(400).json({ error: `Unknown mode "${mode}".` });
  }

  const qs = new URLSearchParams({
    language: 'en-US',
    page: String(parsePage(searchParams.get('page'))),
  });
  for (const [key, value] of extra) qs.set(key, value);

  const url = `https://api.themoviedb.org/3${endpoint}?${qs.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${process.env.TMDB_BEARER}` },
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'Movie service returned an invalid response.' });
    }

    // Only cache successful responses at the edge.
    if (response.ok) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    }
    return res.status(response.status).json(data);
  } catch (e) {
    const timedOut = e && e.name === 'AbortError';
    return res.status(502).json({
      error: timedOut
        ? 'Movie service timed out. Please try again.'
        : 'Movie service is temporarily unavailable. Please try again.',
    });
  }
}
