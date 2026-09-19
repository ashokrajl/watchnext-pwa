import { IMG_BASE } from '../constants';
import { styles } from '../styles';
import { toYearString } from '../utils/movie';

export function MovieCard({
  movie,
  isFlipped,
  onToggleFlip,
  onMarkSeen,
  onMarkRejected,
  onAddToWatch,
}) {
  // CSS 3D card flip — no Animated needed
  const containerStyle = {
    flex: 1,
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.45s ease',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };

  const faceBase = {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  return (
    <div style={styles.card}>
      <div style={containerStyle}>
        {/* Front */}
        <div style={{ ...faceBase, ...styles.cardFrontFace }}>
          <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => onToggleFlip(movie)}>
            <img src={`${IMG_BASE}${movie.poster_path}`} style={styles.poster} alt={movie.title} loading="lazy" />
            <MovieSummary movie={movie} />
          </div>
          <div style={styles.cardActions}>
            <button style={{ ...styles.iconButton, ...styles.acceptButton }} onClick={() => onMarkSeen(movie.id)} aria-label="Mark as seen">
              <span style={styles.iconButtonText}>✓</span>
            </button>
            <button style={{ ...styles.iconButton, ...styles.rejectButton }} onClick={() => onMarkRejected(movie.id)} aria-label="Skip movie">
              <span style={styles.iconButtonText}>✕</span>
            </button>
            <button style={{ ...styles.iconButton, ...styles.toWatchIconButton }} onClick={() => onAddToWatch(movie)} aria-label="Add to To Watch">
              <span style={styles.iconButtonText}>＋</span>
            </button>
          </div>
        </div>

        {/* Back */}
        <div style={{ ...faceBase, ...styles.cardBackFace, transform: 'rotateY(180deg)' }}>
          <div style={{ ...styles.cardBack, cursor: 'pointer', overflowY: 'auto' }} onClick={() => onToggleFlip(movie)}>
            <MovieSummary movie={movie} />
            <p style={styles.detailLine}>Votes: {Number(movie.vote_count || 0).toLocaleString()}</p>
            <p style={styles.detailLine}>Original language: {(movie.original_language || 'n/a').toUpperCase()}</p>
            <p style={styles.overviewText}>{movie.overview || 'No description available.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovieSummary({ movie }) {
  return (
    <>
      <p style={styles.movieTitle}>{movie.title || ''}</p>
      <div style={styles.metaRow}>
        <span style={styles.tag}>{toYearString(movie.release_date)}</span>
        <span style={styles.ratingTag}>IMDb {Number(movie.vote_average || 0).toFixed(1)}</span>
      </div>
    </>
  );
}
