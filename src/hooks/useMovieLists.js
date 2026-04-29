import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY } from '../constants';

export function useMovieLists({ setError }) {
  const [seen, setSeen] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());
  const [toWatch, setToWatch] = useState([]);

  const persistMovieLists = useCallback(async (seenSet, rejectedSet, toWatchMovies) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          seen: [...seenSet],
          rejected: [...rejectedSet],
          toWatch: toWatchMovies,
        })
      );
    } catch (e) {
      setError(`Failed to save movie lists: ${String(e?.message || e)}`);
    }
  }, [setError]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSeen(new Set(parsed));
        } else {
          setSeen(new Set(parsed?.seen || []));
          setRejected(new Set(parsed?.rejected || []));
          setToWatch(Array.isArray(parsed?.toWatch) ? parsed.toWatch : []);
        }
      } catch (e) {
        setError(`Failed to load movie lists: ${String(e?.message || e)}`);
      }
    })();
  }, [setError]);

  const markSeen = async (movieId) => {
    const nextSeen = new Set(seen);
    const nextRejected = new Set(rejected);
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    nextSeen.add(movieId);
    nextRejected.delete(movieId);
    setSeen(nextSeen);
    setRejected(nextRejected);
    setToWatch(nextToWatch);
    await persistMovieLists(nextSeen, nextRejected, nextToWatch);
  };

  const markRejected = async (movieId) => {
    const nextSeen = new Set(seen);
    const nextRejected = new Set(rejected);
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    nextRejected.add(movieId);
    nextSeen.delete(movieId);
    setSeen(nextSeen);
    setRejected(nextRejected);
    setToWatch(nextToWatch);
    await persistMovieLists(nextSeen, nextRejected, nextToWatch);
  };

  const addToWatch = async (movie) => {
    if (toWatch.some((existing) => existing.id === movie.id)) return;
    const nextToWatch = [movie, ...toWatch];
    setToWatch(nextToWatch);
    await persistMovieLists(seen, rejected, nextToWatch);
  };

  const removeFromToWatch = async (movieId) => {
    const nextToWatch = toWatch.filter((movie) => movie.id !== movieId);
    setToWatch(nextToWatch);
    await persistMovieLists(seen, rejected, nextToWatch);
  };

  const clearSeen = () => {
    Alert.alert('Clear hidden movies?', 'This will make both seen and rejected movies visible again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const nextSeen = new Set();
          const nextRejected = new Set();
          setSeen(nextSeen);
          setRejected(nextRejected);
          await persistMovieLists(nextSeen, nextRejected, toWatch);
        },
      },
    ]);
  };

  return {
    seen,
    rejected,
    toWatch,
    markSeen,
    markRejected,
    addToWatch,
    removeFromToWatch,
    clearSeen,
  };
}
