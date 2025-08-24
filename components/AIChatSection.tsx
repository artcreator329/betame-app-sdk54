import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send, Bot, Trash2, Sparkles, MessageCircle, Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AIChatService } from '@/lib/ai-chat-service';

interface AIChatMessage {
  id: string;
  user_id: string;
  message: string;
  response: string;
  message_type: 'text' | 'service_help' | 'pricing_help' | 'general_help';
  context: any;
  created_at: string;
  updated_at: string;
}

export default function AIChatSection() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [conversationEnded, setConversationEnded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadConversationHistory();
    }
  }, [user?.id]);

  // Auto-timeout functionality
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for 5 minutes (300000ms)
      timeoutRef.current = setTimeout(() => {
        setConversationEnded(true);
      }, 300000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messages, isLoading]);

  const resetConversation = () => {
    setMessages([]);
    setConversationEnded(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const loadConversationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const result = await AIChatService.getChatHistory(user!.id);
      if (result.success && result.messages) {
        setMessages(result.messages);
              // Check if conversation should be ended based on last message time
      if (result.messages.length > 0) {
        const timeoutCheck = await AIChatService.checkConversationTimeout(user!.id);
        if (timeoutCheck.timedOut) {
          setConversationEnded(true);
        }
      }
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user?.id) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Reset conversation ended state when user sends a new message
    if (conversationEnded) {
      setConversationEnded(false);
    }

    try {
      const response = await AIChatService.sendMessage(user.id, messageText);
      
      if (response.success && response.response) {
        // Add the new message to the conversation
        const newMessage: AIChatMessage = {
          id: response.messageId || Date.now().toString(),
          user_id: user.id,
          message: messageText,
          response: response.response,
          message_type: 'text',
          context: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (user?.id) {
              const result = await AIChatService.clearChatHistory(user.id);
              if (result.success) {
                resetConversation();
              } else {
                Alert.alert('Error', result.error || 'Failed to clear conversation');
              }
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleChatPress = () => {
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderWelcomeMessage = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeIconContainer}>
        <View style={styles.welcomeBetameLogo}>
          <Text style={styles.welcomeBetameLogoText}>B</Text>
        </View>
        <Sparkles size={20} color="#FFD700" style={styles.sparkleIcon} />
      </View>
      <Text style={styles.welcomeTitle}>AI Assistant</Text>
      <Text style={styles.welcomeSubtitle}>
        I'm here to help you with BetaMe! Ask me about:
      </Text>
      <View style={styles.suggestionContainer}>
        <TouchableOpacity 
          style={styles.suggestionButton}
          onPress={() => setInputMessage("How do I create a service?")}
        >
          <Text style={styles.suggestionText}>How do I create a service?</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.suggestionButton}
          onPress={() => setInputMessage("What are the pricing guidelines?")}
        >
          <Text style={styles.suggestionText}>What are the pricing guidelines?</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.suggestionButton}
          onPress={() => setInputMessage("How does the payment system work?")}
        >
          <Text style={styles.suggestionText}>How does the payment system work?</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.suggestionButton}
          onPress={() => setInputMessage("Tell me about the app features")}
        >
          <Text style={styles.suggestionText}>Tell me about the app features</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConversationEndedMessage = () => (
    <View style={styles.conversationEndedContainer}>
      <View style={styles.conversationEndedDivider} />
      <View style={styles.conversationEndedContent}>
        <Clock size={20} color="#8E8E93" />
        <Text style={styles.conversationEndedText}>
          Conversation ended due to inactivity
        </Text>
        <TouchableOpacity 
          style={styles.startNewConversationButton}
          onPress={resetConversation}
        >
          <Text style={styles.startNewConversationText}>Start New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMessage = (message: AIChatMessage, index: number) => (
    <View key={message.id || index} style={styles.messageGroup}>
      {/* User Message */}
      <View style={styles.userMessageContainer}>
        <View style={styles.userMessageBubble}>
          <Text style={styles.userMessageText}>{message.message}</Text>
          <Text style={styles.userMessageTime}>{formatTime(message.created_at)}</Text>
        </View>
      </View>

      {/* AI Response */}
      <View style={styles.aiMessageContainer}>
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>B</Text>
        </View>
        <View style={styles.aiMessageBubble}>
          <Text style={styles.aiMessageText}>{message.response}</Text>
          <Text style={styles.aiMessageTime}>{formatTime(message.created_at)}</Text>
        </View>
      </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Please sign in to use AI Assistant</Text>
      </View>
    );
  }

  if (isLoadingHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading AI chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerBetameLogo}>
            <Text style={styles.headerBetameLogoText}>B</Text>
          </View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Sparkles size={16} color="#FFD700" />
        </View>
        {messages.length > 0 && !conversationEnded && (
          <TouchableOpacity onPress={clearConversation} style={styles.clearButton}>
            <Trash2 size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <TouchableOpacity 
        style={styles.messagesTouchable}
        activeOpacity={1}
        onPress={handleChatPress}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
        {messages.length === 0 ? (
          renderWelcomeMessage()
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            {conversationEnded && renderConversationEndedMessage()}
          </>
        )}
        
        {isLoading && (
          <View style={styles.aiMessageContainer}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>B</Text>
            </View>
            <View style={styles.aiMessageBubble}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.typingText}>AI is thinking...</Text>
              </View>
            </View>
          </View>
        )}
        </ScrollView>
      </TouchableOpacity>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder={conversationEnded ? "Start a new conversation..." : "Message AI Assistant..."}
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
            editable={!isLoading && !conversationEnded}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isLoading || conversationEnded) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputMessage.trim() || isLoading || conversationEnded}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  clearButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  messagesTouchable: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 20,
  },
  welcomeIconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  welcomeBetameLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#007AFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  welcomeBetameLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    fontFamily: 'LeagueSpartan-Bold',
  },
  headerBetameLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#007AFF',
  },
  headerBetameLogoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    fontFamily: 'LeagueSpartan-Bold',
  },
  sparkleIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  suggestionContainer: {
    width: '100%',
    gap: 12,
  },
  suggestionButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  suggestionText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  messageGroup: {
    marginBottom: 16,
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  userMessageBubble: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '80%',
    borderBottomRightRadius: 4,
  },
  userMessageText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 20,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  aiAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    fontFamily: 'LeagueSpartan-Bold',
  },
  aiMessageBubble: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '80%',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  aiMessageText: {
    color: '#1D1D1F',
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  aiMessageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 80,
    minHeight: 36,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  conversationEndedContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  conversationEndedDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginBottom: 16,
  },
  conversationEndedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  conversationEndedText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  startNewConversationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  startNewConversationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
