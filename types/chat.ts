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
  service_provider_name?: string;
  service_provider_rating?: string;
  service_provider_reviews?: string;
  service_area?: string;
  customPrice?: number;
  customDescription?: string;
  customDeliveryTime?: number;
  isCustomOffer?: boolean; // Flag to indicate if this is a custom offer (not tied to existing service)
  isJobOffer?: boolean; // Flag to indicate if this is a job offer
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
  serviceProviderId: string;
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

export interface JobOffer {
  id: string;
  chatId: string;
  jobId: string;
  serviceProviderId: string; // The person applying for the job
  buyerId: string;  // The person who posted the job
  originalBudget: number;
  proposedPrice?: number;
  proposalDescription?: string;
  proposedTimeline?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Job-specific attributes
  estimatedHours?: number;
  startDate?: string;
  completionDate?: string;
  workType?: 'remote' | 'on_site' | 'hybrid';
  portfolio?: string[]; // URLs to portfolio items
  experience?: string;
  qualifications?: string;
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
  messageType?: 'text' | 'service' | 'offer' | 'job_offer' | 'structured_inquiry';
  serviceData?: ServiceOfferData;
  jobData?: JobData;
  offerId?: string;
  jobOfferId?: string;
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress' | 'completed' | 'payment_release_pending' | 'work_completed' | 'buyer_reviewing' | 'payment_released';
  offerExpiresAt?: Date;
  // Quote message fields
  quotedMessageId?: string;
  quotedMessageContent?: string;
  quotedMessageSenderName?: string;
  quotedMessageType?: 'text' | 'service' | 'offer' | 'job_offer' | 'structured_inquiry';
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
  messageType?: 'text' | 'service' | 'offer' | 'job_offer' | 'structured_inquiry';
  serviceData?: ServiceOfferData;
  jobData?: JobData;
  offerId?: string;
  jobOfferId?: string;
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress' | 'completed' | 'payment_release_pending' | 'work_completed' | 'buyer_reviewing' | 'payment_released';
  offerExpiresAt?: Date;
  // Quote message fields
  quotedMessageId?: string;
  quotedMessageContent?: string;
  quotedMessageSenderName?: string;
  quotedMessageType?: 'text' | 'service' | 'offer' | 'job_offer' | 'structured_inquiry';
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