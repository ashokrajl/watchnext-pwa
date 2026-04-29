import { Pressable, Text, View } from 'react-native';

import { styles } from '../styles';

const TITLES = {
  discover: 'WatchNext',
  kids: 'Kids',
  tamil: 'Tamil',
  toWatch: 'To Watch',
};

const SUBTITLES = {
  discover: 'Discover popular movies and hide what you have seen.',
  kids: 'Family and PG-safe movie picks for kids.',
  tamil: 'Tamil language movies only.',
  toWatch: 'Movies you saved for later.',
};

export function AppHeader({ screen, onToggleFilters, onOpenMenu }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>{TITLES[screen]}</Text>
        <Text style={styles.subtitle}>{SUBTITLES[screen]}</Text>
      </View>
      <View style={styles.headerActions}>
        {screen === 'discover' && (
          <Pressable style={styles.menuButton} onPress={onToggleFilters} accessibilityLabel="Toggle filters">
            <Text style={styles.menuButtonText}>⚲</Text>
          </Pressable>
        )}
        <Pressable style={styles.menuButton} onPress={onOpenMenu} accessibilityLabel="Open menu">
          <Text style={styles.menuButtonText}>☰</Text>
        </Pressable>
      </View>
    </View>
  );
}
