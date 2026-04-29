import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { styles } from '../styles';

export function GenrePicker({ visible, genres, selectedGenres, onToggleGenre, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <Text style={styles.modalTitle}>Select genres</Text>
          <ScrollView style={styles.genreList}>
            {genres.map((genre) => {
              const active = selectedGenres.includes(genre.id);
              return (
                <Pressable key={genre.id} style={styles.genreItem} onPress={() => onToggleGenre(genre.id)}>
                  <Text style={styles.genreItemText}>{genre.name}</Text>
                  <Text style={active ? styles.genreCheckOn : styles.genreCheckOff}>{active ? 'Selected' : 'Select'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
