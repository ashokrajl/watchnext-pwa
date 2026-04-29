import { Pressable, Text, TextInput, View } from 'react-native';

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
    <View style={styles.filters}>
      <View style={styles.row}>
        <TextInput value={yearFrom} onChangeText={onYearFromChange} style={styles.input} placeholder="Year from" placeholderTextColor="#94a3b8" keyboardType="number-pad" />
        <TextInput value={yearTo} onChangeText={onYearToChange} style={styles.input} placeholder="Year to" placeholderTextColor="#94a3b8" keyboardType="number-pad" />
      </View>
      <View style={styles.row}>
        <TextInput value={ratingMin} onChangeText={onRatingMinChange} style={styles.input} placeholder="Rating min" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
        <TextInput value={ratingMax} onChangeText={onRatingMaxChange} style={styles.input} placeholder="Rating max" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
      </View>
      <Pressable style={styles.genreButton} onPress={onOpenGenres}>
        <Text style={styles.genreButtonText} numberOfLines={1}>
          {selectedGenreNames || 'Select genres'}
        </Text>
      </Pressable>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={onApply}>
          <Text style={styles.buttonText}>Apply</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={onClearSeen}>
          <Text style={styles.ghostButtonText}>Clear Hidden</Text>
        </Pressable>
      </View>
    </View>
  );
}
