import { styles } from '../styles';

const TITLES = {
  discover: 'WatchNext',
  aiPicks: '✨ AI Picks',
  kids: 'Kids',
  tamil: 'Tamil',
  toWatch: 'To Watch',
};

const SUBTITLES = {
  discover: 'Discover popular movies and hide what you have seen.',
  aiPicks: 'Personal picks from an AI that knows your taste.',
  kids: 'Family and PG-safe movie picks for kids.',
  tamil: 'Tamil language movies only.',
  toWatch: 'Movies you saved for later.',
};

const SYNC_STYLES = {
  saving: { label: 'Syncing…', color: '#f5a623' },
  saved: { label: 'Synced', color: '#34c759' },
  offline: { label: 'Offline', color: '#8e8e93' },
  error: { label: 'Sync failed', color: '#ff3b30' },
};

export function AppHeader({ screen, syncState, onToggleFilters, onOpenMenu }) {
  const sync = SYNC_STYLES[syncState] || null;
  return (
    <div style={styles.header}>
      <div style={styles.headerLeft}>
        <p style={styles.title}>{TITLES[screen]}</p>
        <p style={styles.subtitle}>{SUBTITLES[screen]}</p>
      </div>
      <div style={styles.headerActions}>
        {sync && (
          <span
            title={sync.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#8e8e93',
              marginRight: 4,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: sync.color,
              }}
            />
            {sync.label}
          </span>
        )}
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
