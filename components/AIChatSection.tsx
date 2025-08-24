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
import { Send, Bot, Trash2, Sparkles, MessageCircle } from 'lucide-react-native';
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
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user?.id) {
      loadConversationHistory();
    }
  }, [user?.id]);

  const loadConversationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const result = await AIChatService.getChatHistory(user!.id);
      if (result.success && result.messages) {
        setMessages(result.messages);
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
                setMessages([]);
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

  const renderWelcomeMessage = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeIconContainer}>
        <Bot size={48} color="#007AFF" />
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
          <Bot size={24} color="#007AFF" />
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Sparkles size={16} color="#FFD700" />
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearConversation} style={styles.clearButton}>
            <Trash2 size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          renderWelcomeMessage()
        ) : (
          messages.map((message, index) => renderMessage(message, index))
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

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Message AI Assistant..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
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
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
});
