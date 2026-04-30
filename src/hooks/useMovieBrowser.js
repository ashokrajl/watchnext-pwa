import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { API_BASE, KIDS_GENRE_IDS } from '../constants';

const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('Movie request timed out. Try again in a moment.');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export function useMovieBrowser({ screen, seen, rejected, toWatch, setError }) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(999);
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [movies, setMovies] = useState([]);
  const [yearFrom, setYearFrom] = useState('2023');
  const [yearTo, setYearTo] = useState(String(new Date().getFullYear()));
  const [ratingMin, setRatingMin] = useState('6');
  const [ratingMax, setRatingMax] = useState('10');
  const [loading, setLoading] = useState(false);
  const [browseVersion, setBrowseVersion] = useState(0);
  const requestVersionRef = useRef(0);

  const isBrowseScreen = screen === 'discover' || screen === 'kids' || screen === 'tamil';

  const visibleMovies = useMemo(() => {
    const toWatchIds = new Set(toWatch.map((movie) => movie.id));
    return movies.filter(
      (movie) =>
        movie.poster_path &&
        (screen !== 'kids' || movie.genre_ids?.some((genreId) => KIDS_GENRE_IDS.includes(genreId))) &&
        (screen !== 'tamil' || movie.original_language === 'ta') &&
        !seen.has(movie.id) &&
        !rejected.has(movie.id) &&
        !toWatchIds.has(movie.id)
    );
  }, [movies, rejected, screen, seen, toWatch]);

  const selectedGenreNames = genres
    .filter((genre) => selectedGenres.includes(genre.id))
    .map((genre) => genre.name)
    .join(', ');

  const fetchGenres = useCallback(async () => {
    const res = await fetchWithTimeout(`${API_BASE}?mode=genres`);
    if (!res.ok) throw new Error('Genres fetch failed');
    const data = await res.json();
    setGenres(data.genres || []);
  }, []);

  const fetchMovies = useCallback(async (targetPage) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      from: `${yearFrom || '2023'}-01-01`,
      to: `${yearTo || new Date().getFullYear()}-12-31`,
    });

    if (screen === 'kids') {
      params.set('genres', KIDS_GENRE_IDS.join(','));
      params.set('certificationCountry', 'US');
      params.set('certificationLte', 'PG');
    } else if (screen === 'tamil') {
      params.set('originalLanguage', 'ta');
    } else {
      const min = Number.parseFloat(ratingMin);
      const max = Number.parseFloat(ratingMax);
      if (!Number.isNaN(min)) params.set('ratingMin', String(Math.max(0, Math.min(10, min))));
      if (!Number.isNaN(max)) params.set('ratingMax', String(Math.max(0, Math.min(10, max))));
      if (selectedGenres.length) params.set('genres', selectedGenres.join(','));
    }

    params.set('mode', 'discover');
    const res = await fetchWithTimeout(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error('Movie fetch failed');
    return res.json();
  }, [ratingMax, ratingMin, screen, selectedGenres, yearFrom, yearTo]);
  const fetchMoviesRef = useRef(fetchMovies);
  fetchMoviesRef.current = fetchMovies;

  const loadNextPage = useCallback(async () => {
    if (!isBrowseScreen || loading || page > totalPages) return;
    const requestVersion = requestVersionRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await fetchMovies(page);
      if (requestVersion !== requestVersionRef.current) return;
      setTotalPages(data.total_pages || totalPages);
      setMovies((prev) => [...prev, ...(data.results || [])]);
      setPage((prev) => prev + 1);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [fetchMovies, isBrowseScreen, loading, page, setError, totalPages]);

  const loadFirstPage = useCallback(async () => {
    if (!isBrowseScreen) return;
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;
    setLoading(true);
    setError('');
    setPage(1);
    setTotalPages(999);
    setMovies([]);
    try {
      const data = await fetchMoviesRef.current(1);
      if (requestVersion !== requestVersionRef.current) return;
      setTotalPages(data.total_pages || 999);
      setMovies(data.results || []);
      setPage(2);
    } catch (e) {
      if (requestVersion === requestVersionRef.current) {
        setError(String(e?.message || e));
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [isBrowseScreen, setError]);

  const applyFilters = useCallback(() => {
    const min = Number.parseFloat(ratingMin);
    const max = Number.parseFloat(ratingMax);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      setRatingMin(String(max));
      setRatingMax(String(min));
    }
    setPage(1);
    setTotalPages(999);
    setMovies([]);
    setBrowseVersion((prev) => prev + 1);
  }, [ratingMax, ratingMin]);

  const resetBrowseState = useCallback(() => {
    requestVersionRef.current += 1;
    setLoading(false);
    setPage(1);
    setTotalPages(999);
    setMovies([]);
    setBrowseVersion((prev) => prev + 1);
  }, []);

  const toggleGenre = (id) => {
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  useEffect(() => {
    if (!API_BASE) {
      setError('Set EXPO_PUBLIC_API_BASE in .env for Expo Go, for example https://<your-app>.vercel.app/api/tmdb');
      return;
    }

    (async () => {
      try {
        await fetchGenres();
      } catch (e) {
        setError(String(e?.message || e));
      }
    })();
  }, [fetchGenres, setError]);

  useEffect(() => {
    if (!API_BASE || !isBrowseScreen) return;
    loadFirstPage();
  }, [browseVersion, isBrowseScreen, loadFirstPage, screen]);

  return {
    genres,
    selectedGenres,
    selectedGenreNames,
    visibleMovies,
    yearFrom,
    yearTo,
    ratingMin,
    ratingMax,
    loading,
    page,
    totalPages,
    isBrowseScreen,
    setYearFrom,
    setYearTo,
    setRatingMin,
    setRatingMax,
    applyFilters,
    resetBrowseState,
    loadNextPage,
    toggleGenre,
  };
}
