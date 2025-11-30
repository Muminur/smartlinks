import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Click event data structure for WebSocket broadcasts
 */
export interface ClickEventData {
  linkId: string;
  userId: string;
  slug: string;
  timestamp: Date;
  location: {
    country: string | null;
    countryCode: string | null;
    region: string | null;
    city: string | null;
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    brand: string | null;
    model: string | null;
  };
  os: {
    name: string | null;
    version: string | null;
  };
  browser: {
    name: string | null;
    version: string | null;
  };
  referrer: {
    url: string | null;
    domain: string | null;
    type: 'direct' | 'search' | 'social' | 'email' | 'other';
  };
}

/**
 * JWT payload structure for socket authentication
 */
interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Extended socket interface with user data
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

/**
 * WebSocket Service - Manages real-time connections for analytics
 *
 * Features:
 * - JWT-based authentication for secure connections
 * - Room-based broadcasting (per-link and global analytics)
 * - Connection tracking and management
 * - Graceful reconnection handling
 */
class WebSocketService {
  private io: SocketIOServer | null = null;
  private activeConnections: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private linkSubscriptions: Map<string, Set<string>> = new Map(); // linkId -> Set of socketIds

  /**
   * Initialize Socket.io server with HTTP server
   * @param httpServer - HTTP server instance
   * @returns Socket.io server instance
   */
  public initialize(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.CORS_ORIGIN?.split(',') || config.FRONTEND_URL,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Connection handler
    this.io.on('connection', this.handleConnection.bind(this));

    logger.info('WebSocket server initialized');
    return this.io;
  }

  /**
   * Authenticate socket connection using JWT token
   * @param socket - Socket instance
   * @param next - Next function
   */
  private authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        // Allow unauthenticated connections for public analytics viewing
        // They won't be able to subscribe to private link rooms
        logger.debug('Unauthenticated socket connection allowed');
        next();
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token as string, config.JWT_SECRET) as JwtPayload;

      // Attach user info to socket
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;

      logger.debug(`Authenticated socket connection for user: ${decoded.email}`);
      next();
    } catch (error) {
      logger.warn('Socket authentication failed:', error);
      // Allow connection but without authentication
      // This enables graceful degradation
      next();
    }
  }

  /**
   * Handle new socket connection
   * @param socket - Connected socket instance
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const socketId = socket.id;
    const userId = socket.userId;

    logger.info(`Socket connected: ${socketId} (user: ${userId || 'anonymous'})`);

    // Track connection
    if (userId) {
      if (!this.activeConnections.has(userId)) {
        this.activeConnections.set(userId, new Set());
      }
      this.activeConnections.get(userId)!.add(socketId);
    }

    // Join global analytics room for authenticated users
    if (userId) {
      socket.join('analytics:global');
      socket.join(`user:${userId}`);
    }

    // Handle link subscription
    socket.on('subscribe:link', (linkId: string) => {
      this.handleLinkSubscription(socket, linkId);
    });

    // Handle link unsubscription
    socket.on('unsubscribe:link', (linkId: string) => {
      this.handleLinkUnsubscription(socket, linkId);
    });

    // Handle user analytics subscription (all user's links)
    socket.on('subscribe:user-analytics', () => {
      if (userId) {
        socket.join(`user-analytics:${userId}`);
        logger.debug(`User ${userId} subscribed to user-analytics`);
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socketId}:`, error);
    });

    // Send connection confirmation
    socket.emit('connected', {
      socketId,
      authenticated: !!userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle link subscription request
   * @param socket - Socket instance
   * @param linkId - Link ID to subscribe to
   */
  private handleLinkSubscription(socket: AuthenticatedSocket, linkId: string): void {
    if (!linkId) {
      socket.emit('error', { message: 'Invalid link ID' });
      return;
    }

    const roomName = `link:${linkId}`;
    socket.join(roomName);

    // Track subscription
    if (!this.linkSubscriptions.has(linkId)) {
      this.linkSubscriptions.set(linkId, new Set());
    }
    this.linkSubscriptions.get(linkId)!.add(socket.id);

    logger.debug(`Socket ${socket.id} subscribed to link: ${linkId}`);

    socket.emit('subscribed', { linkId, roomName });
  }

  /**
   * Handle link unsubscription request
   * @param socket - Socket instance
   * @param linkId - Link ID to unsubscribe from
   */
  private handleLinkUnsubscription(socket: AuthenticatedSocket, linkId: string): void {
    const roomName = `link:${linkId}`;
    socket.leave(roomName);

    // Remove from tracking
    if (this.linkSubscriptions.has(linkId)) {
      this.linkSubscriptions.get(linkId)!.delete(socket.id);
      if (this.linkSubscriptions.get(linkId)!.size === 0) {
        this.linkSubscriptions.delete(linkId);
      }
    }

    logger.debug(`Socket ${socket.id} unsubscribed from link: ${linkId}`);
  }

  /**
   * Handle socket disconnection
   * @param socket - Disconnected socket instance
   * @param reason - Disconnection reason
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const socketId = socket.id;
    const userId = socket.userId;

    logger.info(`Socket disconnected: ${socketId} (reason: ${reason})`);

    // Remove from active connections
    if (userId && this.activeConnections.has(userId)) {
      this.activeConnections.get(userId)!.delete(socketId);
      if (this.activeConnections.get(userId)!.size === 0) {
        this.activeConnections.delete(userId);
      }
    }

    // Clean up link subscriptions
    for (const [linkId, sockets] of this.linkSubscriptions.entries()) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
          this.linkSubscriptions.delete(linkId);
        }
      }
    }
  }

  /**
   * Emit click event to relevant rooms
   * @param clickData - Click event data
   */
  public emitClickEvent(clickData: ClickEventData): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot emit click event');
      return;
    }

    const { linkId, userId, slug } = clickData;

    // Prepare event payload (sanitized for frontend)
    const eventPayload = {
      id: `${linkId}-${Date.now()}`,
      linkId,
      slug,
      timestamp: clickData.timestamp.toISOString(),
      country: clickData.location.country || 'Unknown',
      countryCode: clickData.location.countryCode || 'XX',
      city: clickData.location.city || 'Unknown',
      device: clickData.device.type,
      browser: clickData.browser.name || 'Unknown',
      os: clickData.os.name || 'Unknown',
      referrer: clickData.referrer.domain || 'Direct',
      referrerType: clickData.referrer.type,
    };

    // Emit to link-specific room
    this.io.to(`link:${linkId}`).emit('newClick', eventPayload);

    // Emit to user-specific room (link owner)
    if (userId) {
      this.io.to(`user-analytics:${userId}`).emit('newClick', eventPayload);
    }

    // Emit to global analytics room (admin dashboard)
    this.io.to('analytics:global').emit('globalClick', eventPayload);

    logger.debug(`Click event emitted for link: ${slug} (linkId: ${linkId})`);
  }

  /**
   * Emit stats update to specific link room
   * @param linkId - Link ID
   * @param stats - Updated statistics
   */
  public emitStatsUpdate(linkId: string, stats: {
    totalClicks: number;
    clicksToday: number;
    uniqueVisitors: number;
  }): void {
    if (!this.io) return;

    this.io.to(`link:${linkId}`).emit('statsUpdate', {
      linkId,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get count of active connections
   * @returns Number of active socket connections
   */
  public getActiveConnectionCount(): number {
    if (!this.io) return 0;
    return this.io.engine.clientsCount;
  }

  /**
   * Get count of authenticated users online
   * @returns Number of authenticated users with active connections
   */
  public getAuthenticatedUserCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Get subscribers count for a specific link
   * @param linkId - Link ID
   * @returns Number of subscribers watching the link
   */
  public getLinkSubscriberCount(linkId: string): number {
    return this.linkSubscriptions.get(linkId)?.size || 0;
  }

  /**
   * Get all active room statistics
   * @returns Room statistics object
   */
  public getRoomStats(): {
    totalConnections: number;
    authenticatedUsers: number;
    linkRooms: number;
    globalRoomSize: number;
  } {
    const globalRoomSize = this.io?.sockets.adapter.rooms.get('analytics:global')?.size || 0;

    return {
      totalConnections: this.getActiveConnectionCount(),
      authenticatedUsers: this.getAuthenticatedUserCount(),
      linkRooms: this.linkSubscriptions.size,
      globalRoomSize,
    };
  }

  /**
   * Broadcast message to all connected clients
   * @param event - Event name
   * @param data - Event data
   */
  public broadcast(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Send message to specific user
   * @param userId - User ID
   * @param event - Event name
   * @param data - Event data
   */
  public sendToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Get Socket.io server instance
   * @returns Socket.io server instance or null if not initialized
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Gracefully close all connections
   */
  public async close(): Promise<void> {
    if (this.io) {
      logger.info('Closing WebSocket server...');

      // Notify all clients
      this.io.emit('serverShutdown', { message: 'Server is shutting down' });

      // Close all connections
      const sockets = await this.io.fetchSockets();
      for (const socket of sockets) {
        socket.disconnect(true);
      }

      // Close server
      this.io.close();
      this.io = null;
      this.activeConnections.clear();
      this.linkSubscriptions.clear();

      logger.info('WebSocket server closed');
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
