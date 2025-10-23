import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { signalRService } from '@/services/signalr-service';
import { HubConnectionState } from '@microsoft/signalr';

/**
 * Custom hook to manage SignalR connection based on authentication status
 * Automatically connects for both logged-in users (with token) and guest users (with deviceId)
 */
export const useSignalR = () => {
  const { isAuthenticated, token, user } = useAuthStore();
  const connectionStateRef = useRef<HubConnectionState | null>(null);
  const isConnecting = useRef(false);
  const wasAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    const handleConnection = async () => {
      let currentState = signalRService.getConnectionState();
      
      // Handle authentication state transitions
      // If user just logged out (was authenticated, now not), disconnect token-based connection
      if (wasAuthenticatedRef.current && !isAuthenticated) {
        console.log('SignalR Hook: User logged out, disconnecting token-based connection');
        if (currentState === HubConnectionState.Connected || currentState === HubConnectionState.Connecting) {
          try {
            await signalRService.stopConnection();
            connectionStateRef.current = null;
            currentState = null; // Reset state to allow reconnection
          } catch (error) {
            console.error('SignalR Hook: Error stopping connection on logout:', error);
          }
        }
      }
      // If user just logged in (was not authenticated, now is), disconnect deviceId-based connection
      else if (!wasAuthenticatedRef.current && isAuthenticated && token) {
        console.log('SignalR Hook: User logged in, disconnecting deviceId-based connection');
        if (currentState === HubConnectionState.Connected || currentState === HubConnectionState.Connecting) {
          try {
            await signalRService.stopConnection();
            connectionStateRef.current = null;
            currentState = null; // Reset state to allow reconnection
          } catch (error) {
            console.error('SignalR Hook: Error stopping connection on login:', error);
          }
        }
      }
      
      // Update the ref for next comparison
      wasAuthenticatedRef.current = isAuthenticated;
      
      // Check if we're already connected or connecting (after potential state changes above)
      if (currentState === HubConnectionState.Connected || isConnecting.current) {
        return;
      }

      try {
        isConnecting.current = true;
        
        if (isAuthenticated && token && user) {
          // Logged-in user: connect with access token
          console.log('SignalR Hook: Starting connection for logged-in user:', user.email);
          await signalRService.startConnection(token);
        } else {
          // Guest user: connect with deviceId (no token)
          console.log('SignalR Hook: Starting connection for guest user with deviceId');
          await signalRService.startConnection();
        }
        
        connectionStateRef.current = HubConnectionState.Connected;
      } catch (error) {
        console.error('SignalR Hook: Failed to connect:', error);
      } finally {
        isConnecting.current = false;
      }
    };

    handleConnection();

    // Cleanup on unmount
    return () => {
      // Don't automatically disconnect on component unmount since this is a global connection
      // Connection remains active for both logged-in and guest users
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