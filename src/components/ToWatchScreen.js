import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { IMG_BASE } from '../constants';
import { styles } from '../styles';
import { toYearString } from '../utils/movie';

export function ToWatchScreen({ movies, onMarkSeen, onRemoveFromToWatch }) {
  return (
    <FlatList
      data={movies}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.toWatchList}
      ListEmptyComponent={<Text style={styles.emptyText}>No movies in To Watch yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.toWatchCard}>
          <Image source={`${IMG_BASE}${item.poster_path}`} style={styles.toWatchPoster} contentFit="cover" />
          <View style={styles.toWatchMeta}>
            <Text style={styles.movieTitle} numberOfLines={2}>{item.title || ''}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.tag}>{toYearString(item.release_date)}</Text>
              <Text style={styles.ratingTag}>IMDb {Number(item.vote_average || 0).toFixed(1)}</Text>
            </View>
            <View style={styles.toWatchActions}>
              <Pressable style={[styles.iconButton, styles.acceptButton]} onPress={() => onMarkSeen(item.id)} accessibilityLabel="Mark as seen">
                <Text style={styles.iconButtonText}>✓</Text>
              </Pressable>
              <Pressable style={[styles.iconButton, styles.removeButton]} onPress={() => onRemoveFromToWatch(item.id)} accessibilityLabel="Remove from To Watch">
                <Text style={styles.iconButtonText}>🗑</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    />
  );
}
