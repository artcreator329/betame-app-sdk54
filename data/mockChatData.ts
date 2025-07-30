export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string;
  message: string;
  timestamp: Date;
  isMe: boolean;
}

export interface Chat {
  id: string;
  participantId: string;
  participantName: string;
  participantImage: string;
  lastActive: string;
  serviceTitle?: string;
  messages: ChatMessage[];
}

export const mockChats: Chat[] = [
  {
    id: '1',
    participantId: 'jeslina-kong',
    participantName: 'Jeslina Kong',
    participantImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
    lastActive: 'Active 11m ago',
    serviceTitle: '1-on-1 English Learning Course',
    messages: [
      {
        id: '1',
        senderId: 'me',
        senderName: 'Me',
        senderImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Hi, I would like enquire about your service!',
        timestamp: new Date('2024-11-30T09:41:00'),
        isMe: true,
      },
      {
        id: '2',
        senderId: 'jeslina-kong',
        senderName: 'Jeslina Kong',
        senderImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Thank you for your message!',
        timestamp: new Date('2024-12-03T11:53:00'),
        isMe: false,
      },
      {
        id: '3',
        senderId: 'jeslina-kong',
        senderName: 'Jeslina Kong',
        senderImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'May I know which service you would like to know more?',
        timestamp: new Date('2024-12-03T11:53:00'),
        isMe: false,
      },
      {
        id: '4',
        senderId: 'jeslina-kong',
        senderName: 'Jeslina Kong',
        senderImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Is it 1-on-1 English learning Course?',
        timestamp: new Date('2024-12-03T11:53:00'),
        isMe: false,
      },
      {
        id: '5',
        senderId: 'me',
        senderName: 'Me',
        senderImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Hi, are you there?',
        timestamp: new Date('2024-12-05T18:51:00'),
        isMe: true,
      },
      {
        id: '6',
        senderId: 'jeslina-kong',
        senderName: 'Jeslina Kong',
        senderImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Hi Dear, is it you\'re looking at Engling Learning Course?',
        timestamp: new Date('2024-12-11T23:57:00'),
        isMe: false,
      },
      {
        id: '7',
        senderId: 'me',
        senderName: 'Me',
        senderImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Yes',
        timestamp: new Date('2024-12-11T23:57:00'),
        isMe: true,
      },
      {
        id: '8',
        senderId: 'jeslina-kong',
        senderName: 'Jeslina Kong',
        senderImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Great! Our 1-on-1 English learning course is start from RM 128 per hour, minimum booking is 2 hours booking, registration fee is FREE, Enrollment deposit is RM 200, there\'s assessment test prior to the beginning of our course and it\'s FOC',
        timestamp: new Date('2024-12-11T23:57:00'),
        isMe: false,
      },
      {
        id: '9',
        senderId: 'jeslina-kong',
        senderName: 'Jeslina Kong',
        senderImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'May I know your age?',
        timestamp: new Date('2024-12-11T23:57:00'),
        isMe: false,
      },
      {
        id: '10',
        senderId: 'me',
        senderName: 'Me',
        senderImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: '19',
        timestamp: new Date('2024-12-11T23:57:00'),
        isMe: true,
      },
    ],
  },
  {
    id: '2',
    participantId: 'abang-joe',
    participantName: 'Abang Joe',
    participantImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
    lastActive: 'Active 2h ago',
    serviceTitle: 'Pawer Puff - Pet Care Services',
    messages: [
      {
        id: '1',
        senderId: 'me',
        senderName: 'Me',
        senderImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Hi! I need pet care for my dog this weekend',
        timestamp: new Date('2024-12-12T10:30:00'),
        isMe: true,
      },
      {
        id: '2',
        senderId: 'abang-joe',
        senderName: 'Abang Joe',
        senderImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Sure! What breed is your dog and what dates do you need?',
        timestamp: new Date('2024-12-12T10:35:00'),
        isMe: false,
      },
    ],
  },
];

export const findChatByParticipant = (participantId: string): Chat | undefined => {
  return mockChats.find(chat => chat.participantId === participantId);
};

export const findChatById = (chatId: string): Chat | undefined => {
  return mockChats.find(chat => chat.id === chatId);
};