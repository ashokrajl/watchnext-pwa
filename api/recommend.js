// AI movie recommendations for the WatchNext app.
//
// POST /api/recommend
// Body: {
//   liked:     [{ title, year? }],  // movies the user marked seen
//   disliked:  [{ title, year? }],  // movies the user rejected
//   watchlist: [{ title, year? }],  // to-watch titles (strong "want" signal)
//   mood:      "optional free text, e.g. 'something cozy and funny'",
//   count:     8,                   // 1..12
//   excludeIds: [tmdbId, ...]       // seen + rejected + toWatch ids
// }
//
// Flow:
//   1. Validate + clamp the request body.
//   2. Ask OpenRouter (free model, API key stays server-side) for `count`
//      recommendations as strict JSON: [{ title, year, reason }].
//   3. Resolve each title against TMDB /search/movie (same bearer as the
//      tmdb proxy) so the app gets real posters, ids, and actions.
//   4. Return { recommendations: [{ movie: {...slim}, reason }] }.

// --- Best-effort in-memory rate limiter -------------------------------------
// AI calls are heavier than TMDB calls (and free-tier models are rate
// limited upstream), so this is stricter than the tmdb proxy's limiter.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
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

// --- Validation --------------------------------------------------------------

const MAX_TASTE_ITEMS = 40;
const CURRENT_YEAR = new Date().getFullYear();

function cleanTitle(value) {
  if (typeof value !== 'string') return null;
  const t = value.trim().slice(0, 120);
  return t.length > 0 ? t : null;
}

function cleanYear(value) {
  const y = Number.parseInt(value, 10);
  if (!Number.isFinite(y) || y < 1888 || y > CURRENT_YEAR + 2) return null;
  return y;
}

function cleanTasteList(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const title = cleanTitle(item.title);
    if (!title) continue;
    out.push({ title, year: cleanYear(item.year) });
    if (out.length >= MAX_TASTE_ITEMS) break;
  }
  return out;
}

function cleanMood(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 200);
}

function cleanCount(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 8;
  return Math.max(1, Math.min(12, n));
}

function cleanExcludeIds(value) {
  if (!Array.isArray(value)) return new Set();
  const out = new Set();
  for (const id of value) {
    const n = Number.parseInt(id, 10);
    if (Number.isFinite(n)) out.add(n);
    if (out.size >= 1000) break;
  }
  return out;
}

function fmtTaste(list) {
  return list.map((m) => (m.year ? `${m.title} (${m.year})` : m.title));
}

// --- OpenRouter ---------------------------------------------------------------

async function askOpenRouter({ liked, disliked, watchlist, mood, count }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('AI recommendations are not configured on the server.');
    err.status = 500;
    throw err;
  }
  // Free models rotate on OpenRouter; overridable without a redeploy of code.
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';

  const moodLine = mood
    ? `The user is in the mood for: "${mood}". Weigh this heavily.`
    : '';

  const userPrompt = [
    'Here is the user\'s movie taste.',
    `Movies they watched and liked (${liked.length}): ${fmtTaste(liked).join('; ') || 'none listed'}`,
    `Movies they rejected (${disliked.length}): ${fmtTaste(disliked).join('; ') || 'none listed'}`,
    `Already on their watchlist — do NOT recommend these again (${watchlist.length}): ${fmtTaste(watchlist).join('; ') || 'none'}`,
    moodLine,
    '',
    `Recommend exactly ${count} movies they have probably NOT seen. Favor variety across the liked titles' genres and eras, but stay coherent with their taste. Avoid anything resembling the rejected list.`,
    'Reply with ONLY this JSON object, no other text:',
    '{"recommendations": [{"title": "Movie Title", "year": 2019, "reason": "one sentence, max 25 words, referencing their taste"}]}',
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'WatchNext',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a movie recommendation engine. You always reply with a single valid JSON object and no other text.',
        },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (res.status === 401 || res.status === 403) {
    const err = new Error('The AI provider rejected the API key. Check OPENROUTER_API_KEY.');
    err.status = 500;
    throw err;
  }
  if (res.status === 429) {
    const err = new Error('The AI is rate-limited right now. Try again in a bit.');
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    const err = new Error('The AI provider returned an error. Please try again.');
    err.status = 502;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    const err = new Error('The AI returned an empty response. Please try again.');
    err.status = 502;
    throw err;
  }
  return parseRecommendations(content, count);
}

function parseRecommendations(content, count) {
  let text = content.trim();
  // Strip markdown fences if the model added them despite instructions.
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const err = new Error('The AI returned an unreadable response. Please try again.');
    err.status = 502;
    throw err;
  }
  const list = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
  const out = [];
  for (const item of list) {
    const title = cleanTitle(item?.title);
    if (!title) continue;
    const reason =
      typeof item?.reason === 'string' && item.reason.trim()
        ? item.reason.trim().slice(0, 200)
        : '';
    out.push({ title, year: cleanYear(item?.year), reason });
    if (out.length >= count) break;
  }
  if (out.length === 0) {
    const err = new Error('The AI returned no usable recommendations. Please try again.');
    err.status = 502;
    throw err;
  }
  return out;
}

// --- TMDB title resolution -----------------------------------------------------

async function tmdbSearch(title, year, tmdbBearer) {
  const params = new URLSearchParams({
    query: title,
    include_adult: 'false',
    language: 'en-US',
  });
  if (year) params.set('year', String(year));
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: { Authorization: `Bearer ${tmdbBearer}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.results) ? data.results : [];
}

function pickMatch(results, year, excludeIds) {
  const fresh = results.filter((r) => r && !excludeIds.has(r.id));
  if (fresh.length === 0) return null;
  if (year) {
    const close = fresh.find((r) => {
      const y = Number.parseInt(String(r.release_date || '').slice(0, 4), 10);
      return Number.isFinite(y) && Math.abs(y - year) <= 1;
    });
    if (close) return close;
  }
  return fresh[0];
}

function slimMovie(m) {
  return {
    id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    release_date: m.release_date,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    overview: m.overview,
    original_language: m.original_language,
    genre_ids: m.genre_ids,
  };
}

// --- Handler -------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (isRateLimited(getClientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
  }

  const tmdbBearer = process.env.TMDB_BEARER;
  if (!tmdbBearer) {
    return res.status(500).json({ error: 'Server misconfigured: TMDB_Bearer <redacted> not set.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Missing request body.' });
  }

  const liked = cleanTasteList(body.liked);
  const disliked = cleanTasteList(body.disliked);
  const watchlist = cleanTasteList(body.watchlist);
  const mood = cleanMood(body.mood);
  const count = cleanCount(body.count);
  const excludeIds = cleanExcludeIds(body.excludeIds);

  if (liked.length === 0 && watchlist.length === 0) {
    return res.status(400).json({
      error: 'Not enough taste data yet — mark a few movies as seen or add to your watchlist first.',
    });
  }

  let suggestions;
  try {
    suggestions = await askOpenRouter({ liked, disliked, watchlist, mood, count });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Recommendation failed.' });
  }

  // Resolve titles to real TMDB movies so the app gets posters and actions.
  const seenIds = new Set(excludeIds);
  const recommendations = [];
  for (const s of suggestions) {
    try {
      const results = await tmdbSearch(s.title, s.year, tmdbBearer);
      const match = pickMatch(results, s.year, seenIds);
      if (!match) continue;
      seenIds.add(match.id);
      recommendations.push({ movie: slimMovie(match), reason: s.reason });
    } catch {
      // One bad lookup shouldn't sink the whole batch.
    }
  }

  if (recommendations.length === 0) {
    return res.status(502).json({ error: 'Could not match the AI suggestions to movies. Try again.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ recommendations });
}
