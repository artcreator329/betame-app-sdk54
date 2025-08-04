export interface ServiceOfferData {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category_name?: string;
  customPrice?: number;
  customDescription?: string;
  customDeliveryTime?: number;
  isCustomOffer?: boolean; // Flag to indicate if this is a custom offer (not tied to existing service)
}

export interface ServiceOffer {
  id: string;
  chatId: string;
  serviceId: string;
  sellerId: string;
  buyerId: string;
  originalPrice: number;
  customPrice?: number;
  customDescription?: string;
  customDeliveryTime?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  messageType?: 'text' | 'service' | 'offer';
  serviceData?: ServiceOfferData;
  offerId?: string;
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  offerExpiresAt?: Date;
}

export interface LiveChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  messageType?: 'text' | 'service' | 'offer';
  serviceData?: ServiceOfferData;
  offerId?: string;
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  offerExpiresAt?: Date;
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
  lastMessage?: string;
  unreadCount?: number;
  createdAt: string;
}