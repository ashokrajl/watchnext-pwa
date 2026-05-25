import { styles } from '../styles';

export function AppMenu({ visible, onClose, onSelectScreen }) {
  if (!visible) return null;

  return (
    <div style={styles.menuBackdrop} onClick={onClose}>
      <div style={styles.menuPanel} onClick={(e) => e.stopPropagation()}>
        {['discover', 'toWatch', 'kids', 'tamil'].map((s) => (
          <button key={s} style={styles.menuItem} onClick={() => onSelectScreen(s)}>
            <span style={styles.menuItemText}>
              {{ discover: 'Discover', toWatch: 'To Watch', kids: 'Kids', tamil: 'Tamil' }[s]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
