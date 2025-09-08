export default async function handler(req, res) {
const { searchParams } = new URL(req.url, 'http://localhost');
  const mode = searchParams.get('mode') || 'discover';
  const page = searchParams.get('page') || '1';
  const genres = searchParams.get('genres');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let endpoint;
  if (mode === 'genres') {
    endpoint = '/genre/movie/list';
  } else {
    endpoint = '/discover/movie';
  }

  const qs = new URLSearchParams({ page, language: 'en-US', sort_by: 'popularity.desc' });
  if (genres) qs.set('with_genres', genres);
  if (from) qs.set('primary_release_date.gte', from);
  if (to) qs.set('primary_release_date.lte', to);

  const url = 'https://api.themoviedb.org/3' + endpoint + '?' + qs.toString();
  const response = await fetch(url, {
    headers: {
     AAuthorization: 'Bearer ' + process.env.TMDB_BEARER
    },
  });
  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  res.status(response.status).json(data);
}
