import { useEffect, useState } from 'react';

import { API_BASE } from '../constants';
import { getTasteEntry, recordTaste } from '../lib/tasteProfile';
import { styles } from '../styles';

// Cap for lazy title lookups so a huge hidden list doesn't hammer the proxy.
const MAX_LAZY_RESOLVE = 25;

function yearOf(releaseDate) {
  const y = Number.parseInt(String(releaseDate || '').slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function buildEntries(ids, kind) {
  return [...ids].map((id) => {
    const cached = getTasteEntry(id);
    return {
      id,
      kind, // 'rejected' (skipped) | 'seen'
      title: cached?.title || null,
      year: cached?.year ?? null,
      resolved: !!cached,
    };
  });
}

function Section({ title, entries, onRestoreAll, onRestore, onOpenDetails }) {
  const restoreAll = () => {
    if (entries.length === 0) return;
    if (!window.confirm(`Restore all ${entries.length} ${title.toLowerCase()} movies?`)) return;
    onRestoreAll(entries.map((e) => e.id));
  };

  return (
    <div>
      <div style={styles.sectionHeader}>
        <p style={styles.sectionTitle}>
          {title} <span style={styles.sectionCount}>({entries.length})</span>
        </p>
        {entries.length > 0 && (
          <button style={styles.restoreAllButton} onClick={restoreAll}>
            <span style={styles.restoreAllButtonText}>Restore all</span>
          </button>
        )}
      </div>
      <div style={styles.toWatchList}>
        {entries.length === 0 ? (
          <p style={{ ...styles.emptyText, marginTop: 8 }}>None.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={styles.toWatchCard}>
              <div style={styles.toWatchMeta}>
                <p style={styles.movieTitle}>
                  {entry.resolved ? entry.title : 'Loading…'}
                </p>
                <div style={styles.metaRow}>
                  <span style={styles.tag}>{entry.year || '—'}</span>
                  <span style={styles.hiddenBadge}>
                    {entry.kind === 'rejected' ? 'SKIPPED' : 'SEEN'}
                  </span>
                </div>
                <div style={styles.toWatchActions}>
                  <button
                    style={styles.restoreButton}
                    onClick={() => onRestore(entry.id)}
                    aria-label={`Restore ${entry.title || 'movie'}`}
                  >
                    <span style={styles.iconButtonText}>↩ Restore</span>
                  </button>
                  <button
                    style={{ ...styles.iconButton, ...styles.toWatchIconButton, width: '31%' }}
                    onClick={() =>
                      onOpenDetails({ id: entry.id, title: entry.title || 'Movie' })
                    }
                    aria-label="View details"
                  >
                    <span style={styles.iconButtonText}>ⓘ</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function HiddenScreen({ seenIds, rejectedIds, onUnhide, onUnhideMany, onOpenDetails }) {
  const [entries, setEntries] = useState(() => [
    ...buildEntries(rejectedIds, 'rejected'),
    ...buildEntries(seenIds, 'seen'),
  ]);

  // Rebuild when the hidden sets change (e.g. after a restore).
  useEffect(() => {
    setEntries([...buildEntries(rejectedIds, 'rejected'), ...buildEntries(seenIds, 'seen')]);
  }, [seenIds, rejectedIds]);

  // Titles for older hidden movies may predate the taste-profile cache —
  // resolve them lazily through the detail endpoint and cache the result.
  useEffect(() => {
    const unresolved = entries.filter((e) => !e.resolved).slice(0, MAX_LAZY_RESOLVE);
    if (unresolved.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const entry of unresolved) {
        try {
          const res = await fetch(
            `${API_BASE}?mode=detail&id=${encodeURIComponent(entry.id)}`
          );
          if (!res.ok) continue;
          const detail = await res.json().catch(() => null);
          if (cancelled || !detail?.title) continue;
          recordTaste(
            { id: entry.id, title: detail.title, release_date: detail.release_date },
            entry.kind === 'seen' ? 'liked' : 'disliked'
          );
          if (!cancelled) {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === entry.id
                  ? { ...e, title: detail.title, year: yearOf(detail.release_date), resolved: true }
                  : e
              )
            );
          }
        } catch {
          // Leave it unresolved — the row stays visible with a fallback label.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  const skipped = entries.filter((e) => e.kind === 'rejected');
  const seen = entries.filter((e) => e.kind === 'seen');

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {entries.length === 0 ? (
        <p style={styles.emptyText}>
          Nothing hidden. Movies you mark as seen or skip will show up here.
        </p>
      ) : (
        <>
          <Section
            title="Skipped"
            entries={skipped}
            onRestoreAll={onUnhideMany}
            onRestore={onUnhide}
            onOpenDetails={onOpenDetails}
          />
          <Section
            title="Marked as seen"
            entries={seen}
            onRestoreAll={onUnhideMany}
            onRestore={onUnhide}
            onOpenDetails={onOpenDetails}
          />
        </>
      )}
    </div>
  );
}
