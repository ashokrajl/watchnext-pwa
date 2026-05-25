import { styles } from '../styles';

export function GenrePicker({ visible, genres, selectedGenres, onToggleGenre, onClose }) {
  if (!visible) return null;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <p style={styles.modalTitle}>Select genres</p>
        <div style={styles.genreList}>
          {genres.map((genre) => {
            const active = selectedGenres.includes(genre.id);
            return (
              <button key={genre.id} style={styles.genreItem} onClick={() => onToggleGenre(genre.id)}>
                <span style={styles.genreItemText}>{genre.name}</span>
                <span style={active ? styles.genreCheckOn : styles.genreCheckOff}>
                  {active ? 'Selected' : 'Select'}
                </span>
              </button>
            );
          })}
        </div>
        <button style={styles.button} onClick={onClose}>
          <span style={styles.buttonText}>Done</span>
        </button>
      </div>
    </div>
  );
}
