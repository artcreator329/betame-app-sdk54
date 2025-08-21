import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package } from 'lucide-react-native';

interface QuotedMessageProps {
  content: string;
  senderName: string;
  messageType: 'text' | 'service' | 'offer' | 'job_offer' | 'structured_inquiry';
  isMyMessage: boolean;
  quotedMessageId?: string;
  onPress?: () => void;
}

export function QuotedMessage({ 
  content, 
  senderName, 
  messageType, 
  isMyMessage, 
  quotedMessageId,
  onPress 
}: QuotedMessageProps) {
  const getMessagePreview = () => {
    if (messageType === 'text') {
      return content.length > 50 ? `${content.substring(0, 50)}...` : content;
    } else if (messageType === 'service' || messageType === 'offer') {
      return 'Service/Offer';
    } else if (messageType === 'job_offer') {
      return 'Job Application';
    } else if (messageType === 'structured_inquiry') {
      return 'Service Inquiry';
    }
    return content;
  };

  const QuotedContent = () => (
    <View style={[
      styles.quotedContainer,
      isMyMessage ? styles.myQuotedContainer : styles.theirQuotedContainer
    ]}>
      <View style={styles.quotedHeader}>
        {(messageType === 'service' || messageType === 'offer' || messageType === 'structured_inquiry') ? (
          <Package size={12} color={isMyMessage ? '#FFFFFF' : '#007AFF'} />
        ) : null}
        <Text style={[
          styles.quotedSenderName,
          isMyMessage ? styles.myQuotedSenderName : styles.theirQuotedSenderName
        ]}>
          {senderName}
        </Text>
      </View>
      <Text style={[
        styles.quotedContent,
        isMyMessage ? styles.myQuotedContent : styles.theirQuotedContent
      ]} numberOfLines={2}>
        {getMessagePreview()}
      </Text>
    </View>
  );

  // If there's an onPress handler and quotedMessageId, make it tappable
  if (onPress && quotedMessageId) {
    return (
      <TouchableOpacity 
        style={styles.tappableContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <QuotedContent />
        <View style={styles.tapIndicator} />
      </TouchableOpacity>
    );
  }

  // Otherwise, render as non-tappable
  return <QuotedContent />;
}

const styles = StyleSheet.create({
  tappableContainer: {
    // Add subtle visual feedback for tappable quoted messages
    position: 'relative',
  },
  tapIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 122, 255, 0.6)',
  },
  quotedContainer: {
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    maxWidth: '80%',
  },
  myQuotedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftColor: '#FFFFFF',
  },
  theirQuotedContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderLeftColor: '#007AFF',
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  quotedSenderName: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  myQuotedSenderName: {
    color: '#FFFFFF',
  },
  theirQuotedSenderName: {
    color: '#007AFF',
  },
  quotedContent: {
    fontSize: 12,
    lineHeight: 16,
  },
  myQuotedContent: {
    color: '#FFFFFF',
  },
  theirQuotedContent: {
    color: '#1D1D1F',
  },
}); 