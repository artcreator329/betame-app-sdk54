import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MessageCircle, Trash2, User, Send } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { UserChat } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useUserChats } from '@/hooks/useSupabaseChat';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { participantId } = useLocalSearchParams();
  const { chats, isLoading, error, loadChats } = useUserChats(user?.id || '');
  
  // State for desktop two-column layout
  const [selectedChat, setSelectedChat] = useState<UserChat | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [message, setMessage] = useState('');

  // Check if we're on desktop web
  useEffect(() => {
    setIsDesktop(Platform.OS === 'web' && width > 768);
  }, [width]);

  // Handle chat selection for desktop layout
  const handleChatSelect = (chat: UserChat) => {
    setSelectedChat(chat);
    if (!isDesktop) {
      // On mobile, navigate to chat detail
      router.push(`/chat/${chat.participantId}`);
    }
  };

  // Handle back navigation for desktop
  const handleBack = () => {
    if (isDesktop && selectedChat) {
      setSelectedChat(null);
    } else {
      router.back();
    }
  };

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
              
              // If this was the selected chat on desktop, clear selection
              if (isDesktop && selectedChat?.id === chatId) {
                setSelectedChat(null);
              }
              
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

  // Check if user is authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please sign in to view messages</Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Desktop two-column layout
  if (isDesktop) {
    return (
      <SafeAreaView style={styles.desktopContainer}>
        {/* Left Column - Chat List */}
        <View style={styles.desktopLeftColumn}>
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopHeaderTitle}>Messages</Text>
            <TouchableOpacity>
              <Search size={24} color="#1D1D1F" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.desktopChatList} showsVerticalScrollIndicator={false}>
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
                <View key={chat.id} style={[
                  styles.desktopChatItem,
                  selectedChat?.id === chat.id && styles.desktopChatItemSelected
                ]}>
                  <TouchableOpacity
                    style={styles.desktopChatTouchable}
                    onPress={() => handleChatSelect(chat)}
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
        </View>

        {/* Right Column - Chat Detail */}
        <View style={styles.desktopRightColumn}>
          {selectedChat ? (
            <View style={styles.desktopChatContainer}>
              {/* Chat Header */}
              <View style={styles.desktopChatHeader}>
                <View style={styles.desktopChatHeaderInfo}>
                  <Image 
                    source={{ 
                      uri: selectedChat.participantImage && !selectedChat.participantImage.includes('placeholder') 
                        ? selectedChat.participantImage 
                        : 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400'
                    }} 
                    style={styles.desktopChatHeaderAvatar} 
                  />
                  <View style={styles.desktopChatHeaderText}>
                    <Text style={styles.desktopChatHeaderName}>{selectedChat.participantName}</Text>
                    <Text style={styles.desktopChatHeaderStatus}>Active now</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.desktopChatHeaderButton}
                  onPress={() => router.push(`/chat/${selectedChat.participantId}`)}
                >
                  <Text style={styles.desktopChatHeaderButtonText}>Open Full Chat</Text>
                </TouchableOpacity>
              </View>

              {/* Chat Messages Area */}
              <View style={styles.desktopChatMessages}>
                <View style={styles.desktopChatPlaceholder}>
                  <MessageCircle size={48} color="#8E8E93" />
                  <Text style={styles.desktopChatPlaceholderTitle}>Chat Preview</Text>
                  <Text style={styles.desktopChatPlaceholderText}>
                    Click "Open Full Chat" to view the complete conversation with {selectedChat.participantName}
                  </Text>
                </View>
              </View>

              {/* Chat Input */}
              <View style={styles.desktopChatInput}>
                <View style={styles.desktopChatInputWrapper}>
                  <TextInput
                    style={styles.desktopChatTextInput}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Type a message..."
                    placeholderTextColor="#8E8E93"
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.desktopChatSendButton,
                      message.trim() ? styles.desktopChatSendButtonActive : styles.desktopChatSendButtonInactive
                    ]}
                    onPress={() => {
                      if (message.trim()) {
                        router.push(`/chat/${selectedChat.participantId}?prefilledMessage=${encodeURIComponent(message.trim())}`);
                      }
                    }}
                    disabled={!message.trim()}
                  >
                    <Send size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.desktopEmptyState}>
              <MessageCircle size={64} color="#8E8E93" />
              <Text style={styles.desktopEmptyTitle}>Select a conversation</Text>
              <Text style={styles.desktopEmptySubtitle}>Choose a chat from the list to start messaging</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Mobile layout (existing code)
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
  // Desktop styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
  },
  desktopLeftColumn: {
    width: 350,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
  },
  desktopRightColumn: {
    flex: 1,
    backgroundColor: 'white',
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  desktopHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  desktopChatList: {
    flex: 1,
  },
  desktopChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  desktopChatItemSelected: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  desktopChatTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  desktopChatContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  desktopChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  desktopChatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  desktopChatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  desktopChatHeaderText: {
    flex: 1,
  },
  desktopChatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  desktopChatHeaderStatus: {
    fontSize: 14,
    color: '#8E8E93',
  },
  desktopChatHeaderButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  desktopChatHeaderButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  desktopChatMessages: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  desktopChatPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  desktopChatPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  desktopChatPlaceholderText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  desktopChatInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  desktopChatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  desktopChatTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
    maxHeight: 100,
    paddingVertical: 4,
  },
  desktopChatSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  desktopChatSendButtonActive: {
    backgroundColor: '#007AFF',
  },
  desktopChatSendButtonInactive: {
    backgroundColor: '#8E8E93',
  },
  desktopEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  desktopEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  desktopEmptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Mobile styles (existing)
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
  signInButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});