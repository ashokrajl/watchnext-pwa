import { Platform } from 'react-native';

const DEFAULT_WEB_API_BASE = '/api/tmdb';

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE ||
  (Platform.OS === 'web' ? DEFAULT_WEB_API_BASE : '')
).replace(/\/$/, '');
export const IMG_BASE = 'https://image.tmdb.org/t/p/w342';
export const KIDS_GENRE_IDS = [10751, 16];
export const STORAGE_KEY = 'watchnext-movie-lists';
