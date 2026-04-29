import { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppHeader } from './src/components/AppHeader.jsx';
import { AppMenu } from './src/components/AppMenu.jsx';
import { BrowseScreen } from './src/components/BrowseScreen.jsx';
import { GenrePicker } from './src/components/GenrePicker.jsx';
import { ToWatchScreen } from './src/components/ToWatchScreen.jsx';
import { useCardFlips } from './src/hooks/useCardFlips';
import { useMovieBrowser } from './src/hooks/useMovieBrowser';
import { useMovieLists } from './src/hooks/useMovieLists';
import { styles } from './src/styles';

export default function App() {
  const [error, setError] = useState('');
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState('discover');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <AppHeader
        screen={screen}
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
          getFlipValue={cardFlips.getFlipValue}
          onOpenGenres={() => setGenrePickerOpen(true)}
          onClearSeen={movieLists.clearSeen}
          onLoadNextPage={browser.loadNextPage}
          onToggleCardFlip={cardFlips.toggleCardFlip}
          onMarkSeen={movieLists.markSeen}
          onMarkRejected={movieLists.markRejected}
          onAddToWatch={movieLists.addToWatch}
        />
      ) : (
        <ToWatchScreen
          movies={movieLists.toWatch}
          onMarkSeen={movieLists.markSeen}
          onRemoveFromToWatch={movieLists.removeFromToWatch}
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
    </SafeAreaView>
  );
}
