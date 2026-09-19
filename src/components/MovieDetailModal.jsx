import { useEffect } from 'react';

import {
  formatRuntime,
  getCast,
  getProviders,
  getTrailerKey,
  useMovieDetails,
} from '../hooks/useMovieDetails';
import { toYearString } from '../utils/movie';

const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';
const CAST_BASE = 'https://image.tmdb.org/t/p/w185';
const LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

export function MovieDetailModal({ movie, onClose, onMarkSeen, onAddToWatch }) {
  const { detail, loading, error, reload } = useMovieDetails(movie?.id);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!movie) return null;

  const trailerKey = detail ? getTrailerKey(detail) : null;
  const cast = detail ? getCast(detail) : [];
  const providerGroups = detail ? getProviders(detail) : null;
  const backdrop = detail?.backdrop_path ? `${BACKDROP_BASE}${detail.backdrop_path}` : null;
  const genres = detail?.genres?.map((g) => g.name) || [];
  const metaBits = [
    toYearString(movie.release_date),
    formatRuntime(detail?.runtime),
    typeof detail?.vote_average === 'number' && detail.vote_average > 0
      ? `★ ${detail.vote_average.toFixed(1)}`
      : null,
  ].filter(Boolean);

  return (
    <div style={s.backdrop} onClick={onClose} role="presentation">
      <div
        style={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={movie.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={s.closeBtn} onClick={onClose} aria-label="Close details">
          ✕
        </button>

        {backdrop && (
          <div style={s.hero}>
            <img src={backdrop} alt="" style={s.heroImg} loading="lazy" />
            <div style={s.heroFade} />
          </div>
        )}

        <div style={s.body}>
          <h2 style={s.title}>{movie.title}</h2>
          {metaBits.length > 0 && <div style={s.meta}>{metaBits.join('  •  ')}</div>}
          {detail?.tagline && <div style={s.tagline}>“{detail.tagline}”</div>}
          {genres.length > 0 && (
            <div style={s.genreRow}>
              {genres.map((g) => (
                <span key={g} style={s.genreChip}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {loading && (
            <div style={s.center}>
              <div className="spinner" />
            </div>
          )}

          {error && !loading && (
            <div style={s.center}>
              <p style={s.errorText}>Couldn't load details. {error}</p>
              <button style={s.retryBtn} onClick={reload}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {trailerKey && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Trailer</h3>
                  <div style={s.videoWrap}>
                    <iframe
                      title={`${movie.title} trailer`}
                      src={`https://www.youtube-nocookie.com/embed/${trailerKey}`}
                      style={s.video}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {(detail.overview || movie.overview) && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Overview</h3>
                  <p style={s.overview}>{detail.overview || movie.overview}</p>
                </div>
              )}

              {cast.length > 0 && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Cast</h3>
                  <div style={s.castRow}>
                    {cast.map((person) => (
                      <div key={person.cast_id ?? person.credit_id} style={s.castCard}>
                        {person.profile_path ? (
                          <img
                            src={`${CAST_BASE}${person.profile_path}`}
                            alt={person.name}
                            style={s.castImg}
                            loading="lazy"
                          />
                        ) : (
                          <div style={s.castImgPlaceholder}>?</div>
                        )}
                        <div style={s.castName}>{person.name}</div>
                        <div style={s.castChar}>{person.character}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={s.section}>
                <h3 style={s.sectionTitle}>Where to watch</h3>
                {providerGroups ? (
                  providerGroups.map((group) => (
                    <div key={group.label} style={s.providerGroup}>
                      <div style={s.providerLabel}>{group.label}</div>
                      <div style={s.providerLogos}>
                        {group.providers.map((p) => (
                          <img
                            key={p.provider_id}
                            src={`${LOGO_BASE}${p.logo_path}`}
                            alt={p.provider_name}
                            title={p.provider_name}
                            style={s.providerLogo}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={s.muted}>Not available to stream in your region right now.</p>
                )}
              </div>
            </>
          )}

          <div style={s.actions}>
            <button
              style={s.actionBtn}
              onClick={() => {
                onMarkSeen(movie.id, movie);
                onClose();
              }}
            >
              ✓ Seen
            </button>
            <button style={s.actionBtn} onClick={() => onAddToWatch(movie)}>
              ＋ To Watch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '24px 12px',
    overflowY: 'auto',
    zIndex: 1000,
  },
  panel: {
    position: 'relative',
    width: '100%',
    maxWidth: 560,
    background: '#15151d',
    color: '#f2f2f5',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    margin: 'auto 0',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
  },
  hero: { position: 'relative', height: 220 },
  heroImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  heroFade: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(21,21,29,0) 40%, #15151d 100%)',
  },
  body: { padding: '4px 20px 20px' },
  title: { margin: '0 0 6px', fontSize: 24, lineHeight: 1.25 },
  meta: { color: '#b8b8c0', fontSize: 14, marginBottom: 8 },
  tagline: { color: '#8e8e93', fontStyle: 'italic', fontSize: 14, marginBottom: 10 },
  genreRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  genreChip: {
    background: 'rgba(245,185,66,0.14)',
    color: '#f5b942',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
  },
  section: { marginTop: 18 },
  sectionTitle: { margin: '0 0 10px', fontSize: 15, letterSpacing: 0.4, color: '#f5b942' },
  videoWrap: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#000',
  },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' },
  overview: { margin: 0, lineHeight: 1.55, color: '#d8d8de', fontSize: 14.5 },
  castRow: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingBottom: 6,
    WebkitOverflowScrolling: 'touch',
  },
  castCard: { flex: '0 0 84px', textAlign: 'center' },
  castImg: { width: 84, height: 112, objectFit: 'cover', borderRadius: 8, display: 'block' },
  castImgPlaceholder: {
    width: 84,
    height: 112,
    borderRadius: 8,
    background: '#26262f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#555',
    fontSize: 24,
  },
  castName: { fontSize: 12, marginTop: 6, fontWeight: 600 },
  castChar: { fontSize: 11, color: '#8e8e93', marginTop: 2 },
  providerGroup: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  providerLabel: { width: 56, fontSize: 13, color: '#b8b8c0' },
  providerLogos: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  providerLogo: { width: 40, height: 40, borderRadius: 8 },
  muted: { color: '#8e8e93', fontSize: 14, margin: 0 },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' },
  errorText: { color: '#ff8a8a', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 10,
    padding: '8px 18px',
    borderRadius: 999,
    border: '1px solid #f5b942',
    background: 'transparent',
    color: '#f5b942',
    cursor: 'pointer',
  },
  actions: { display: 'flex', gap: 10, marginTop: 22 },
  actionBtn: {
    flex: 1,
    padding: '12px 0',
    borderRadius: 12,
    border: 'none',
    background: '#f5b942',
    color: '#1a1a1a',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
};
