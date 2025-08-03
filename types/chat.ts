export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string;
  message: string;
  timestamp: string;
  isRead?: boolean;
  isMe?: boolean;
}

export interface LiveChatMessage extends ChatMessage {
  isHidden?: boolean;
  moderationReason?: string;
  isReported?: boolean;
  chatId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  id: string;
  userId: string;
  chatId: string;
  joinedAt: string;
  isBlocked: boolean;
}

export interface Chat {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  participants: ChatParticipant[];
}

export interface UserChat {
  id: string;
  participantId: string;
  participantName: string;
  participantImage: string;
  lastMessageAt: string | null;
  createdAt: string;
}