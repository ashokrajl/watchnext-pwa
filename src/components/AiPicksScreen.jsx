import { useState } from 'react';

import { IMG_BASE, RECOMMEND_URL } from '../constants';
import { getTasteProfile } from '../lib/tasteProfile';
import { styles } from '../styles';
import { toYearString } from '../utils/movie';

function yearOf(movie) {
  const y = Number.parseInt(String(movie?.release_date || '').slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function AiPicksScreen({
  watchlist,
  seenIds,
  rejectedIds,
  onMarkSeen,
  onAddToWatch,
  onOpenDetails,
}) {
  const [mood, setMood] = useState('');
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);

  const profile = getTasteProfile();
  const tasteCounts = {
    liked: profile.liked.length,
    disliked: profile.disliked.length,
    watchlist: watchlist.length,
  };

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const body = {
        liked: profile.liked,
        disliked: profile.disliked,
        watchlist: watchlist.map((m) => ({ title: m.title, year: yearOf(m) })),
        mood: mood.trim(),
        count: 8,
        excludeIds: [
          ...seenIds,
          ...rejectedIds,
          ...watchlist.map((m) => m.id),
          ...picks.map((p) => p.movie.id),
        ],
      };
      const res = await fetch(RECOMMEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Recommendation failed.');
      setPicks(Array.isArray(data?.recommendations) ? data.recommendations : []);
      setHasGenerated(true);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const dismissPick = (id) => setPicks((prev) => prev.filter((p) => p.movie.id !== id));

  const handleSeen = (pick) => {
    onMarkSeen(pick.movie.id, pick.movie);
    dismissPick(pick.movie.id);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={local.panel}>
        <p style={local.title}>✨ AI Picks</p>
        <p style={local.sub}>
          Based on {tasteCounts.liked} seen · {tasteCounts.disliked} skipped ·{' '}
          {tasteCounts.watchlist} to-watch
        </p>
        <input
          style={styles.input}
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="In the mood for… (optional)"
          maxLength={200}
          aria-label="What are you in the mood for?"
        />
        <button style={styles.button} onClick={generate} disabled={loading}>
          <span style={styles.buttonText}>
            {loading ? 'Asking the AI…' : hasGenerated ? 'Surprise me again' : 'Get recommendations'}
          </span>
        </button>
        {loading && <div className="spinner" style={{ marginTop: 12 }} />}
        {!!error && <p style={styles.error}>{error}</p>}
      </div>

      {!hasGenerated && !loading && !error && (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateTitle}>Your personal movie oracle</p>
          <p style={styles.emptyStateText}>
            The more you mark seen or skip, the sharper it gets. Add an optional mood for
            extra credit.
          </p>
        </div>
      )}

      {hasGenerated && picks.length === 0 && !loading && !error && (
        <p style={styles.emptyText}>No picks this time — try generating again.</p>
      )}

      {picks.length > 0 && (
        <div style={styles.toWatchList}>
          {picks.map((pick) => (
            <div key={pick.movie.id} style={styles.toWatchCard}>
              <img
                src={`${IMG_BASE}${pick.movie.poster_path}`}
                style={styles.toWatchPoster}
                alt={pick.movie.title}
                loading="lazy"
              />
              <div style={styles.toWatchMeta}>
                <p style={styles.movieTitle}>{pick.movie.title || ''}</p>
                <div style={styles.metaRow}>
                  <span style={styles.tag}>{toYearString(pick.movie.release_date)}</span>
                  <span style={styles.ratingTag}>
                    IMDb {Number(pick.movie.vote_average || 0).toFixed(1)}
                  </span>
                </div>
                {!!pick.reason && <p style={local.reason}>{pick.reason}</p>}
                <div style={styles.toWatchActions}>
                  <button
                    style={{ ...styles.iconButton, ...styles.acceptButton }}
                    onClick={() => handleSeen(pick)}
                    aria-label="Mark as seen"
                  >
                    <span style={styles.iconButtonText}>✓</span>
                  </button>
                  <button
                    style={{ ...styles.iconButton, ...styles.toWatchIconButton }}
                    onClick={() => onAddToWatch(pick.movie)}
                    aria-label="Add to To Watch"
                  >
                    <span style={styles.iconButtonText}>＋</span>
                  </button>
                  <button
                    style={{ ...styles.iconButton, ...styles.toWatchIconButton }}
                    onClick={() => onOpenDetails(pick.movie)}
                    aria-label="View details"
                  >
                    <span style={styles.iconButtonText}>ⓘ</span>
                  </button>
                  <button
                    style={{ ...styles.iconButton, ...styles.removeButton }}
                    onClick={() => dismissPick(pick.movie.id)}
                    aria-label="Dismiss recommendation"
                  >
                    <span style={styles.iconButtonText}>✕</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const local = {
  panel: { padding: '16px 16px 8px' },
  title: { margin: '0 0 4px', fontSize: 20, fontWeight: 700 },
  sub: { margin: '0 0 12px', fontSize: 13, color: '#8e8e93' },
  reason: { margin: '8px 0 0', fontSize: 13, fontStyle: 'italic', color: '#b8b8c0', lineHeight: 1.45 },
};
