import { styles } from '../styles';

export function FilterPanel({
  yearFrom,
  yearTo,
  ratingMin,
  ratingMax,
  selectedGenreNames,
  onYearFromChange,
  onYearToChange,
  onRatingMinChange,
  onRatingMaxChange,
  onOpenGenres,
  onApply,
  onClearSeen,
}) {
  return (
    <div style={styles.filters}>
      <div style={styles.row}>
        <input value={yearFrom} onChange={(e) => onYearFromChange(e.target.value)} style={styles.input} placeholder="Year from" inputMode="numeric" />
        <input value={yearTo} onChange={(e) => onYearToChange(e.target.value)} style={styles.input} placeholder="Year to" inputMode="numeric" />
      </div>
      <div style={styles.row}>
        <input value={ratingMin} onChange={(e) => onRatingMinChange(e.target.value)} style={styles.input} placeholder="Rating min" inputMode="decimal" />
        <input value={ratingMax} onChange={(e) => onRatingMaxChange(e.target.value)} style={styles.input} placeholder="Rating max" inputMode="decimal" />
      </div>
      <button style={styles.genreButton} onClick={onOpenGenres}>
        <span style={styles.genreButtonText}>{selectedGenreNames || 'Select genres'}</span>
      </button>
      <div style={styles.row}>
        <button style={styles.button} onClick={onApply}>
          <span style={styles.buttonText}>Apply</span>
        </button>
        <button style={styles.ghostButton} onClick={onClearSeen}>
          <span style={styles.ghostButtonText}>Clear Hidden</span>
        </button>
      </div>
    </div>
  );
}
