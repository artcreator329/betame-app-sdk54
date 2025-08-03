import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MoveVertical as MoreVertical, Smile, Send, Shield, Flag, Ban } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChatMessage } from '@/types/chat';
import { chatService, LiveChatMessage } from '@/lib/chat-service';
import { useAuth } from '@/contexts/AuthContext';

interface ModeratedMessage extends ChatMessage {
  isHidden?: boolean;
  moderationReason?: string;
  isReported?: boolean;
  isBlocked?: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { participantId } = useLocalSearchParams();
  const { user, userProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Chat info will be loaded from ChatService
  const chat = { 
    participantName: 'Chat Participant', 
    participantImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
    lastActive: 'Active now'
  };

  useEffect(() => {
    if (!user?.id || !participantId) return;

    const initializeChat = async () => {
      setIsLoading(true);
      
      // Create or get existing chat
      const chatData = await chatService.createOrGetChat(participantId as string, user.id);
      if (chatData) {
        setChatId(chatData.id);
        
        // Load existing messages
        const existingMessages = await chatService.getMessages(chatData.id, user.id);
        const messagesWithIsMe = existingMessages.map(msg => ({
          ...msg,
          isMe: msg.senderId === user.id
        }));
        setMessages(messagesWithIsMe);
        
        // Subscribe to new messages
        const unsubscribe = chatService.subscribeToMessages(
          chatData.id,
          user.id,
          (newMessage) => {
            const messageWithIsMe = {
              ...newMessage,
              isMe: newMessage.senderId === user.id
            };
            setMessages(prev => {
              // Avoid duplicates
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) {
                return prev.map(msg => msg.id === newMessage.id ? messageWithIsMe : msg);
              }
              return [...prev, messageWithIsMe];
            });
          },
          (messageId) => {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
          }
        );
        
        return unsubscribe;
      }
      setIsLoading(false);
    };

    const cleanup = initializeChat();
    
    return () => {
      cleanup.then(unsubscribe => unsubscribe?.());
    };
  }, [user?.id, participantId]);

  useEffect(() => {
    // Auto scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Setting up chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If no chat exists and no messages, redirect to messages dashboard
  if (!chat && messages.length === 0 && !isLoading) {
    router.replace('/messages');
    return null;
  }

  if (!chat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diffInDays = Math.floor((now.getTime() - msgTime.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return msgTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return msgTime.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ', ' + msgTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  // Content moderation patterns
  const contactPatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
    /\b(?:whatsapp|telegram|wechat|line|instagram|facebook|twitter|snapchat)\b/gi, // Social media platforms
    /\b(?:call me|text me|dm me|contact me at)\b/gi, // Contact requests
    /\b(?:my number is|my phone is|my email is)\b/gi, // Personal info sharing
  ];

  const moderateMessage = (messageText: string): { isHidden: boolean; moderationReason?: string } => {
    for (const pattern of contactPatterns) {
      if (pattern.test(messageText)) {
        return {
          isHidden: true,
          moderationReason: 'Message contains personal contact information and has been hidden for safety.'
        };
      }
    }
    return { isHidden: false };
  };

  const sendMessage = async () => {
    if (!message.trim() || !chatId || !user?.id || !userProfile) return;

    const messageText = message.trim();
    setMessage(''); // Clear input immediately for better UX
    
    const sentMessage = await chatService.sendMessage(
      chatId,
      user.id,
      userProfile.full_name || user.email?.split('@')[0] || 'User',
      userProfile.avatar_url || 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
      messageText
    );

    if (sentMessage?.isHidden) {
      Alert.alert(
        'Message Moderated',
        'Your message contains personal contact information and has been hidden for safety. Please use the platform\'s built-in messaging system.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBlockUser = async () => {
    if (!chatId || !participantId) return;
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${chat?.participantName}? You won't receive messages from them anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const success = await chatService.blockUser(chatId, participantId as string);
            if (success) {
              setBlockedUsers(prev => new Set([...prev, participantId as string]));
              Alert.alert('User Blocked', `${chat?.participantName} has been blocked.`);
            } else {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReportUser = () => {
    setReportModalVisible(true);
  };

  const submitReport = async (reason: string) => {
    if (!chatId || !participantId || !user?.id) return;
    
    setReportModalVisible(false);
    
    const success = await chatService.reportUser(chatId, participantId as string, user.id, reason);
    
    if (success) {
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting. Our team will review this conversation and take appropriate action.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleMessageLongPress = (messageId: string, isMyMessage: boolean) => {
    if (isMyMessage) return; // Don't allow reporting own messages
    
    setSelectedMessageId(messageId);
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report Message', 'Block User'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleReportMessage(messageId);
          } else if (buttonIndex === 2) {
            handleBlockUser();
          }
        }
      );
    } else {
      Alert.alert(
        'Message Options',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Report Message', onPress: () => handleReportMessage(messageId) },
          { text: 'Block User', style: 'destructive', onPress: handleBlockUser },
        ]
      );
    }
  };

  const handleReportMessage = async (messageId: string) => {
    const success = await chatService.reportMessage(messageId);
    
    if (success) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, isReported: true } : msg
        )
      );
      Alert.alert(
        'Message Reported',
        'This message has been reported to our moderation team.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to report message. Please try again.');
    }
  };

  const showMoreOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report User', 'Block User'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleReportUser();
          } else if (buttonIndex === 2) {
            handleBlockUser();
          }
        }
      );
    } else {
      Alert.alert(
        'Chat Options',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Report User', onPress: handleReportUser },
          { text: 'Block User', style: 'destructive', onPress: handleBlockUser },
        ]
      );
    }
  };

  const renderMessage = (msg: LiveChatMessage, index: number) => {
    const showTimestamp = index === 0 || 
      (index > 0 && 
       Math.abs(new Date(msg.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime()) > 60000);

    const showAvatar = !(msg.isMe || false) && (index === messages.length - 1 || 
      messages[index + 1]?.senderId !== msg.senderId);

    // Don't render messages from blocked users
    if (blockedUsers.has(msg.senderId) && !(msg.isMe || false)) {
      return null;
    }

    return (
      <View key={msg.id}>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestamp}>
              {formatTimestamp(msg.timestamp)}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onLongPress={() => handleMessageLongPress(msg.id, msg.isMe || false)}
          activeOpacity={0.8}
        >
          <View style={[
            styles.messageContainer,
            (msg.isMe || false) ? styles.myMessageContainer : styles.theirMessageContainer
          ]}>
            {!(msg.isMe || false) && showAvatar && (
              <Image source={{ uri: msg.senderImage }} style={styles.avatar} />
            )}
            {!(msg.isMe || false) && !showAvatar && (
              <View style={styles.avatarPlaceholder} />
            )}
            <View style={[
              styles.messageBubble,
              (msg.isMe || false) ? styles.myMessageBubble : styles.theirMessageBubble,
              msg.isHidden && styles.hiddenMessageBubble,
              msg.isReported && styles.reportedMessageBubble
            ]}>
              {msg.isHidden ? (
                <View style={styles.hiddenMessageContent}>
                  <Shield size={16} color="#8E8E93" style={styles.hiddenMessageIcon} />
                  <Text style={styles.hiddenMessageText}>
                    {msg.moderationReason || 'This message has been hidden for safety.'}
                  </Text>
                </View>
              ) : (
                <Text style={[
                  styles.messageText,
                  (msg.isMe || false) ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {msg.message}
                </Text>
              )}
              {msg.isReported && (
                <View style={styles.reportedIndicator}>
                  <Flag size={12} color="#FF3B30" />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Image source={{ uri: chat.participantImage }} style={styles.headerAvatar} />
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{chat.participantName}</Text>
              <Text style={styles.headerStatus}>{chat.lastActive}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={showMoreOptions}>
            <MoreVertical size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map(renderMessage)}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Message..."
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Smile size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[
              styles.sendButton,
              message.trim() ? styles.sendButtonActive : styles.sendButtonInactive
            ]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
        
        {/* Report Modal */}
        <Modal
          visible={reportModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Report User</Text>
              <Text style={styles.modalSubtitle}>
                Why are you reporting {chat?.participantName}?
              </Text>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => submitReport('Inappropriate content')}
              >
                <Text style={styles.reportOptionText}>Inappropriate content</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => submitReport('Harassment or bullying')}
              >
                <Text style={styles.reportOptionText}>Harassment or bullying</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => submitReport('Spam or scam')}
              >
                <Text style={styles.reportOptionText}>Spam or scam</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => submitReport('Fake profile')}
              >
                <Text style={styles.reportOptionText}>Fake profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reportOption}
                onPress={() => submitReport('Other')}
              >
                <Text style={styles.reportOptionText}>Other</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: 'white',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 14,
    color: '#8E8E93',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  messagesContent: {
    paddingVertical: 16,
  },
  timestampContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 2,
  },
  myMessageBubble: {
    backgroundColor: '#1D1D1F',
    borderBottomRightRadius: 6,
  },
  theirMessageBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: '#1D1D1F',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
    maxHeight: 100,
    paddingVertical: 4,
  },
  emojiButton: {
    marginLeft: 8,
    paddingVertical: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#8E8E93',
  },
  hiddenMessageBubble: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
    borderWidth: 1,
  },
  reportedMessageBubble: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  hiddenMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
  },
  hiddenMessageIcon: {
    marginRight: 6,
  },
  hiddenMessageText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    flex: 1,
  },
  reportedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  reportOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  reportOptionText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});