import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { IMG_BASE } from '../constants';
import { styles } from '../styles';
import { toYearString } from '../utils/movie';

export function MovieCard({
  movie,
  flipValue,
  isFlipped,
  onToggleFlip,
  onMarkSeen,
  onMarkRejected,
  onAddToWatch,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardFlipContainer}>
        <Animated.View
          pointerEvents={isFlipped ? 'none' : 'auto'}
          style={[
            styles.cardFace,
            styles.cardFrontFace,
            {
              transform: [
                { perspective: 1000 },
                {
                  rotateY: flipValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={() => onToggleFlip(movie)}>
            <Image source={`${IMG_BASE}${movie.poster_path}`} style={styles.poster} contentFit="cover" />
            <MovieSummary movie={movie} />
          </Pressable>
          <View style={styles.cardActions}>
            <Pressable style={[styles.iconButton, styles.acceptButton]} onPress={() => onMarkSeen(movie.id)} accessibilityLabel="Mark as seen">
              <Text style={styles.iconButtonText}>✓</Text>
            </Pressable>
            <Pressable style={[styles.iconButton, styles.rejectButton]} onPress={() => onMarkRejected(movie.id)} accessibilityLabel="Skip movie">
              <Text style={styles.iconButtonText}>✕</Text>
            </Pressable>
            <Pressable style={[styles.iconButton, styles.toWatchIconButton]} onPress={() => onAddToWatch(movie)} accessibilityLabel="Add to To Watch">
              <Text style={styles.iconButtonText}>＋</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents={isFlipped ? 'auto' : 'none'}
          style={[
            styles.cardFace,
            styles.cardBackFace,
            {
              transform: [
                { perspective: 1000 },
                {
                  rotateY: flipValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['180deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.cardBack} onPress={() => onToggleFlip(movie)}>
            <ScrollView contentContainerStyle={styles.cardBackScrollContent} showsVerticalScrollIndicator={false}>
              <MovieSummary movie={movie} />
              <Text style={styles.detailLine}>Votes: {Number(movie.vote_count || 0).toLocaleString()}</Text>
              <Text style={styles.detailLine}>Original language: {(movie.original_language || 'n/a').toUpperCase()}</Text>
              <Text style={styles.overviewText}>{movie.overview || 'No description available.'}</Text>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function MovieSummary({ movie }) {
  return (
    <>
      <Text style={styles.movieTitle} numberOfLines={2}>{movie.title || ''}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.tag}>{toYearString(movie.release_date)}</Text>
        <Text style={styles.ratingTag}>IMDb {Number(movie.vote_average || 0).toFixed(1)}</Text>
      </View>
    </>
  );
}
