// Minimal local dev server for static + /api/tmdb
// Usage:
//   Add TMDB_BEARER to .env
//   node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ROOT = __dirname;

loadEnvFile(path.join(ROOT, '.env'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  if (body && (typeof body === 'string' || Buffer.isBuffer(body))) {
    res.end(body);
  } else if (body != null) {
    res.end(JSON.stringify(body));
  } else {
    res.end();
  }
}

async function handleTmdbProxy(req, res) {
  try {
    const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const isGenresRequest = pathname.endsWith('/genres');

    // Determine endpoint based on path
    const page = searchParams.get('page') || '1';
    const genres = searchParams.get('genres');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const ratingMin = searchParams.get('ratingMin');
    const ratingMax = searchParams.get('ratingMax');
    const certificationCountry = searchParams.get('certificationCountry');
    const certificationLte = searchParams.get('certificationLte');
    const originalLanguage = searchParams.get('originalLanguage');
    let endpoint;
    if (isGenresRequest) {
      endpoint = '/genre/movie/list';
    } else {
      endpoint = '/discover/movie';
    }
    const qs = new URLSearchParams({ page, language: 'en-US', sort_by: 'popularity.desc' });
    if (genres) qs.set('with_genres', genres);
    if (from) qs.set('primary_release_date.gte', from);
    if (to) qs.set('primary_release_date.lte', to);
    if (ratingMin) qs.set('vote_average.gte', ratingMin);
    if (ratingMax) qs.set('vote_average.lte', ratingMax);
    if (certificationCountry) qs.set('certification_country', certificationCountry);
    if (certificationLte) qs.set('certification.lte', certificationLte);
    if (originalLanguage) qs.set('with_original_language', originalLanguage);
    qs.set('include_adult', 'false');
    const url = `https://api.themoviedb.org/3${endpoint}?${qs.toString()}`;

    const auth = process.env.TMDB_BEARER || '';
    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${auth}` } });
    const text = await upstream.text();
    // Forward status and body
    send(res, upstream.status, text, {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 's-maxage=60, stale-while-revalidate=600',
    });
  } catch (e) {
    send(res, 500, { error: 'Proxy error', detail: String(e && e.message || e) }, { 'content-type': 'application/json; charset=utf-8' });
  }
}

function serveStatic(req, res) {
  let reqPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);

  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, { 'content-type': type });
    stream.pipe(res);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/api/tmdb')) {
      return handleTmdbProxy(req, res);
    }
    return serveStatic(req, res);
  });
}

function startListening(port, attempt = 0) {
  const server = createServer();
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && !process.env.PORT) {
      const next = port + 1;
      if (attempt < 20) {
        console.log(`Port ${port} busy, trying ${next}...`);
        return startListening(next, attempt + 1);
      }
      console.error(`No free port found near ${PORT}. Set PORT to a free port.`);
      process.exit(1);
    }
    console.error('Server error:', err && err.message ? err.message : err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`WatchNext dev server running: http://localhost:${port}`);
    if (!process.env.TMDB_BEARER) {
      console.log('Note: TMDB_BEARER is not set; API calls will return 401 from TMDB.');
    }
  });
}

startListening(PORT);
