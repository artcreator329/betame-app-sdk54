import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabaseChatService } from '@/lib/supabase-chat-service';

interface SupabaseChatContextType {
  connectionStatus: string;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  chatService: typeof supabaseChatService;
}

const SupabaseChatContext = createContext<SupabaseChatContextType | undefined>(undefined);

interface SupabaseChatProviderProps {
  children: ReactNode;
}

export function SupabaseChatProvider({ children }: SupabaseChatProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');

  useEffect(() => {
    // Initialize connection status
    setConnectionStatus(supabaseChatService.getConnectionStatus());

    // Subscribe to connection state changes
    const unsubscribe = supabaseChatService.onConnectionStateChange((state) => {
      setConnectionStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array to ensure this only runs once

  const contextValue: SupabaseChatContextType = {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected' || connectionStatus === 'failed',
    chatService: supabaseChatService,
  };

  return (
    <SupabaseChatContext.Provider value={contextValue}>
      {children}
    </SupabaseChatContext.Provider>
  );
}

export function useSupabaseChatContext() {
  const context = useContext(SupabaseChatContext);
  if (context === undefined) {
    throw new Error('useSupabaseChatContext must be used within a SupabaseChatProvider');
  }
  return context;
}

// Connection status component (simplified for Supabase - always connected)
export function ConnectionStatus() {
  const { connectionStatus, isConnected, isConnecting } = useSupabaseChatContext();

  if (isConnected) {
    return null; // Don't show anything when connected (which is always for Supabase)
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