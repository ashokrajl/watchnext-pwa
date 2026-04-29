import { Modal, Pressable, Text, View } from 'react-native';

import { styles } from '../styles';

export function AppMenu({ visible, onClose, onSelectScreen }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <View style={styles.menuPanel}>
          <Pressable style={styles.menuItem} onPress={() => onSelectScreen('discover')}>
            <Text style={styles.menuItemText}>Discover</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onSelectScreen('toWatch')}>
            <Text style={styles.menuItemText}>To Watch</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onSelectScreen('kids')}>
            <Text style={styles.menuItemText}>Kids</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onSelectScreen('tamil')}>
            <Text style={styles.menuItemText}>Tamil</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
