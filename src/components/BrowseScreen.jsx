import { styles } from '../styles';
import { FilterPanel } from './FilterPanel.jsx';
import { MovieCard } from './MovieCard.jsx';

export function BrowseScreen({
  screen,
  filtersOpen,
  movies,
  error,
  loading,
  page,
  totalPages,
  filterState,
  flippedCards,
  onOpenGenres,
  onClearSeen,
  onLoadNextPage,
  onToggleCardFlip,
  onMarkSeen,
  onMarkRejected,
  onAddToWatch,
  onOpenDetails,
}) {
  const hasMovies = movies.length > 0;
  const emptyCopy = getEmptyCopy(screen, loading);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {screen === 'discover' && filtersOpen && (
        <FilterPanel
          yearFrom={filterState.yearFrom}
          yearTo={filterState.yearTo}
          ratingMin={filterState.ratingMin}
          ratingMax={filterState.ratingMax}
          selectedGenreNames={filterState.selectedGenreNames}
          onYearFromChange={filterState.setYearFrom}
          onYearToChange={filterState.setYearTo}
          onRatingMinChange={filterState.setRatingMin}
          onRatingMaxChange={filterState.setRatingMax}
          onOpenGenres={onOpenGenres}
          onApply={filterState.applyFilters}
          onClearSeen={onClearSeen}
        />
      )}

      {!!error && <p style={styles.error}>{error}</p>}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!hasMovies ? (
          <div style={styles.emptyState}>
            {loading ? (
              <>
                <div className="spinner" />
                <p style={styles.emptyStateTitle}>Loading movies...</p>
              </>
            ) : (
              <>
                <p style={styles.emptyStateTitle}>{emptyCopy.title}</p>
                <p style={styles.emptyStateText}>{emptyCopy.body}</p>
                {page <= totalPages && (
                  <button style={{ ...styles.button, ...styles.emptyStateButton }} onClick={onLoadNextPage}>
                    <span style={styles.buttonText}>Try next page</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div style={styles.grid}>
              {movies.map((item) => (
                <MovieCard
                  key={item.id}
                  movie={item}
                  isFlipped={flippedCards.has(item.id)}
                  onToggleFlip={onToggleCardFlip}
                  onMarkSeen={onMarkSeen}
                  onMarkRejected={onMarkRejected}
                  onAddToWatch={onAddToWatch}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
            <div style={styles.footer}>
              <button
                style={styles.button}
                disabled={loading || page > totalPages}
                onClick={onLoadNextPage}
              >
                <span style={styles.buttonText}>
                  {page > totalPages ? 'No more results' : 'Load more'}
                </span>
              </button>
              {loading && <div className="spinner" />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getEmptyCopy(screen, loading) {
  if (loading) return { title: 'Loading movies...', body: '' };
  if (screen === 'tamil') return { title: 'No Tamil movies loaded yet', body: 'Try widening the year range or loading another page.' };
  if (screen === 'kids') return { title: 'No kids movies found', body: 'Try widening the year range or loading another page.' };
  return { title: 'No movies found', body: 'Try widening your filters or loading another page.' };
}
