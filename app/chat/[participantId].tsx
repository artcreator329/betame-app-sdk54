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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MoveVertical as MoreVertical, Smile, Send } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { findChatByParticipant, ChatMessage } from '@/data/mockChatData';

export default function ChatScreen() {
  const router = useRouter();
  const { participantId } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const chat = findChatByParticipant(participantId as string);

  useEffect(() => {
    if (chat) {
      setMessages(chat.messages);
    }
  }, [chat]);

  useEffect(() => {
    // Auto scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  if (!chat) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Chat not found</Text>
      </SafeAreaView>
    );
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return timestamp.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return timestamp.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ', ' + timestamp.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: 'me',
        senderName: 'Me',
        senderImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: message.trim(),
        timestamp: new Date(),
        isMe: true,
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
    }
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const showTimestamp = index === 0 || 
      (index > 0 && 
       Math.abs(msg.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 60000); // Show timestamp if more than 1 minute apart

    const showAvatar = !msg.isMe && (index === messages.length - 1 || 
      messages[index + 1]?.senderId !== msg.senderId);

    return (
      <View key={msg.id}>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestamp}>
              {formatTimestamp(msg.timestamp)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          msg.isMe ? styles.myMessageContainer : styles.theirMessageContainer
        ]}>
          {!msg.isMe && showAvatar && (
            <Image source={{ uri: msg.senderImage }} style={styles.avatar} />
          )}
          {!msg.isMe && !showAvatar && (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={[
            styles.messageBubble,
            msg.isMe ? styles.myMessageBubble : styles.theirMessageBubble
          ]}>
            <Text style={[
              styles.messageText,
              msg.isMe ? styles.myMessageText : styles.theirMessageText
            ]}>
              {msg.message}
            </Text>
          </View>
        </View>
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
          <TouchableOpacity>
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
});