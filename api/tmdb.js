module.exports = async function handler(req, res) {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const mode = searchParams.get('mode') || 'discover';
  const isGenresRequest = mode === 'genres' || pathname.endsWith('/genres');

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
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_BEARER || ''}`,
    },
  });
  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  res.status(response.status).json(data);
}
