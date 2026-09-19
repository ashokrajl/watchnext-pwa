import { IMG_BASE } from '../constants';
import { styles } from '../styles';
import { toYearString } from '../utils/movie';

export function ToWatchScreen({ movies, onMarkSeen, onRemoveFromToWatch, onOpenDetails }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {movies.length === 0 ? (
        <p style={styles.emptyText}>No movies in To Watch yet.</p>
      ) : (
        <div style={styles.toWatchList}>
          {movies.map((item) => (
            <div key={item.id} style={styles.toWatchCard}>
              <img src={`${IMG_BASE}${item.poster_path}`} style={styles.toWatchPoster} alt={item.title} loading="lazy" />
              <div style={styles.toWatchMeta}>
                <p style={styles.movieTitle}>{item.title || ''}</p>
                <div style={styles.metaRow}>
                  <span style={styles.tag}>{toYearString(item.release_date)}</span>
                  <span style={styles.ratingTag}>IMDb {Number(item.vote_average || 0).toFixed(1)}</span>
                </div>
                <div style={styles.toWatchActions}>
                  <button style={{ ...styles.iconButton, ...styles.acceptButton }} onClick={() => onMarkSeen(item.id)} aria-label="Mark as seen">
                    <span style={styles.iconButtonText}>✓</span>
                  </button>
                  <button style={{ ...styles.iconButton, ...styles.removeButton }} onClick={() => onRemoveFromToWatch(item.id)} aria-label="Remove from To Watch">
                    <span style={styles.iconButtonText}>🗑</span>
                  </button>
                  <button style={{ ...styles.iconButton, ...styles.toWatchIconButton }} onClick={() => onOpenDetails(item)} aria-label="View details">
                    <span style={styles.iconButtonText}>ⓘ</span>
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
