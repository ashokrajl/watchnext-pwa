import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { styles } from '../styles';
import { FilterPanel } from './FilterPanel';
import { MovieCard } from './MovieCard';

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
  getFlipValue,
  onOpenGenres,
  onClearSeen,
  onLoadNextPage,
  onToggleCardFlip,
  onMarkSeen,
  onMarkRejected,
  onAddToWatch,
}) {
  const hasMovies = movies.length > 0;
  const emptyCopy = getEmptyCopy(screen, loading);

  return (
    <>
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

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <MovieCard
            movie={item}
            flipValue={getFlipValue(item.id)}
            isFlipped={flippedCards.has(item.id)}
            onToggleFlip={onToggleCardFlip}
            onMarkSeen={onMarkSeen}
            onMarkRejected={onMarkRejected}
            onAddToWatch={onAddToWatch}
          />
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            {loading ? (
              <>
                <ActivityIndicator color="#22d3ee" />
                <Text style={styles.emptyStateTitle}>Loading movies...</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyStateTitle}>{emptyCopy.title}</Text>
                <Text style={styles.emptyStateText}>{emptyCopy.body}</Text>
                {page <= totalPages && (
                  <Pressable style={[styles.button, styles.emptyStateButton]} onPress={onLoadNextPage}>
                    <Text style={styles.buttonText}>Try next page</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
        ListFooterComponent={(
          <View style={styles.footer}>
            {hasMovies && (
              <Pressable style={styles.button} disabled={loading || page > totalPages} onPress={onLoadNextPage}>
                <Text style={styles.buttonText}>{page > totalPages ? 'No more results' : 'Load more'}</Text>
              </Pressable>
            )}
            {loading && <ActivityIndicator color="#22d3ee" style={styles.loader} />}
          </View>
        )}
      />
    </>
  );
}

function getEmptyCopy(screen, loading) {
  if (loading) {
    return { title: 'Loading movies...', body: '' };
  }

  if (screen === 'tamil') {
    return {
      title: 'No Tamil movies loaded yet',
      body: 'If this keeps happening, restart the local dev server so it picks up the Tamil API filter.',
    };
  }

  if (screen === 'kids') {
    return {
      title: 'No kids movies found',
      body: 'Try widening the year range or loading another page.',
    };
  }

  return {
    title: 'No movies found',
    body: 'Try widening your filters or loading another page.',
  };
}
