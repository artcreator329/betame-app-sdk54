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
  FlatList,
} from 'react-native';
import CalendarPicker from '@/components/CalendarPicker';
import TimePicker from '@/components/TimePicker';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MoveVertical as MoreVertical, Smile, Send, Shield, Flag, Ban, Trash2, Package, X, MapPin } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChatMessage, LiveChatMessage } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseChat, useUserChats } from '@/hooks/useSupabaseChat';
import { useSupabaseChatContext } from '@/contexts/SupabaseChatContext';
import { chatService } from '@/lib/chat-service';
import { supabase } from '@/lib/supabase';
import { ServiceService, Service } from '@/lib/service-service';
import { ServiceOfferMessage } from '../../components/ServiceOfferMessage';
import { ServiceOfferModal } from '../../components/ServiceOfferModal';
import { ServiceVariantSelectionModal } from '../../components/ServiceVariantSelectionModal';
import { StructuredInquiryMessage } from '../../components/StructuredInquiryMessage';
import { StructuredInquiryDraft } from '../../components/StructuredInquiryDraft';
import { MalaysianPaymentModal } from '../../components/MalaysianPaymentModal';
import { JobProgressMonitor } from '../../components/JobProgressMonitor';
import { QuotedMessage } from '../../components/QuotedMessage';
import { LocationShareModal } from '../../components/LocationShareModal';
import { notificationService } from '@/lib/notification-service';

interface ModeratedMessage extends ChatMessage {
  isHidden?: boolean;
  moderationReason?: string;
  isReported?: boolean;
  isBlocked?: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { 
    participantId,
    chatId: routeChatId,
    selectedServiceId,
    selectedServiceTitle,
    selectedServicePrice,
    selectedServiceCurrency,
    selectedServiceDescription,
    selectedServiceImage,
    selectedServiceCategory,
    jobId,
    jobTitle,
    prefilledMessage,
    isJobApplication,
    structuredInquiry,
  } = useLocalSearchParams();
  const { user, userProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [serviceOfferModalVisible, setServiceOfferModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceSelectionModalVisible, setServiceSelectionModalVisible] = useState(false);
  const [userServices, setUserServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(true);
  const [editOfferModalVisible, setEditOfferModalVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState<{
    offerId: string;
    currentPrice: number;
    currentDescription: string;
    currentDeliveryTime: number;
    serviceTitle: string;
    // Hustle job details
    currentStartDate?: string;
    currentEndDate?: string;
    currentPreferredStartTime?: string;
    currentPreferredEndTime?: string;
    currentLocationAddress?: string;
    currentUrgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
    currentWorkType?: 'remote' | 'on_site' | 'hybrid';
    currentEstimatedHours?: number;
    currentRequirements?: string;
  } | null>(null);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedOfferForPayment, setSelectedOfferForPayment] = useState<{
    offer: any;
    serviceData: any;
    sellerId: string;
  } | null>(null);
  const [locationShareModalVisible, setLocationShareModalVisible] = useState(false);
  const [locationShareData, setLocationShareData] = useState<{
    offerId: string;
    serviceTitle: string;
    buyerName: string;
  } | null>(null);
  const [showJobProgress, setShowJobProgress] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [structuredInquiryDraft, setStructuredInquiryDraft] = useState<any>(null);
  const [serviceVariantSelectionModalVisible, setServiceVariantSelectionModalVisible] = useState(false);
  const [inquiryServiceData, setInquiryServiceData] = useState<{
    serviceId: string;
    serviceTitle: string;
  } | null>(null);
  const [participantInfo, setParticipantInfo] = useState<{
    name: string;
    image: string;
    isOnline: boolean;
  } | null>(null);
  
  // Quote message state
  const [quotedMessage, setQuotedMessage] = useState<{
    id: string;
    content: string;
    senderName: string;
    messageType: 'text' | 'service' | 'offer' | 'job_offer';
  } | null>(null);
  

  const scrollViewRef = useRef<ScrollView>(null);
  const { chatService: supabaseChatService } = useSupabaseChatContext();
  
  // Always call useUserChats but with safe default values to avoid hook order issues
  const safeUserId = user?.id || '';
  const safeChatId = chatId || undefined;
  const { markChatAsRead } = useUserChats(safeUserId, safeChatId);
  
  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (!user?.id) {
        console.log('Missing user ID:', { userId: user?.id });
        setChatLoading(false);
        // Redirect non-authenticated users to login
        Alert.alert(
          'Sign In Required',
          'You need to sign in to access chat. Would you like to sign in now?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.replace('/') },
            { text: 'Sign In', onPress: () => router.push('/auth/login') }
          ]
        );
        return;
      }
      
      // If we have a chatId from the route, use it directly
      if (routeChatId) {
        const chatIdStr = Array.isArray(routeChatId) ? routeChatId[0] : routeChatId;
        console.log('🔄 CHAT INIT: Using provided chatId:', chatIdStr);
        setChatId(chatIdStr);
        
        // Fetch participant info for the chat
        try {
          const { data: chatData } = await supabase
            .from('chats')
            .select('participant1_id, participant2_id')
            .eq('id', chatIdStr)
            .single();
          
          if (chatData) {
            const otherParticipantId = chatData.participant1_id === user.id 
              ? chatData.participant2_id 
              : chatData.participant1_id;
            
            const participant = await chatService.getChatParticipant(otherParticipantId);
            if (participant) {
              setParticipantInfo(participant);
              console.log('Participant info loaded:', participant.name);
            }
          }
        } catch (error) {
          console.error('Error fetching chat data:', error);
        }
        
        setChatLoading(false);
        return;
      }
      
      // Fall back to participantId logic for backward compatibility
      if (!participantId) {
        console.log('Missing participant ID');
        setChatLoading(false);
        return;
      }
      
      // Validate participantId format
      const participantIdStr = Array.isArray(participantId) ? participantId[0] : participantId;
      if (!participantIdStr || participantIdStr.trim() === '') {
        console.error('Invalid participant ID:', participantIdStr);
        setChatLoading(false);
        router.replace('/messages');
        return;
      }
      
      setChatLoading(true);
      try {
        console.log('🔄 CHAT INIT: Initializing chat with:', { participantId: participantIdStr, userId: user.id });
        
        // Initialize chat and fetch participant info in parallel
        const [chat, participant] = await Promise.all([
          supabaseChatService.createOrGetChat(participantIdStr, user.id),
          chatService.getChatParticipant(participantIdStr)
        ]);
        
        console.log('🔄 CHAT INIT: Chat initialization results:', { chat: chat?.id, participant: participant?.name });
        
        if (chat) {
          setChatId(chat.id);
          console.log('Chat initialized successfully:', chat.id);
        } else {
          console.error('Failed to create or get chat');
        }
        
        if (participant) {
          setParticipantInfo(participant);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setChatLoading(false);
      }
    };

    initializeChat();
    fetchUserServices();
  }, [user?.id, participantId, supabaseChatService, router, routeChatId]);
  
  // Handle pre-selected service variant from service detail page
  useEffect(() => {
    // Only show service selection modal if it's NOT a text message inquiry or structured inquiry
    // For text messages and structured inquiries, we don't want to show service sharing options
    if (selectedServiceId && selectedServiceTitle && selectedServicePrice && selectedServiceCurrency && !prefilledMessage && structuredInquiry !== 'true') {
      const preSelectedService: Service = {
        id: Array.isArray(selectedServiceId) ? selectedServiceId[0] : selectedServiceId,
        title: Array.isArray(selectedServiceTitle) ? selectedServiceTitle[0] : selectedServiceTitle,
        price: parseFloat(Array.isArray(selectedServicePrice) ? selectedServicePrice[0] : selectedServicePrice),
        currency: Array.isArray(selectedServiceCurrency) ? selectedServiceCurrency[0] : selectedServiceCurrency,
        description: Array.isArray(selectedServiceDescription) ? selectedServiceDescription[0] : selectedServiceDescription || '',
        image_url: Array.isArray(selectedServiceImage) ? selectedServiceImage[0] : selectedServiceImage || '',
        category_name: Array.isArray(selectedServiceCategory) ? selectedServiceCategory[0] : selectedServiceCategory || '',
        user_id: '', // Will be filled by the service owner
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_service_id: undefined,
        service_variants: []
      };
      
      setSelectedService(preSelectedService);
      setServiceSelectionModalVisible(true);
    }
  }, [selectedServiceId, selectedServiceTitle, selectedServicePrice, selectedServiceCurrency, selectedServiceDescription, selectedServiceImage, selectedServiceCategory, prefilledMessage, structuredInquiry]);
  
  // Handle prefilled message for job applications and service inquiries
  useEffect(() => {
    if (prefilledMessage) {
      const messageText = Array.isArray(prefilledMessage) ? prefilledMessage[0] : prefilledMessage;
      setMessage(messageText);
    }
  }, [prefilledMessage]);

  // Handle structured inquiry - create draft directly with selected service data
  useEffect(() => {
    if (structuredInquiry === 'true' && selectedServiceId && selectedServiceTitle && selectedServicePrice && selectedServiceCurrency) {
      // Create structured inquiry draft directly with the selected service data
      const inquiryMessage = {
        type: 'structured_inquiry' as const,
        serviceId: Array.isArray(selectedServiceId) ? selectedServiceId[0] : selectedServiceId,
        serviceTitle: Array.isArray(selectedServiceTitle) ? selectedServiceTitle[0] : selectedServiceTitle,
        servicePrice: Array.isArray(selectedServicePrice) ? selectedServicePrice[0] : selectedServicePrice,
        serviceCurrency: Array.isArray(selectedServiceCurrency) ? selectedServiceCurrency[0] : selectedServiceCurrency,
        serviceDescription: Array.isArray(selectedServiceDescription) ? selectedServiceDescription[0] : selectedServiceDescription || '',
        serviceImage: Array.isArray(selectedServiceImage) ? selectedServiceImage[0] : selectedServiceImage || '',
        serviceCategory: Array.isArray(selectedServiceCategory) ? selectedServiceCategory[0] : selectedServiceCategory || '',
      };
      
      setStructuredInquiryDraft(inquiryMessage);
    }
  }, [structuredInquiry, selectedServiceId, selectedServiceTitle, selectedServicePrice, selectedServiceCurrency, selectedServiceDescription, selectedServiceImage, selectedServiceCategory]);

  // Note: Job offer sending is now handled directly from the job page for better reliability
  
  const sendStructuredInquiry = async (inquiryData: any) => {
    try {
      if (!chatId || !user?.id || !userProfile) return;
      
      console.log('🔍 Sending structured inquiry:', inquiryData);
      
      // Use the chat service to send the structured inquiry message
      const success = await supabaseChatService.sendStructuredInquiryMessage(
        chatId,
        user.id,
        userProfile.full_name || user.email?.split('@')[0] || 'User',
        userProfile.avatar_url || 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        inquiryData
      );
      
      if (success) {
        console.log('✅ Structured inquiry sent successfully');
        // Clear the draft after successful send
        setStructuredInquiryDraft(null);
        
        // Scroll to bottom after sending
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('❌ Failed to send structured inquiry');
        Alert.alert('Error', 'Failed to send inquiry. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error in sendStructuredInquiry:', error);
      Alert.alert('Error', 'Failed to send inquiry. Please try again.');
    }
  };

  const handleSendStructuredInquiry = (customMessage?: string) => {
    if (structuredInquiryDraft) {
      // Add the custom message to the inquiry data
      const inquiryWithMessage = {
        ...structuredInquiryDraft,
        customMessage: customMessage || 'Hi! I\'m interested in this service. Could you tell me more about it and what\'s included?'
      };
      sendStructuredInquiry(inquiryWithMessage);
    }
  };

  const handleCancelStructuredInquiry = () => {
    setStructuredInquiryDraft(null);
  };

  const handleServiceVariantSelected = (variant: Service) => {
    // Create a structured inquiry message draft with the selected variant
    const inquiryMessage = {
      type: 'structured_inquiry' as const,
      serviceId: variant.id,
      serviceTitle: variant.title,
      servicePrice: variant.price.toString(),
      serviceCurrency: variant.currency,
      serviceDescription: variant.description,
      serviceImage: variant.image_url,
      serviceCategory: variant.category_name,
    };
    
    // Set the inquiry as a draft message that user can review and send
    setStructuredInquiryDraft(inquiryMessage);
    setServiceVariantSelectionModalVisible(false);
  };

  const handleServiceVariantSelectionCancel = () => {
    setServiceVariantSelectionModalVisible(false);
    setInquiryServiceData(null);
    // Navigate back since user cancelled the inquiry
    router.back();
  };

  const editServiceOffer = async (offerId: string) => {
    try {
      // Find the offer message to get current offer data
      const offerMessage = messages.find(msg => msg.offerId === offerId);
      if (!offerMessage || !offerMessage.serviceData) {
        Alert.alert('Error', 'Could not find offer details');
        return;
      }

      const serviceData = offerMessage.serviceData;
      
      // Set up editing state
      setEditingOffer({
        offerId: offerId,
        currentPrice: serviceData.customPrice || serviceData.price,
        currentDescription: serviceData.customDescription || serviceData.description,
        currentDeliveryTime: serviceData.customDeliveryTime || 7,
        serviceTitle: serviceData.title,
        // Hustle job details
        currentStartDate: serviceData.startDate,
        currentEndDate: serviceData.endDate,
        currentPreferredStartTime: serviceData.preferredStartTime,
        currentPreferredEndTime: serviceData.preferredEndTime,
        currentLocationAddress: serviceData.locationAddress,
        currentUrgencyLevel: serviceData.urgencyLevel,
        currentWorkType: serviceData.workType,
        currentEstimatedHours: serviceData.estimatedHours,
        currentRequirements: serviceData.requirements,
      });

      // Set the selected service for the modal
      setSelectedService({
        id: serviceData.id,
        title: serviceData.title,
        description: serviceData.description,
        price: serviceData.price,
        currency: serviceData.currency,
        image_url: serviceData.image_url,
        category_name: serviceData.category_name,
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_service_id: undefined,
        service_variants: []
      });

      // Show the service offer modal in edit mode
      setServiceOfferModalVisible(true);
    } catch (error) {
      console.error('Error setting up offer edit:', error);
      Alert.alert('Error', 'Failed to edit offer');
    }
  };


  
  const fetchUserServices = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingServices(true);
      const services = await ServiceService.getUserServices(user.id);
      console.log('🔍 Chat: Fetched user services:', services);
      console.log('🔍 Chat: Service IDs:', services.map(s => ({ id: s.id, title: s.title })));
      setUserServices(services);
    } catch (error) {
      console.error('Error fetching user services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const isUserSeller = userServices.length > 0;
  
  // Mark messages as read when chat is opened
  useEffect(() => {
    const markAsRead = async () => {
      if (chatId && user?.id) {
        try {
          await supabaseChatService.markMessagesAsRead(chatId, user.id);
          markChatAsRead(chatId); // Reset unread count in messages list
          console.log('Messages marked as read for chat:', chatId);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    };
    
    markAsRead();
  }, [chatId, user?.id, supabaseChatService, markChatAsRead]);
  
  // Use stable parameters for useSupabaseChat to avoid hook order issues
  const stableChatId = chatId || '';
  const stableUserId = user?.id || '';
  const stableUserName = userProfile?.full_name || user?.email?.split('@')[0] || 'User';
  
  const {
    messages,
    isLoading,
    connectionStatus,
    typingUsers,
    sendMessage: sendChatMessage,
    sendServiceMessage,
    startTyping,
    stopTyping,
    blockUser,
    reportUser,
    reportMessage,
    deleteMessage
  } = useSupabaseChat({ 
    chatId: stableChatId,
    currentUserId: stableUserId,
    currentUserName: stableUserName
  });

  // Chat info from participant data
  const chat = { 
    participantName: participantInfo?.name || 'Chat Participant', 
    participantImage: participantInfo?.image || 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
    lastActive: participantInfo?.isOnline ? 'Active now' : (connectionStatus === 'connected' ? 'Recently active' : 'Connecting...')
  };

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    // Auto scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Handle loading and error states in JSX instead of early returns to avoid hook order issues
  const isLoadingState = chatLoading || (isLoading && chatId);
  const shouldRedirect = !chatLoading && !chatId;
  const hasValidChat = !shouldRedirect && chatId;
  
  // Redirect if needed (but after all hooks are called)
  useEffect(() => {
    if (shouldRedirect) {
      router.replace('/messages');
    }
  }, [shouldRedirect, router]);

  const formatTimestamp = (timestamp: string | Date) => {
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
    if (!message.trim() || !user?.id || !userProfile) return;

    const messageText = message.trim();
    setMessage(''); // Clear input immediately for better UX
    
    const result = await sendChatMessage(
      messageText,
      userProfile.full_name || user.email?.split('@')[0] || 'User',
      userProfile.avatar_url || 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
      quotedMessage?.id,
      quotedMessage?.content,
      quotedMessage?.senderName,
      quotedMessage?.messageType === 'job_offer' ? 'offer' : quotedMessage?.messageType
    );

    if (!result) {
      Alert.alert(
        'Message Moderated',
        'Your message contains personal contact information and has been hidden for safety. Please use the platform\'s built-in messaging system.',
        [{ text: 'OK' }]
      );
    } else {
      // Clear quoted message after successful send
      setQuotedMessage(null);
    }
  };

  const handleShareService = (service: Service) => {
    console.log('🔍 Chat: Selected service for sharing:', service);
    console.log('🔍 Chat: Service ID:', service.id);
    setSelectedService(service);
    setServiceModalVisible(false);
    setServiceSelectionModalVisible(true);
  };

  const handleSendServiceDirectly = async () => {
    if (!user?.id || !userProfile || !chatId || !selectedService) return;

    // Validate that the service has a valid ID
    if (!selectedService.id || selectedService.id.trim() === '') {
      Alert.alert('Error', 'Invalid service selected. Please try again.');
      return;
    }

    try {
      const serviceData = {
        id: selectedService.id,
        title: selectedService.title,
        description: selectedService.description,
        price: selectedService.price,
        currency: selectedService.currency,
        image_url: selectedService.image_url,
        category_name: selectedService.category_name,
      };

      console.log('🔍 Chat: Sending service directly:', serviceData);

      const success = await sendServiceMessage(
        userProfile.full_name || user.email?.split('@')[0] || 'User',
        userProfile.avatar_url || 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        serviceData
      );

      if (success) {
        setServiceSelectionModalVisible(false);
        setSelectedService(null);
        // Scroll to bottom after sending
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to share service. Please try again.');
      }
    } catch (error) {
      console.error('Error sending service directly:', error);
      Alert.alert('Error', 'Failed to send service. Please try again.');
    }
  };

  const handleCustomizeService = () => {
    setServiceSelectionModalVisible(false);
    setServiceOfferModalVisible(true);
  };

  const handleSendServiceOffer = async (offerData: {
    serviceId: string;
    customPrice?: number;
    customDescription?: string;
    customDeliveryTime?: number;
    startDate?: string;
    endDate?: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    locationAddress?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
    workType?: 'remote' | 'on_site' | 'hybrid';
    estimatedHours?: number;
    requirements?: string;
  }) => {
    // Check if we're editing an existing offer
    if (editingOffer) {
      try {
        // Update existing offer
        await supabaseChatService.updateServiceOffer(editingOffer.offerId, offerData);
        
        Alert.alert('Success', 'Offer updated successfully!');
        setServiceOfferModalVisible(false);
        setSelectedService(null);
        setEditingOffer(null);
        
        // Refresh messages to show updated offer
        // The real-time subscription should handle this automatically
      } catch (error) {
        console.error('Error updating service offer:', error);
        Alert.alert('Error', 'Failed to update offer. Please try again.');
      }
      return;
    }
    if (!user?.id || !userProfile || !chatId || !selectedService) return;

    // Validate that the service has a valid ID
    if (!selectedService.id || selectedService.id.trim() === '') {
      Alert.alert('Error', 'Invalid service selected. Please try again.');
      return;
    }

    try {
      const serviceData = {
        id: selectedService.id,
        title: selectedService.title,
        description: selectedService.description,
        price: offerData.customPrice || selectedService.price,
        currency: selectedService.currency,
        image_url: selectedService.image_url,
        category_name: selectedService.category_name,
        customPrice: offerData.customPrice,
        customDescription: offerData.customDescription,
        customDeliveryTime: offerData.customDeliveryTime,
        // Hustle job attributes
        startDate: offerData.startDate,
        endDate: offerData.endDate,
        preferredStartTime: offerData.preferredStartTime,
        preferredEndTime: offerData.preferredEndTime,
        locationAddress: offerData.locationAddress,
        urgencyLevel: offerData.urgencyLevel,
        workType: offerData.workType,
        estimatedHours: offerData.estimatedHours,
        requirements: offerData.requirements,
      };

      console.log('🔍 Chat: Creating service offer with serviceData:', serviceData);
      console.log('🔍 Chat: Selected service ID:', selectedService.id);
      console.log('🔍 Chat: Service data ID:', serviceData.id);
      console.log('🔍 Chat: Hustle job fields being sent:', {
        startDate: offerData.startDate,
        endDate: offerData.endDate,
        preferredStartTime: offerData.preferredStartTime,
        preferredEndTime: offerData.preferredEndTime,
        locationAddress: offerData.locationAddress,
        urgencyLevel: offerData.urgencyLevel,
        workType: offerData.workType,
        estimatedHours: offerData.estimatedHours,
        requirements: offerData.requirements,
      });

      const success = await sendServiceMessage(
        userProfile.full_name || user.email?.split('@')[0] || 'User',
        userProfile.avatar_url || 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        serviceData
      );

      if (success) {
        setServiceOfferModalVisible(false);
        setSelectedService(null);
        // Scroll to bottom after sending
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to share service. Please try again.');
      }
    } catch (error) {
      console.error('Error sending service offer:', error);
      Alert.alert('Error', 'Failed to send service offer. Please try again.');
    }
  };









  const handlePaymentSuccess = async (activeJobId: string) => {
    try {
      // Update the offer status to accepted
      if (selectedOfferForPayment) {
        await supabaseChatService.acceptServiceOffer(selectedOfferForPayment.offer.id);
        
        // Create job record for the service offer
        const { ActiveJobService } = await import('@/lib/active-job-service');
        const activeJob = await ActiveJobService.createJobFromOffer(
          selectedOfferForPayment.offer,
          selectedOfferForPayment.serviceData,
          user!.id,
          selectedOfferForPayment.sellerId
        );
        
        // Add notification for offer acceptance (to the seller)
        await notificationService.addOfferAcceptedNotification({
          participantId: selectedOfferForPayment.sellerId,
          participantName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
          participantImage: userProfile?.avatar_url || '',
          chatId: chatId || '',
          offerId: selectedOfferForPayment.offer.id,
          serviceTitle: selectedOfferForPayment.serviceData.title,
          price: selectedOfferForPayment.serviceData.customPrice || selectedOfferForPayment.serviceData.price,
          currency: selectedOfferForPayment.serviceData.currency,
          isAcceptedByMe: false,
        });
      }
      
      setPaymentModalVisible(false);
      setSelectedOfferForPayment(null);
      
      // Navigate to orders to track the job
      router.push('/(tabs)/orders');
    } catch (error) {
      console.error('Error handling payment success:', error);
      Alert.alert('Error', 'Payment was successful but there was an issue updating the offer status.');
    }
  };

  const handlePaymentCancel = () => {
    setPaymentModalVisible(false);
    setSelectedOfferForPayment(null);
  };

  const cancelServiceOffer = async (offerId: string) => {
    try {
      console.log('Cancelling service offer:', offerId);
      
      // Find the message with this offer ID to get offer and service data
      const offerMessage = messages.find(msg => msg.offerId === offerId);
      if (!offerMessage || !offerMessage.serviceData) {
        Alert.alert('Error', 'Could not find offer details');
        return;
      }

      // Update the offer status to cancelled in the database
      console.log('🔄 Chat: About to cancel offer:', offerId);
      await supabaseChatService.cancelServiceOffer(offerId, 'Cancelled by seller');
      console.log('✅ Chat: Offer cancellation completed successfully');
      
      // Force a small delay to ensure the real-time update has time to propagate
      setTimeout(() => {
        console.log('🔄 Chat: Checking if offer status updated via real-time...');
        const updatedMessage = messages.find(msg => msg.offerId === offerId);
        if (updatedMessage && updatedMessage.offerStatus !== 'cancelled') {
          console.log('⚠️ Chat: Real-time update may have failed, status still:', updatedMessage.offerStatus);
        }
      }, 2000);
      
              // Add notification for offer cancellation (to the buyer)
        await notificationService.addOfferRejectedNotification({
          participantId: participantId as string, // This is the buyer who will receive the notification
          participantName: userProfile?.full_name || user?.email?.split('@')[0] || 'User', // This is the seller who cancelled
          participantImage: userProfile?.avatar_url || '',
          chatId: chatId || '',
          offerId: offerId,
          serviceTitle: offerMessage.serviceData.title,
          price: offerMessage.serviceData.customPrice || offerMessage.serviceData.price,
          currency: offerMessage.serviceData.currency,
          rejectReason: 'Cancelled by seller',
          isRejectedByMe: true, // From buyer's perspective, the seller cancelled it
        });
      
      Alert.alert('Success', 'Service offer cancelled.');
    } catch (error) {
      console.error('Error cancelling service offer:', error);
      Alert.alert('Error', 'Failed to cancel service offer');
    }
  };

  const handleShareLocation = (offerId: string, serviceTitle: string) => {
    // Get buyer name from participant info
    const buyerName = participantInfo?.name || 'the buyer';
    
    setLocationShareData({
      offerId,
      serviceTitle,
      buyerName,
    });
    setLocationShareModalVisible(true);
  };

  const handleLocationShare = async (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    if (!user?.id || !userProfile || !chatId || !locationShareData) return;

    try {
      const success = await supabaseChatService.sendLocationMessage(
        chatId,
        user.id,
        userProfile.full_name || user.email?.split('@')[0] || 'User',
        userProfile.avatar_url || 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        location,
        locationShareData.serviceTitle
      );

      if (success) {
        Alert.alert('Success', 'Job location shared successfully!');
        setLocationShareModalVisible(false);
        setLocationShareData(null);
        
        // Scroll to bottom after sending
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to share location. Please try again.');
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location. Please try again.');
    }
  };

  const handleLocationShareCancel = () => {
    setLocationShareModalVisible(false);
    setLocationShareData(null);
  };

  // Effect to populate edit form when editing offer is set




  const handleCancelEdit = () => {
    setEditOfferModalVisible(false);
    setEditingOffer(null);
  };

  const handleBlockUser = async () => {
    if (!participantId) return;
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${chat?.participantName}? You won't receive messages from them anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const success = await blockUser(participantId as string);
            if (success) {
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
    if (!participantId || !user?.id) return;
    
    setReportModalVisible(false);
    
    const success = await reportUser(participantId as string, reason);
    
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

  const handleQuoteMessage = (messageId: string) => {
    const messageToQuote = messages.find(msg => msg.id === messageId);
    if (messageToQuote) {
      setQuotedMessage({
        id: messageToQuote.id,
        content: messageToQuote.content,
        senderName: messageToQuote.senderName,
        messageType: messageToQuote.messageType || 'text',
      });
      // Focus the input field
      setTimeout(() => {
        // Focus logic will be added when we update the input section
      }, 100);
    }
  };

  const handleCancelQuote = () => {
    setQuotedMessage(null);
  };

  const scrollToMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1 && scrollViewRef.current) {
      // For ScrollView, we need to scroll to a specific position
      // Since we can't easily calculate the exact position, we'll scroll to the bottom
      // and then scroll up by a calculated amount based on the message index
      const estimatedMessageHeight = 80; // Approximate height of each message
      const scrollPosition = Math.max(0, (messages.length - messageIndex - 1) * estimatedMessageHeight);
      
      scrollViewRef.current.scrollTo({
        y: scrollPosition,
        animated: true,
      });
      
      console.log(`📱 Scrolled to message ${messageId} at index ${messageIndex}, position ${scrollPosition}`);
    } else {
      console.log(`❌ Message ${messageId} not found or ScrollView ref not available`);
    }
  };

  const handleMessageLongPress = (messageId: string, isMyMessage: boolean) => {
    setSelectedMessageId(messageId);
    
    if (isMyMessage) {
      // Options for user's own messages
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Quote Message', 'Delete Message'],
            destructiveButtonIndex: 2,
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              handleQuoteMessage(messageId);
            } else if (buttonIndex === 2) {
              handleDeleteMessage(messageId);
            }
          }
        );
      } else {
        Alert.alert(
          'Message Options',
          'What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Quote Message', onPress: () => handleQuoteMessage(messageId) },
            { text: 'Delete Message', style: 'destructive', onPress: () => handleDeleteMessage(messageId) },
          ]
        );
      }
    } else {
      // Options for other users' messages
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Quote Message', 'Report Message', 'Block User'],
            destructiveButtonIndex: 3,
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              handleQuoteMessage(messageId);
            } else if (buttonIndex === 2) {
              handleReportMessage(messageId);
            } else if (buttonIndex === 3) {
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
            { text: 'Quote Message', onPress: () => handleQuoteMessage(messageId) },
            { text: 'Report Message', onPress: () => handleReportMessage(messageId) },
            { text: 'Block User', style: 'destructive', onPress: handleBlockUser },
          ]
        );
      }
    }
  };

  const handleReportMessage = async (messageId: string) => {
    const success = await reportMessage(messageId, 'Inappropriate content');
    
    if (success) {
      Alert.alert(
        'Message Reported',
        'This message has been reported to our moderation team.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to report message. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMessage(messageId);
            if (!success) {
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteConversation = async () => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this entire conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all messages in this conversation
              const { error } = await supabase
                .from('messages')
                .delete()
                .eq('chat_id', chatId);
              
              if (error) {
                Alert.alert('Error', 'Failed to delete conversation. Please try again.');
                return;
              }
              
              // Navigate back after successful deletion
              router.back();
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation. Please try again.');
            }
          }
        },
      ]
    );
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

  // Accept service offer - show payment options
  const acceptServiceOffer = async (offerId: string) => {
    try {
      console.log('🔄 Accepting service offer:', offerId);
      
      // Find the offer message
      const offerMessage = messages.find(m => m.offerId === offerId);
      if (!offerMessage || !offerMessage.serviceData) {
        Alert.alert('Error', 'Offer details not found');
        return;
      }

      const serviceData = offerMessage.serviceData;
      const amount = serviceData.customPrice || serviceData.price || 0;
      const buyerFee = Math.round((amount * 0.022) * 100) / 100; // 2.2% processing fee
      const totalAmount = amount + buyerFee;
      const sellerId = offerMessage.senderId;
      
      if (!user?.id || !sellerId) {
        Alert.alert('Error', 'User information not available');
        return;
      }

      // Show payment options to the buyer
      Alert.alert(
        'Choose Payment Method',
        `Service: ${serviceData.title}\nAmount: RM ${amount}\nProcessing Fee: RM ${buyerFee}\nTotal: RM ${totalAmount}\n\nHow would you like to pay?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Pay with Card/Bank',
            onPress: () => processExternalPayment(offerId, offerMessage, serviceData, amount, sellerId)
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting service offer:', error);
      Alert.alert('Error', 'Failed to accept offer. Please try again.');
    }
  };



  // Process payment using external payment methods
  const processExternalPayment = async (offerId: string, offerMessage: any, serviceData: any, amount: number, sellerId: string) => {
    try {
      // Set up the offer data for the payment modal
      const offerData = {
        id: offerId,
        chatId: chatId || '',
        serviceId: serviceData.id || '',
        sellerId: sellerId,
        buyerId: user!.id,
        originalPrice: amount,
        customPrice: serviceData.customPrice || amount,
        customDescription: serviceData.customDescription || '',
        customDeliveryTime: serviceData.customDeliveryTime || 3,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store the payment data for the modal
      setSelectedOfferForPayment({
        offer: offerData,
        serviceData: serviceData,
        sellerId: sellerId
      });
      
      // Show the payment modal
      setPaymentModalVisible(true);
    } catch (error) {
      console.error('Error preparing external payment:', error);
      Alert.alert('Error', 'Failed to prepare payment. Please try again.');
    }
  };

  // Reject service offer
  const rejectServiceOffer = async (offerId: string, reason?: string) => {
    try {
      console.log('🔄 Rejecting service offer:', offerId, 'Reason:', reason);
      
      // Find the offer message
      const offerMessage = messages.find(m => m.offerId === offerId);
      if (!offerMessage || !offerMessage.serviceData) {
        Alert.alert('Error', 'Offer details not found');
        return;
      }

      const sellerId = offerMessage.senderId;
      
      // Update offer status
      await supabase
        .from('service_offers')
        .update({ 
          status: 'rejected',
          rejection_reason: reason 
        })
        .eq('id', offerId);

      // Send notification to seller
      if (sellerId) {
        await notificationService.addOfferRejectedNotification({
          participantId: sellerId,
          participantName: userProfile?.full_name || user?.email?.split('@')[0] || 'User',
          participantImage: userProfile?.avatar_url || '',
          chatId: chatId || '',
          offerId: offerId,
          serviceTitle: offerMessage.serviceData.title,
          price: offerMessage.serviceData.customPrice || offerMessage.serviceData.price || 0,
          currency: 'USD',
          rejectReason: reason,
          isRejectedByMe: false
        });
      }

      Alert.alert('Offer Rejected', 'The seller has been notified.');
    } catch (error) {
      console.error('Error rejecting service offer:', error);
      Alert.alert('Error', 'Failed to reject offer. Please try again.');
    }
  };

  const renderMessage = (msg: LiveChatMessage, index: number) => {
    const showTimestamp = index === 0 || 
      (index > 0 && 
       Math.abs(new Date(msg.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime()) > 60000);

    const showAvatar = !(msg.senderId === user?.id) && (index === messages.length - 1 || 
      messages[index + 1]?.senderId !== msg.senderId);

    // Messages from blocked users are already filtered by the hook

    return (
      <View key={msg.id}>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestamp}>
              {formatTimestamp(msg.timestamp)}
            </Text>
          </View>
        )}
        {msg.messageType === 'offer' && msg.serviceData && msg.offerId ? (
          // Service offers span full width - no regular message wrapper
          <ServiceOfferMessage
            message={msg}
            isCurrentUser={msg.senderId === user?.id}
            onAcceptOffer={acceptServiceOffer}
            onRejectOffer={rejectServiceOffer}
            onViewOrderProgress={() => router.push('/(tabs)/orders')}
            onShareLocation={handleShareLocation}
            onEditOffer={(offerId) => {
              console.log('Edit offer:', offerId);
              // Find the message to get current offer details
              const offerMessage = messages.find(m => m.offerId === offerId);
              console.log('Found offer message for editing:', offerMessage);
              if (offerMessage && offerMessage.serviceData) {
                console.log('Service data for editing:', offerMessage.serviceData);
                console.log('Hustle job fields for editing:', {
                  startDate: offerMessage.serviceData.startDate,
                  endDate: offerMessage.serviceData.endDate,
                  preferredStartTime: offerMessage.serviceData.preferredStartTime,
                  preferredEndTime: offerMessage.serviceData.preferredEndTime,
                  locationAddress: offerMessage.serviceData.locationAddress,
                  urgencyLevel: offerMessage.serviceData.urgencyLevel,
                  workType: offerMessage.serviceData.workType,
                  estimatedHours: offerMessage.serviceData.estimatedHours,
                  requirements: offerMessage.serviceData.requirements,
                });
                // Store the offer ID and data for updating later
                const editingOfferData = {
                  offerId,
                  currentPrice: offerMessage.serviceData.customPrice || offerMessage.serviceData.price || 0,
                  currentDescription: offerMessage.serviceData.customDescription || '',
                  currentDeliveryTime: offerMessage.serviceData.customDeliveryTime || 3,
                  serviceTitle: offerMessage.serviceData.title || 'Service Offer',
                  // Include current hustle details
                  currentStartDate: offerMessage.serviceData.startDate,
                  currentEndDate: offerMessage.serviceData.endDate,
                  currentPreferredStartTime: offerMessage.serviceData.preferredStartTime,
                  currentPreferredEndTime: offerMessage.serviceData.preferredEndTime,
                  currentLocationAddress: offerMessage.serviceData.locationAddress,
                  currentUrgencyLevel: offerMessage.serviceData.urgencyLevel,
                  currentWorkType: offerMessage.serviceData.workType,
                  currentEstimatedHours: offerMessage.serviceData.estimatedHours,
                  currentRequirements: offerMessage.serviceData.requirements,
                };
                
                // Set the selected service with the current offer data
                const serviceWithOfferData: Service = {
                  id: offerMessage.serviceData.id || '',
                  user_id: user?.id || '',
                  title: offerMessage.serviceData.title || '',
                  description: offerMessage.serviceData.description || '',
                  price: offerMessage.serviceData.price || 0,
                  currency: offerMessage.serviceData.currency || 'RM',
                  category_name: offerMessage.serviceData.category_name || '',
                  image_url: offerMessage.serviceData.image_url || '',
                  rating: 0,
                  review_count: 0,
                };
                
                // Set editing state first, then open modal
                setEditingOffer(editingOfferData);
                setSelectedService(serviceWithOfferData);
                setServiceOfferModalVisible(true);
              }
            }}
            onCancelOffer={cancelServiceOffer}
            onViewService={(serviceId) => router.push(`/service/${serviceId}`)}
          />
        ) : msg.messageType === 'structured_inquiry' ? (
          <StructuredInquiryMessage
            message={msg}
            isOwnMessage={msg.senderId === user?.id}
            onViewService={(serviceData) => {
              if (serviceData.serviceId) {
                router.push(`/service/${serviceData.serviceId}`);
              }
            }}
          />
        ) : (
          <TouchableOpacity
            onLongPress={() => handleMessageLongPress(msg.id, msg.senderId === user?.id)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.messageContainer,
              (msg.senderId === user?.id) ? styles.myMessageContainer : styles.theirMessageContainer
            ]}>
              {!(msg.senderId === user?.id) && showAvatar && (
                <Image source={{ uri: msg.senderImage }} style={styles.avatar} />
              )}
              {!(msg.senderId === user?.id) && !showAvatar && (
                <View style={styles.avatarPlaceholder} />
              )}
              <View style={[
                styles.messageBubble,
                (msg.senderId === user?.id) ? styles.myMessageBubble : styles.theirMessageBubble
              ]}>
                {/* Show quoted message if exists */}
                {msg.quotedMessageId && msg.quotedMessageContent && msg.quotedMessageSenderName && (
                  <QuotedMessage
                    content={msg.quotedMessageContent}
                    senderName={msg.quotedMessageSenderName}
                    messageType={msg.quotedMessageType || 'text'}
                    isMyMessage={msg.senderId === user?.id}
                    quotedMessageId={msg.quotedMessageId}
                    onPress={() => scrollToMessage(msg.quotedMessageId!)}
                  />
                )}
                {msg.messageType === 'structured_inquiry' ? (
                  <StructuredInquiryMessage
                    message={msg}
                    isOwnMessage={msg.senderId === user?.id}
                    onViewService={(serviceData) => {
                      console.log('View service from structured inquiry:', serviceData);
                    }}
                  />
                ) : msg.messageType === 'service' && msg.serviceData ? (
                <View style={styles.serviceMessageContent}>
                  <View style={styles.serviceHeader}>
                    <Package size={16} color={(msg.senderId === user?.id) ? '#FFFFFF' : '#007AFF'} />
                    <Text style={[
                    styles.serviceLabel,
                    (msg.senderId === user?.id) ? styles.myServiceLabel : styles.theirServiceLabel
                  ]}>Service Shared</Text>
                  </View>
                  {msg.serviceData.image_url && (
                    <Image 
                      source={{ uri: msg.serviceData.image_url }} 
                      style={styles.serviceImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={[
                    styles.serviceTitle,
                    (msg.senderId === user?.id) ? styles.myServiceTitle : styles.theirServiceTitle
                  ]}>
                    {msg.serviceData.title}
                  </Text>
                  <Text style={[
                    styles.servicePrice,
                    (msg.senderId === user?.id) ? styles.myServicePrice : styles.theirServicePrice
                  ]}>
                    {msg.serviceData.currency} {msg.serviceData.price}
                  </Text>
                  <Text style={[
                    styles.serviceDescription,
                    (msg.senderId === user?.id) ? styles.myServiceDescription : styles.theirServiceDescription
                  ]} numberOfLines={2}>
                    {msg.serviceData.description}
                  </Text>
                  <TouchableOpacity 
                    style={[
                      styles.viewServiceButton,
                      (msg.senderId === user?.id) ? styles.myViewServiceButton : styles.theirViewServiceButton
                    ]}
                    onPress={() => {
                      console.log('🔗 Chat: View Service clicked with serviceData:', msg.serviceData);
                      console.log('🔗 Chat: Service ID:', msg.serviceData?.id);
                      console.log('🔗 Chat: Service title:', msg.serviceData?.title);
                      
                      if (msg.serviceData?.id) {
                        // Check if this is a custom offer with no service reference
                        if (msg.serviceData.isCustomOffer && 
                            (msg.serviceData.id.startsWith('custom-offer-') || 
                             msg.serviceData.id.startsWith('fallback-'))) {
                          console.log('🔗 Chat: This is a custom offer with no service reference, showing details in alert');
                          Alert.alert(
                            'Custom Service Offer',
                            `Title: ${msg.serviceData.title}\n\nDescription: ${msg.serviceData.description}\n\nPrice: ${msg.serviceData.currency} ${msg.serviceData.price}\n\nThis is a custom offer sent in chat.`,
                            [{ text: 'OK' }]
                          );
                        } else {
                          // This is a regular service or custom offer based on existing service, navigate to service details
                          router.push(`/service/${msg.serviceData.id}`);
                        }
                      } else {
                        console.error('❌ Chat: No service ID found in serviceData');
                        Alert.alert('Error', 'Service ID not found');
                      }
                    }}
                  >
                    <Text style={[
                      styles.viewServiceText,
                      (msg.senderId === user?.id) ? styles.myViewServiceText : styles.theirViewServiceText
                    ]}>View Service</Text>
                  </TouchableOpacity>
                </View>
                ) : false ? (
                  <View style={styles.locationMessageContent}>
                    <View style={styles.locationHeader}>
                      <MapPin size={16} color={(msg.senderId === user?.id) ? '#FFFFFF' : '#007AFF'} />
                      <Text style={[
                        styles.locationLabel,
                        (msg.senderId === user?.id) ? styles.myLocationLabel : styles.theirLocationLabel
                      ]}>Job Location Shared</Text>
                    </View>
                    <Text style={[
                      styles.messageText,
                      (msg.senderId === user?.id) ? styles.myMessageText : styles.theirMessageText
                    ]}>
                      {msg.content}
                    </Text>
                  </View>
                ) : (
                  <Text style={[
                    styles.messageText,
                    (msg.senderId === user?.id) ? styles.myMessageText : styles.theirMessageText
                  ]}>
                    {msg.content}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };



  // Don't render chat if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please sign in to access chat</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {shouldRedirect ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#1D1D1F" />
            </TouchableOpacity>
            
            {isLoadingState || !hasValidChat ? (
              <Text style={styles.headerTitle}>Loading...</Text>
            ) : (
            <>
              <View style={styles.headerInfo}>
                <TouchableOpacity onPress={() => {
                  const targetParticipantId = Array.isArray(participantId) ? participantId[0] : participantId;
                  if (targetParticipantId) {
                    router.push(`/profile/${targetParticipantId}`);
                  }
                }}>
                  <Image source={{ uri: chat.participantImage }} style={styles.headerAvatar} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerText}
                  onPress={() => {
                    const targetParticipantId = Array.isArray(participantId) ? participantId[0] : participantId;
                    if (targetParticipantId) {
                      router.push(`/profile/${targetParticipantId}`);
                    }
                  }}
                >
                  <Text style={styles.headerName}>{chat.participantName}</Text>
                  <Text style={styles.headerStatus}>{chat.lastActive}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleDeleteConversation}>
                <Trash2 size={24} color="#FF3B30" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Main Content - Loading or Messages */}
        {isLoadingState ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Setting up chat...</Text>
          </View>
        ) : (
          <>
            {/* Messages */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map(renderMessage)}
          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Structured Inquiry Draft */}
        {structuredInquiryDraft && (
          <StructuredInquiryDraft
            inquiryData={structuredInquiryDraft}
            onSend={handleSendStructuredInquiry}
            onCancel={handleCancelStructuredInquiry}
          />
        )}


        
        {/* Quoted Message Display */}
        {quotedMessage && (
          <View style={styles.quotedMessageInputContainer}>
            <View style={styles.quotedMessageInputContent}>
              <QuotedMessage
                content={quotedMessage.content}
                senderName={quotedMessage.senderName}
                messageType={quotedMessage.messageType}
                isMyMessage={false}
                quotedMessageId={quotedMessage.id}
                onPress={() => scrollToMessage(quotedMessage.id)}
              />
            </View>
            <TouchableOpacity 
              style={styles.cancelQuoteButton}
              onPress={handleCancelQuote}
            >
              <X size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {isUserSeller && (
              <TouchableOpacity 
                style={styles.serviceButton}
                onPress={() => setServiceModalVisible(true)}
              >
                <Package size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                // Handle typing indicators here if needed
              }}
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
          </>
        )}
        </KeyboardAvoidingView>
      )}
        
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

        {/* Service Selection Modal */}
        <Modal
          visible={serviceModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setServiceModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.serviceModalContent}>
              <View style={styles.serviceModalHeader}>
                <Text style={styles.modalTitle}>Share a Service</Text>
                <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
                  <X size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              {loadingServices ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading services...</Text>
                </View>
              ) : userServices.length === 0 ? (
                <View style={styles.emptyServicesContainer}>
                  <Package size={48} color="#8E8E93" />
                  <Text style={styles.emptyServicesText}>No services available</Text>
                  <Text style={styles.emptyServicesSubtext}>Create a service to share with others</Text>
                  <TouchableOpacity 
                    style={styles.createServiceButton}
                    onPress={() => {
                      setServiceModalVisible(false);
                      router.push('/create-service-listing');
                    }}
                  >
                    <Text style={styles.createServiceButtonText}>Create Service</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={(userServices || []).filter(service => service.id && service.id.trim() !== '')}
                  keyExtractor={(item) => item.id || ''}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.serviceItem}
                      onPress={() => handleShareService(item)}
                    >
                      {item.image_url && (
                        <Image 
                          source={{ uri: item.image_url }} 
                          style={styles.serviceItemImage}
                        />
                      )}
                      <View style={styles.serviceItemContent}>
                        <Text style={styles.serviceItemTitle}>{item.title}</Text>
                        <Text style={styles.serviceItemPrice}>
                          {item.currency} {item.price}
                        </Text>
                        <Text style={styles.serviceItemDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.servicesList}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Service Offer Modal */}
        <ServiceOfferModal
           visible={serviceOfferModalVisible}
           service={selectedService}
           onClose={() => {
             setServiceOfferModalVisible(false);
             setSelectedService(null);
             setEditingOffer(null);
           }}
           onSendOffer={handleSendServiceOffer}
           isEditing={!!editingOffer}
           editingOfferId={editingOffer?.offerId}
           existingOfferData={editingOffer ? {
             customPrice: editingOffer.currentPrice,
             customDescription: editingOffer.currentDescription,
             customDeliveryTime: editingOffer.currentDeliveryTime,
             startDate: editingOffer.currentStartDate,
             endDate: editingOffer.currentEndDate,
             preferredStartTime: editingOffer.currentPreferredStartTime,
             preferredEndTime: editingOffer.currentPreferredEndTime,
             locationAddress: editingOffer.currentLocationAddress,
             urgencyLevel: editingOffer.currentUrgencyLevel,
             workType: editingOffer.currentWorkType,
             estimatedHours: editingOffer.currentEstimatedHours,
             requirements: editingOffer.currentRequirements,
           } : undefined}
        />


        {/* Service Selection Modal */}
        <Modal
          visible={serviceSelectionModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setServiceSelectionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.selectionModalContent}>
              <View style={styles.selectionModalHeader}>
                <Text style={styles.modalTitle}>Share Service</Text>
                <TouchableOpacity onPress={() => {
                  setServiceSelectionModalVisible(false);
                  setSelectedService(null);
                }}>
                  <X size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              {selectedService && (
                <View style={styles.selectedServicePreview}>
                  {selectedService.image_url && (
                    <Image 
                      source={{ uri: selectedService.image_url }} 
                      style={styles.selectedServiceImage}
                    />
                  )}
                  <View style={styles.selectedServiceInfo}>
                    <Text style={styles.selectedServiceTitle}>{selectedService.title}</Text>
                    <Text style={styles.selectedServicePrice}>
                      {selectedService.currency} {selectedService.price}
                    </Text>
                    <Text style={styles.selectedServiceDescription} numberOfLines={2}>
                      {selectedService.description}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.selectionButtons}>
                <TouchableOpacity 
                  style={styles.sendDirectlyButton}
                  onPress={handleSendServiceDirectly}
                >
                  <Text style={styles.sendDirectlyButtonText}>Send As-Is</Text>
                  <Text style={styles.sendDirectlyButtonSubtext}>Share the service without modifications</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.customizeButton}
                  onPress={handleCustomizeService}
                >
                  <Text style={styles.customizeButtonText}>Customize Offer</Text>
                  <Text style={styles.customizeButtonSubtext}>Modify price, description, or delivery time</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Payment Modal */}
        <MalaysianPaymentModal
          visible={paymentModalVisible}
          offer={selectedOfferForPayment?.offer}
          serviceData={selectedOfferForPayment?.serviceData}
          buyerId={user?.id || ''}
          sellerId={selectedOfferForPayment?.sellerId || ''}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={handlePaymentCancel}
        />

        {/* Job Progress Monitor */}
        <JobProgressMonitor
          isVisible={showJobProgress}
          jobId={currentJobId || ''}
          onClose={() => {
            setShowJobProgress(false);
            setCurrentJobId(null);
          }}
          onSendMessage={() => {
            setShowJobProgress(false);
            setCurrentJobId(null);
          }}
        />

        {/* Service Offer Modal */}
        <ServiceOfferModal
          visible={serviceOfferModalVisible}
          onClose={() => {
            setServiceOfferModalVisible(false);
            setSelectedService(null);
            setEditingOffer(null);
          }}
          service={selectedService}
          onSendOffer={handleSendServiceOffer}
          isLoading={false}
          isEditing={!!editingOffer}
          editingOfferId={editingOffer?.offerId}
          existingOfferData={editingOffer ? {
            customPrice: editingOffer.currentPrice,
            customDescription: editingOffer.currentDescription,
            customDeliveryTime: editingOffer.currentDeliveryTime,
            startDate: editingOffer.currentStartDate,
            endDate: editingOffer.currentEndDate,
            preferredStartTime: editingOffer.currentPreferredStartTime,
            preferredEndTime: editingOffer.currentPreferredEndTime,
            locationAddress: editingOffer.currentLocationAddress,
            urgencyLevel: editingOffer.currentUrgencyLevel,
            workType: editingOffer.currentWorkType,
            estimatedHours: editingOffer.currentEstimatedHours,
            requirements: editingOffer.currentRequirements,
          } : undefined}
        />

        {/* Location Share Modal */}
        <LocationShareModal
          visible={locationShareModalVisible}
          onClose={handleLocationShareCancel}
          onLocationShare={handleLocationShare}
          serviceTitle={locationShareData?.serviceTitle || ''}
          buyerName={locationShareData?.buyerName || ''}
        />

        {/* Service Variant Selection Modal for Structured Inquiry */}
        <ServiceVariantSelectionModal
          visible={serviceVariantSelectionModalVisible}
          onClose={handleServiceVariantSelectionCancel}
          onVariantSelect={handleServiceVariantSelected}
          serviceId={inquiryServiceData?.serviceId || ''}
          serviceTitle={inquiryServiceData?.serviceTitle || ''}
        />

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
    backgroundColor: '#34C759',
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
  typingContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  // Service sharing styles
  serviceButton: {
    padding: 8,
    marginRight: 8,
  },
  serviceModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    paddingTop: 20,
  },
  serviceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  emptyServicesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyServicesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyServicesSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  createServiceButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createServiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  servicesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  serviceItem: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  serviceItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceItemContent: {
    flex: 1,
  },
  serviceItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  serviceItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  serviceItemDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  // Service message styles
  serviceMessageContent: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    maxWidth: 280,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 12,
  },
  viewServiceButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  viewServiceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // My service message styles
  myServiceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  myServiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  myServicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
  },
  myServiceDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
    marginBottom: 12,
  },
  myViewServiceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  myViewServiceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Their service message styles
  theirServiceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  theirServiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  theirServicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 6,
  },
  theirServiceDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 12,
  },
  theirViewServiceButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  theirViewServiceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  selectionModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    paddingTop: 20,
  },
  selectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  selectedServicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  selectedServiceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  selectedServiceInfo: {
    flex: 1,
  },
  selectedServiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  selectedServicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  selectedServiceDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  selectionButtons: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sendDirectlyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  sendDirectlyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sendDirectlyButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  customizeButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  customizeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  customizeButtonSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  // Edit Modal Styles
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  editModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  editModalSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  editFormContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  editInputContainer: {
    marginBottom: 20,
  },
  editInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#F8F9FA',
  },
  editTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  editModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  editCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // New styles for enhanced edit modal
  editSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  editDateButton: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
  },
  editDateButtonText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  editWorkTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editWorkTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  editWorkTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  editWorkTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  editWorkTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  editUrgencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editUrgencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F8F9FA',
  },
  editUrgencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  editUrgentButton: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFEBEE',
  },
  editHighButton: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF3E0',
  },
  editUrgencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  editUrgencyButtonTextActive: {
    color: '#FFFFFF',
  },
  
  // Edit location styles
  editLocationContainer: {
    position: 'relative',
  },
  editLocationContainerDisabled: {
    opacity: 0.5,
  },
  editLocationInput: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  editLocationInputContainer: {
    // Container styles handled by editInput
  },
  editLocationInputContainerDisabled: {
    opacity: 0.6,
  },
  editLocationInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#ccc',
  },
  editLocationListView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editLocationRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  editLocationDescription: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  editRemoteWorkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 1,
  },
  editRemoteWorkText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  
  // Edit Location Button Styles
  editLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  editLocationButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
  },
  editLocationButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 8,
  },
  editLocationButtonTextDisabled: {
    color: '#ccc',
  },
  editLocationButtonHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  
  // Edit Map Modal Styles
  editMapModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  editMapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  editMapModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  editMapModalCancelText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  editMapModalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  editMapModalDoneTextDisabled: {
    color: '#ccc',
  },
  editMap: {
    flex: 1,
  },
  editSelectedLocationInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  editSelectedLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  editSelectedLocationAddress: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  editMapInstructions: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editMapInstructionsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Quoted message input styles
  quotedMessageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quotedMessageInputContent: {
    flex: 1,
  },
  cancelQuoteButton: {
    padding: 8,
    marginLeft: 8,
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

  // Message bubble styles
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: '#1C1C1E',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },

  // Location message styles
  locationMessageContent: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    maxWidth: 280,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  myLocationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  theirLocationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
});

export default ChatScreen;