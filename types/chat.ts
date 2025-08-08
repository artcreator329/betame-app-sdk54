export interface JobData {
  id: string;
  title: string;
  description: string;
  payment_type: 'fixed' | 'hourly' | 'daily' | 'negotiable';
  budget_amount?: string;
  currency: string;
  location_address?: string;
  cover_photo?: string;
}

export interface ServiceOfferData {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category_name?: string;
  seller_name?: string;
  seller_rating?: string;
  seller_reviews?: string;
  service_area?: string;
  customPrice?: number;
  customDescription?: string;
  customDeliveryTime?: number;
  isCustomOffer?: boolean; // Flag to indicate if this is a custom offer (not tied to existing service)
  jobData?: JobData; // Job details when offer is related to a job
  // Hustle job attributes
  startDate?: string;
  endDate?: string;
  preferredStartTime?: string;
  preferredEndTime?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
  skillsRequired?: string[];
  workType?: 'remote' | 'on_site' | 'hybrid';
  estimatedHours?: number;
  requirements?: string;
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
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Hustle job attributes
  startDate?: string;
  endDate?: string;
  preferredStartTime?: string;
  preferredEndTime?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
  skillsRequired?: string[];
  workType?: 'remote' | 'on_site' | 'hybrid';
  estimatedHours?: number;
  requirements?: string;
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
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress';
  offerExpiresAt?: Date;
  // Quote message fields
  quotedMessageId?: string;
  quotedMessageContent?: string;
  quotedMessageSenderName?: string;
  quotedMessageType?: 'text' | 'service' | 'offer';
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
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress';
  offerExpiresAt?: Date;
  // Quote message fields
  quotedMessageId?: string;
  quotedMessageContent?: string;
  quotedMessageSenderName?: string;
  quotedMessageType?: 'text' | 'service' | 'offer';
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