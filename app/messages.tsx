import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MessageCircle, Trash2, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { UserChat } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useUserChats } from '@/hooks/useSupabaseChat';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { chats, isLoading, error, loadChats } = useUserChats(user?.id || '');

  const handleDeleteConversation = async (chatId: string, participantName: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete your conversation with ${participantName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Starting deletion for chat:', chatId);
              
              // Delete all messages in the chat
              const { data: deletedMessages, error: messagesError } = await supabase
                .from('chat_messages')
                .delete()
                .eq('chat_id', chatId)
                .select();
              
              if (messagesError) {
                console.error('❌ Error deleting messages:', messagesError);
                throw messagesError;
              }
              
              console.log('✅ Deleted messages:', deletedMessages?.length || 0);
              
              // Delete the chat itself
              const { data: deletedChat, error: chatError } = await supabase
                .from('chats')
                .delete()
                .eq('id', chatId)
                .select();
              
              if (chatError) {
                console.error('❌ Error deleting chat:', chatError);
                throw chatError;
              }
              
              console.log('✅ Deleted chat:', deletedChat);
              
              // Refresh the chats list
              console.log('🔄 Refreshing chats list...');
              await loadChats();
              console.log('✅ Chat list refreshed');
              
              Alert.alert('Success', 'Conversation deleted successfully.');
            } catch (error) {
              console.error('❌ Error deleting conversation:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Error', `Failed to delete conversation: ${errorMessage}`);
            }
          },
        },
      ]
    );
  };

  const formatLastMessageTime = (lastMessageAt: string | null) => {
    if (!lastMessageAt) return '';
    
    const messageDate = new Date(lastMessageAt);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { 
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySubtitle}>Start a conversation by visiting someone's profile</Text>
          </View>
        ) : (
          chats.map((chat) => (
            <View key={chat.id} style={styles.chatItem}>
              <TouchableOpacity
                style={styles.chatTouchable}
                onPress={() => router.push(`/chat/${chat.participantId}`)}
              >
                <View style={styles.avatarContainer}>
                  {chat.participantImage && !chat.participantImage.includes('placeholder') ? (
                    <Image source={{ uri: chat.participantImage }} style={styles.chatAvatar} />
                  ) : (
                    <View style={styles.defaultChatAvatar}>
                      <User size={20} color="#8E8E93" />
                    </View>
                  )}
                  {(chat.unreadCount || 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {(chat.unreadCount || 0) > 99 ? '99+' : chat.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.chatContent}>
                  <View style={styles.chatHeader}>
                    <Text style={[
                      styles.chatName,
                      (chat.unreadCount || 0) > 0 && styles.chatNameUnread
                    ]}>{chat.participantName}</Text>
                    <Text style={styles.chatTime}>{formatLastMessageTime(chat.lastMessageAt)}</Text>
                  </View>
                  <Text style={[
                    styles.lastMessage,
                    (chat.unreadCount || 0) > 0 && styles.lastMessageUnread
                  ]} numberOfLines={2}>
                    {chat.lastMessage || 'Start a conversation'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteConversation(chat.id, chat.participantName)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
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
  chatTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultChatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  chatNameUnread: {
    fontWeight: 'bold',
    color: '#000',
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
  lastMessageUnread: {
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});