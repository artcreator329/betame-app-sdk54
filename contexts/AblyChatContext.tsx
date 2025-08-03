import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ablyChatService } from '@/lib/ably-chat-service';

interface AblyChatContextType {
  connectionStatus: string;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  chatService: typeof ablyChatService;
}

const AblyChatContext = createContext<AblyChatContextType | undefined>(undefined);

interface AblyChatProviderProps {
  children: ReactNode;
}

export function AblyChatProvider({ children }: AblyChatProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  useEffect(() => {
    // Initialize connection status
    setConnectionStatus(ablyChatService.getConnectionStatus());

    // Subscribe to connection state changes
    const unsubscribe = ablyChatService.onConnectionStateChange((state) => {
      setConnectionStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const contextValue: AblyChatContextType = {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected' || connectionStatus === 'failed',
    chatService: ablyChatService,
  };

  return (
    <AblyChatContext.Provider value={contextValue}>
      {children}
    </AblyChatContext.Provider>
  );
}

export function useAblyChatContext() {
  const context = useContext(AblyChatContext);
  if (context === undefined) {
    throw new Error('useAblyChatContext must be used within an AblyChatProvider');
  }
  return context;
}

// Connection status component
export function ConnectionStatus() {
  const { connectionStatus, isConnected, isConnecting } = useAblyChatContext();

  if (isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: isConnecting ? '#fbbf24' : '#ef4444',
      color: 'white',
      padding: 8,
      textAlign: 'center',
      fontSize: 14,
      zIndex: 1000,
    }}>
      {isConnecting ? 'Connecting to chat...' : `Chat disconnected (${connectionStatus})`}
    </div>
  );
}