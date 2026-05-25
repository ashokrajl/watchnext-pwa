const DEFAULT_API_BASE = '/api/tmdb';

export const API_BASE = (
  import.meta.env.VITE_API_BASE || DEFAULT_API_BASE
).replace(/\/$/, '');

export const IMG_BASE = 'https://image.tmdb.org/t/p/w342';
export const KIDS_GENRE_IDS = [10751, 16];
export const STORAGE_KEY = 'watchnext-movie-lists';
export const CLIENT_ID_KEY = 'watchnext-client-id';
