import { useState } from 'react';

import { AppHeader } from './src/components/AppHeader.jsx';
import { AppMenu } from './src/components/AppMenu.jsx';
import { AiPicksScreen } from './src/components/AiPicksScreen.jsx';
import { BrowseScreen } from './src/components/BrowseScreen.jsx';
import { GenrePicker } from './src/components/GenrePicker.jsx';
import { MovieDetailModal } from './src/components/MovieDetailModal.jsx';
import { ToWatchScreen } from './src/components/ToWatchScreen.jsx';
import { useCardFlips } from './src/hooks/useCardFlips';
import { useMovieBrowser } from './src/hooks/useMovieBrowser';
import { useMovieLists } from './src/hooks/useMovieLists';
import { recordTaste } from './src/lib/tasteProfile';
import { styles } from './src/styles';

export default function App() {
  const [error, setError] = useState('');
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState('discover');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailMovie, setDetailMovie] = useState(null);

  const movieLists = useMovieLists({ setError });
  const browser = useMovieBrowser({
    screen,
    seen: movieLists.seen,
    rejected: movieLists.rejected,
    toWatch: movieLists.toWatch,
    setError,
  });
  const cardFlips = useCardFlips();

  const handleSelectScreen = (nextScreen) => {
    if (nextScreen !== 'toWatch') {
      browser.resetBrowseState();
    }
    setScreen(nextScreen);
    setMenuOpen(false);
  };

  // Record titles for the AI taste profile whenever the user judges a movie.
  // movieHint covers movies outside the current browse list (AI picks, To Watch).
  const findMovie = (id) =>
    browser.visibleMovies.find((m) => m.id === id) ||
    movieLists.toWatch.find((m) => m.id === id) ||
    null;

  const handleMarkSeen = (id, movieHint) => {
    const movie = movieHint || findMovie(id);
    if (movie) recordTaste(movie, 'liked');
    movieLists.markSeen(id);
  };

  const handleMarkRejected = (id, movieHint) => {
    const movie = movieHint || findMovie(id);
    if (movie) recordTaste(movie, 'disliked');
    movieLists.markRejected(id);
  };

  return (
    <div style={styles.container}>
      <AppHeader
        screen={screen}
        syncState={movieLists.syncState}
        onToggleFilters={() => setFiltersOpen((prev) => !prev)}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {browser.isBrowseScreen ? (
        <BrowseScreen
          screen={screen}
          filtersOpen={filtersOpen}
          movies={browser.visibleMovies}
          error={error}
          loading={browser.loading}
          page={browser.page}
          totalPages={browser.totalPages}
          filterState={{
            yearFrom: browser.yearFrom,
            yearTo: browser.yearTo,
            ratingMin: browser.ratingMin,
            ratingMax: browser.ratingMax,
            selectedGenreNames: browser.selectedGenreNames,
            setYearFrom: browser.setYearFrom,
            setYearTo: browser.setYearTo,
            setRatingMin: browser.setRatingMin,
            setRatingMax: browser.setRatingMax,
            applyFilters: browser.applyFilters,
          }}
          flippedCards={cardFlips.flippedCards}
          onOpenGenres={() => setGenrePickerOpen(true)}
          onClearSeen={movieLists.clearSeen}
          onLoadNextPage={browser.loadNextPage}
          onToggleCardFlip={cardFlips.toggleCardFlip}
          onMarkSeen={handleMarkSeen}
          onMarkRejected={handleMarkRejected}
          onAddToWatch={movieLists.addToWatch}
          onOpenDetails={setDetailMovie}
        />
      ) : screen === 'toWatch' ? (
        <ToWatchScreen
          movies={movieLists.toWatch}
          onMarkSeen={handleMarkSeen}
          onRemoveFromToWatch={movieLists.removeFromToWatch}
          onOpenDetails={setDetailMovie}
        />
      ) : (
        <AiPicksScreen
          watchlist={movieLists.toWatch}
          seenIds={movieLists.seen}
          rejectedIds={movieLists.rejected}
          onMarkSeen={handleMarkSeen}
          onAddToWatch={movieLists.addToWatch}
          onOpenDetails={setDetailMovie}
        />
      )}

      <AppMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelectScreen={handleSelectScreen}
      />

      <GenrePicker
        visible={genrePickerOpen}
        genres={browser.genres}
        selectedGenres={browser.selectedGenres}
        onToggleGenre={browser.toggleGenre}
        onClose={() => setGenrePickerOpen(false)}
      />

      {detailMovie && (
        <MovieDetailModal
          movie={detailMovie}
          onClose={() => setDetailMovie(null)}
          onMarkSeen={handleMarkSeen}
          onAddToWatch={movieLists.addToWatch}
        />
      )}
    </div>
  );
}
