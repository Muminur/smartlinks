import { io, Socket } from 'socket.io-client';
import { STORAGE_KEYS } from './constants';

/**
 * WebSocket URL - defaults to API URL without /api path
 */
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');

/**
 * Real-time click event from WebSocket
 */
export interface RealtimeClickEvent {
  id: string;
  linkId: string;
  slug: string;
  timestamp: string;
  country: string;
  countryCode: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  referrerType: 'direct' | 'search' | 'social' | 'email' | 'other';
}

/**
 * Stats update event from WebSocket
 */
export interface StatsUpdateEvent {
  linkId: string;
  totalClicks: number;
  clicksToday: number;
  uniqueVisitors: number;
  timestamp: string;
}

/**
 * Connection state events
 */
export interface ConnectionState {
  connected: boolean;
  authenticated: boolean;
  socketId: string | null;
  error: string | null;
}

/**
 * WebSocket event handlers interface
 */
export interface WebSocketEventHandlers {
  onConnect?: (state: ConnectionState) => void;
  onDisconnect?: (reason: string) => void;
  onNewClick?: (click: RealtimeClickEvent) => void;
  onGlobalClick?: (click: RealtimeClickEvent) => void;
  onStatsUpdate?: (stats: StatsUpdateEvent) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
}

/**
 * WebSocket Client Service
 *
 * Manages Socket.io connection for real-time analytics updates
 * Features:
 * - JWT-based authentication
 * - Automatic reconnection
 * - Room-based subscriptions (per-link, user analytics)
 * - Connection state management
 */
class WebSocketClient {
  private socket: Socket | null = null;
  private handlers: WebSocketEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribedLinks: Set<string> = new Set();
  private connectionState: ConnectionState = {
    connected: false,
    authenticated: false,
    socketId: null,
    error: null,
  };

  /**
   * Initialize WebSocket connection
   * @param handlers - Event handlers for WebSocket events
   */
  public connect(handlers: WebSocketEventHandlers = {}): void {
    this.handlers = handlers;

    // Prevent duplicate connections
    if (this.socket?.connected) {
      console.debug('[WebSocket] Already connected');
      return;
    }

    // Get auth token from localStorage
    const token = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
      : null;

    // Create socket connection
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventListeners();
    console.debug('[WebSocket] Connecting to:', WS_URL);
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connected', (data: { socketId: string; authenticated: boolean }) => {
      this.connectionState = {
        connected: true,
        authenticated: data.authenticated,
        socketId: data.socketId,
        error: null,
      };
      this.reconnectAttempts = 0;

      console.debug('[WebSocket] Connected:', data);
      this.handlers.onConnect?.(this.connectionState);

      // Re-subscribe to previously subscribed links
      this.subscribedLinks.forEach((linkId) => {
        this.subscribeToLink(linkId);
      });
    });

    // Connection event (socket.io built-in)
    this.socket.on('connect', () => {
      console.debug('[WebSocket] Socket connected');
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      this.connectionState = {
        ...this.connectionState,
        connected: false,
        socketId: null,
      };
      console.debug('[WebSocket] Disconnected:', reason);
      this.handlers.onDisconnect?.(reason);
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attempt: number) => {
      this.reconnectAttempts = attempt;
      console.debug('[WebSocket] Reconnecting, attempt:', attempt);
      this.handlers.onReconnecting?.(attempt);
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      this.connectionState.error = 'Failed to reconnect after multiple attempts';
      console.error('[WebSocket] Reconnection failed');
      this.handlers.onError?.(new Error('WebSocket reconnection failed'));
    });

    // New click event (for subscribed links)
    this.socket.on('newClick', (click: RealtimeClickEvent) => {
      console.debug('[WebSocket] New click:', click);
      this.handlers.onNewClick?.(click);
    });

    // Global click event (for admin/global analytics)
    this.socket.on('globalClick', (click: RealtimeClickEvent) => {
      console.debug('[WebSocket] Global click:', click);
      this.handlers.onGlobalClick?.(click);
    });

    // Stats update event
    this.socket.on('statsUpdate', (stats: StatsUpdateEvent) => {
      console.debug('[WebSocket] Stats update:', stats);
      this.handlers.onStatsUpdate?.(stats);
    });

    // Subscription confirmation
    this.socket.on('subscribed', (data: { linkId: string; roomName: string }) => {
      console.debug('[WebSocket] Subscribed to:', data);
    });

    // Error event
    this.socket.on('error', (error: { message: string }) => {
      console.error('[WebSocket] Error:', error);
      this.connectionState.error = error.message;
      this.handlers.onError?.(new Error(error.message));
    });

    // Server shutdown notification
    this.socket.on('serverShutdown', (data: { message: string }) => {
      console.warn('[WebSocket] Server shutting down:', data.message);
      this.connectionState.error = 'Server is shutting down';
    });

    // Pong response for connection health check
    this.socket.on('pong', (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      console.debug('[WebSocket] Pong received, latency:', latency, 'ms');
    });
  }

  /**
   * Subscribe to real-time updates for a specific link
   * @param linkId - Link ID to subscribe to
   */
  public subscribeToLink(linkId: string): void {
    if (!this.socket?.connected) {
      // Store for later subscription when connected
      this.subscribedLinks.add(linkId);
      console.debug('[WebSocket] Link queued for subscription:', linkId);
      return;
    }

    this.subscribedLinks.add(linkId);
    this.socket.emit('subscribe:link', linkId);
    console.debug('[WebSocket] Subscribed to link:', linkId);
  }

  /**
   * Unsubscribe from real-time updates for a specific link
   * @param linkId - Link ID to unsubscribe from
   */
  public unsubscribeFromLink(linkId: string): void {
    this.subscribedLinks.delete(linkId);

    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe:link', linkId);
    console.debug('[WebSocket] Unsubscribed from link:', linkId);
  }

  /**
   * Subscribe to all user's link analytics
   */
  public subscribeToUserAnalytics(): void {
    if (!this.socket?.connected) {
      console.debug('[WebSocket] Cannot subscribe to user analytics - not connected');
      return;
    }

    this.socket.emit('subscribe:user-analytics');
    console.debug('[WebSocket] Subscribed to user analytics');
  }

  /**
   * Send ping for connection health check
   */
  public ping(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('ping');
  }

  /**
   * Update event handlers
   * @param handlers - New event handlers
   */
  public updateHandlers(handlers: Partial<WebSocketEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get current connection state
   * @returns Current connection state
   */
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connected
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Check if authenticated
   * @returns True if authenticated
   */
  public isAuthenticated(): boolean {
    return this.connectionState.authenticated;
  }

  /**
   * Get list of subscribed links
   * @returns Array of subscribed link IDs
   */
  public getSubscribedLinks(): string[] {
    return Array.from(this.subscribedLinks);
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = {
        connected: false,
        authenticated: false,
        socketId: null,
        error: null,
      };
      this.subscribedLinks.clear();
      console.debug('[WebSocket] Disconnected');
    }
  }

  /**
   * Reconnect to WebSocket server
   * Useful after token refresh or manual reconnection
   */
  public reconnect(): void {
    this.disconnect();
    this.connect(this.handlers);
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClient();
export default websocketClient;
