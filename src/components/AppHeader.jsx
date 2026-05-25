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
    <div style={styles.header}>
      <div style={styles.headerLeft}>
        <p style={styles.title}>{TITLES[screen]}</p>
        <p style={styles.subtitle}>{SUBTITLES[screen]}</p>
      </div>
      <div style={styles.headerActions}>
        {screen === 'discover' && (
          <button style={styles.menuButton} onClick={onToggleFilters} aria-label="Toggle filters">
            <span style={styles.menuButtonText}>⚲</span>
          </button>
        )}
        <button style={styles.menuButton} onClick={onOpenMenu} aria-label="Open menu">
          <span style={styles.menuButtonText}>☰</span>
        </button>
      </div>
    </div>
  );
}
