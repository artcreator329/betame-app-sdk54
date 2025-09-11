import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  'Smileys & People': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
    '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
  ],
  'Animals & Nature': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
    '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
    '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
    '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
  ],
  'Food & Drink': [
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒',
    '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
    '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖',
    '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓',
    '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆',
  ],
  'Activities': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
    '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
    '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸',
    '🥌', '🎿', '⛷', '🏂', '🪂', '🏋', '🤼', '🤸', '⛹', '🤺',
    '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆',
  ],
  'Objects': [
    '⌚', '📱', '📲', '💻', '⌨', '🖥', '🖨', '🖱', '🖲', '🕹',
    '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥',
    '📽', '🎞', '📞', '☎', '📟', '📠', '📺', '📻', '🎙', '🎚',
    '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛', '⏳', '📡', '🔋',
    '🔌', '💡', '🔦', '🕯', '🪔', '🧯', '🛢', '💸', '💵', '💴',
  ],
  'Symbols': [
    '❤', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮',
    '✝', '☪', '🕉', '☸', '✡', '🔯', '🕎', '☯', '☦', '🛐',
    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
    '♑', '♒', '♓', '🆔', '⚛', '🉑', '☢', '☣', '📴', '📳',
  ],
};

export default function EmojiPicker({ visible, onClose, onEmojiSelect }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = React.useState('Smileys & People');

  const handleEmojiPress = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Choose an emoji
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabs}
          >
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive,
                  ]}
                >
                  {category.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Emoji Grid */}
          <ScrollView style={styles.emojiContainer}>
            <View style={styles.emojiGrid}>
              {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiButton}
                  onPress={() => handleEmojiPress(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  categoryTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    maxHeight: 50,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    marginVertical: 4,
  },
  categoryTabActive: {
    backgroundColor: '#F2F2F7',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  categoryTextActive: {
    color: '#1C1C1E',
  },
  emojiContainer: {
    flex: 1,
    padding: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
  },
});