'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  websocketClient,
  RealtimeClickEvent,
  StatsUpdateEvent,
  ConnectionState,
} from '@/lib/websocket';

/**
 * WebSocket hook options
 */
interface UseWebSocketOptions {
  /** Link ID to subscribe to (optional, subscribe to specific link) */
  linkId?: string;
  /** Subscribe to all user's link analytics */
  subscribeToUserAnalytics?: boolean;
  /** Maximum number of clicks to keep in history */
  maxClickHistory?: number;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when new click received */
  onNewClick?: (click: RealtimeClickEvent) => void;
  /** Callback when stats updated */
  onStatsUpdate?: (stats: StatsUpdateEvent) => void;
  /** Callback on connection state change */
  onConnectionChange?: (state: ConnectionState) => void;
}

/**
 * WebSocket hook return value
 */
interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether currently connected */
  isConnected: boolean;
  /** Whether authenticated */
  isAuthenticated: boolean;
  /** Recent click events (newest first) */
  recentClicks: RealtimeClickEvent[];
  /** Total clicks received since connection */
  clickCount: number;
  /** Last stats update */
  lastStats: StatsUpdateEvent | null;
  /** Manually connect to WebSocket */
  connect: () => void;
  /** Manually disconnect from WebSocket */
  disconnect: () => void;
  /** Subscribe to a specific link */
  subscribeToLink: (linkId: string) => void;
  /** Unsubscribe from a specific link */
  unsubscribeFromLink: (linkId: string) => void;
  /** Clear click history */
  clearClickHistory: () => void;
}

/**
 * React hook for WebSocket real-time analytics
 *
 * Features:
 * - Automatic connection management
 * - Click history with configurable limit
 * - Automatic cleanup on unmount
 * - Link-specific or global analytics subscriptions
 *
 * @param options - Hook configuration options
 * @returns WebSocket state and controls
 *
 * @example
 * ```tsx
 * const { isConnected, recentClicks, clickCount } = useWebSocket({
 *   linkId: 'abc123',
 *   onNewClick: (click) => console.log('New click:', click),
 * });
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    linkId,
    subscribeToUserAnalytics = false,
    maxClickHistory = 50,
    autoConnect = true,
    onNewClick,
    onStatsUpdate,
    onConnectionChange,
  } = options;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    authenticated: false,
    socketId: null,
    error: null,
  });
  const [recentClicks, setRecentClicks] = useState<RealtimeClickEvent[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [lastStats, setLastStats] = useState<StatsUpdateEvent | null>(null);

  // Refs for callbacks to avoid stale closures
  const onNewClickRef = useRef(onNewClick);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);

  // Update refs when callbacks change
  useEffect(() => {
    onNewClickRef.current = onNewClick;
  }, [onNewClick]);

  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  // Handle new click event
  const handleNewClick = useCallback(
    (click: RealtimeClickEvent) => {
      setRecentClicks((prev) => {
        const newClicks = [click, ...prev].slice(0, maxClickHistory);
        return newClicks;
      });
      setClickCount((prev) => prev + 1);
      onNewClickRef.current?.(click);
    },
    [maxClickHistory]
  );

  // Handle stats update
  const handleStatsUpdate = useCallback((stats: StatsUpdateEvent) => {
    setLastStats(stats);
    onStatsUpdateRef.current?.(stats);
  }, []);

  // Handle connection state change
  const handleConnectionChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    onConnectionChangeRef.current?.(state);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    websocketClient.connect({
      onConnect: handleConnectionChange,
      onDisconnect: (reason) => {
        setConnectionState((prev) => ({
          ...prev,
          connected: false,
          error: reason,
        }));
      },
      onNewClick: handleNewClick,
      onGlobalClick: handleNewClick, // Also handle global clicks
      onStatsUpdate: handleStatsUpdate,
      onError: (error) => {
        setConnectionState((prev) => ({
          ...prev,
          error: error.message,
        }));
      },
      onReconnecting: (attempt) => {
        setConnectionState((prev) => ({
          ...prev,
          error: `Reconnecting (attempt ${attempt})...`,
        }));
      },
    });
  }, [handleNewClick, handleStatsUpdate, handleConnectionChange]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketClient.disconnect();
    setConnectionState({
      connected: false,
      authenticated: false,
      socketId: null,
      error: null,
    });
  }, []);

  // Subscribe to link
  const subscribeToLink = useCallback((id: string) => {
    websocketClient.subscribeToLink(id);
  }, []);

  // Unsubscribe from link
  const unsubscribeFromLink = useCallback((id: string) => {
    websocketClient.unsubscribeFromLink(id);
  }, []);

  // Clear click history
  const clearClickHistory = useCallback(() => {
    setRecentClicks([]);
    setClickCount(0);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      // Cleanup on unmount - only disconnect if this is the last consumer
      // In a real app, you might want to track consumers
    };
  }, [autoConnect, connect]);

  // Subscribe to specific link when linkId changes
  useEffect(() => {
    if (linkId && connectionState.connected) {
      subscribeToLink(linkId);

      return () => {
        unsubscribeFromLink(linkId);
      };
    }
    return undefined;
  }, [linkId, connectionState.connected, subscribeToLink, unsubscribeFromLink]);

  // Subscribe to user analytics if requested
  useEffect(() => {
    if (subscribeToUserAnalytics && connectionState.connected && connectionState.authenticated) {
      websocketClient.subscribeToUserAnalytics();
    }
  }, [subscribeToUserAnalytics, connectionState.connected, connectionState.authenticated]);

  return {
    connectionState,
    isConnected: connectionState.connected,
    isAuthenticated: connectionState.authenticated,
    recentClicks,
    clickCount,
    lastStats,
    connect,
    disconnect,
    subscribeToLink,
    unsubscribeFromLink,
    clearClickHistory,
  };
}

/**
 * Hook for global/admin analytics (all clicks)
 * Simplified version for dashboard overview
 */
export function useGlobalAnalytics(options: {
  maxClickHistory?: number;
  autoConnect?: boolean;
  onNewClick?: (click: RealtimeClickEvent) => void;
} = {}) {
  return useWebSocket({
    ...options,
    subscribeToUserAnalytics: true,
  });
}

/**
 * Hook for specific link analytics
 * @param linkId - Link ID to track
 */
export function useLinkAnalytics(
  linkId: string,
  options: Omit<UseWebSocketOptions, 'linkId'> = {}
) {
  return useWebSocket({
    ...options,
    linkId,
  });
}

export default useWebSocket;
