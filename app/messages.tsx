import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { mockChats } from '@/data/mockChatData';

export default function MessagesScreen() {
  const router = useRouter();

  const getLastMessage = (chatId: string) => {
    const chat = mockChats.find(c => c.id === chatId);
    if (!chat || chat.messages.length === 0) return '';
    
    const lastMessage = chat.messages[chat.messages.length - 1];
    return lastMessage.message;
  };

  const getLastMessageTime = (chatId: string) => {
    const chat = mockChats.find(c => c.id === chatId);
    if (!chat || chat.messages.length === 0) return '';
    
    const lastMessage = chat.messages[chat.messages.length - 1];
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return lastMessage.timestamp.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else {
      return lastMessage.timestamp.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity>
          <Search size={24} color="#1D1D1F" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
        {mockChats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatItem}
            onPress={() => router.push(`/chat/${chat.participantId}`)}
          >
            <Image source={{ uri: chat.participantImage }} style={styles.chatAvatar} />
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{chat.participantName}</Text>
                <Text style={styles.chatTime}>{getLastMessageTime(chat.id)}</Text>
              </View>
              {chat.serviceTitle && (
                <Text style={styles.serviceTitle}>{chat.serviceTitle}</Text>
              )}
              <Text style={styles.lastMessage} numberOfLines={2}>
                {getLastMessage(chat.id)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  chatTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  serviceTitle: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});