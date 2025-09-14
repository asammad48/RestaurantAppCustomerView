import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { signalRService } from '@/services/signalr-service';
import { HubConnectionState } from '@microsoft/signalr';

/**
 * Custom hook to manage SignalR connection based on authentication status
 * Automatically connects when user is logged in and disconnects when logged out
 */
export const useSignalR = () => {
  const { isAuthenticated, token, user } = useAuthStore();
  const connectionStateRef = useRef<HubConnectionState | null>(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    const handleConnection = async () => {
      // If user is authenticated and has a token
      if (isAuthenticated && token && user) {
        // Check if we're already connected or connecting
        const currentState = signalRService.getConnectionState();
        
        if (currentState === HubConnectionState.Connected || isConnecting.current) {
          return;
        }

        try {
          isConnecting.current = true;
          console.log('SignalR Hook: Starting connection for user:', user.email);
          await signalRService.startConnection(token);
          connectionStateRef.current = HubConnectionState.Connected;
        } catch (error) {
          console.error('SignalR Hook: Failed to connect:', error);
        } finally {
          isConnecting.current = false;
        }
      } else {
        // User is not authenticated, disconnect if connected
        const currentState = signalRService.getConnectionState();
        
        if (currentState === HubConnectionState.Connected || currentState === HubConnectionState.Connecting) {
          try {
            console.log('SignalR Hook: Stopping connection - user logged out');
            await signalRService.stopConnection();
            connectionStateRef.current = null;
          } catch (error) {
            console.error('SignalR Hook: Error stopping connection:', error);
          }
        }
      }
    };

    handleConnection();

    // Cleanup on unmount
    return () => {
      // Don't automatically disconnect on component unmount since this is a global connection
      // Only disconnect when user actually logs out (handled above)
    };
  }, [isAuthenticated, token, user?.id]); // Dependencies: re-run when auth state changes

  // Cleanup on unmount of the component using this hook
  useEffect(() => {
    return () => {
      // Only disconnect if the component using this hook is unmounting
      // and there's an active connection
      const cleanup = async () => {
        if (signalRService.getConnectionState() === HubConnectionState.Connected) {
          console.log('SignalR Hook: Component unmounting, cleaning up connection');
          await signalRService.stopConnection();
        }
      };
      
      // Don't await in cleanup
      cleanup().catch(console.error);
    };
  }, []);

  // Return connection status and service instance for advanced usage
  return {
    isConnected: signalRService.isConnected(),
    connectionState: signalRService.getConnectionState(),
    signalRService, // For advanced usage if needed
  };
};