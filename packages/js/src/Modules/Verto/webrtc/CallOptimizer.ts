import logger from '../util/logger';
import { getUserMedia, streamIsValid } from '../util/webrtc';
import { getMediaConstraints } from './helpers';
import Peer from './Peer';
import { PeerType } from './constants';
import BaseCall from './BaseCall';

/**
 * Performance metrics for call establishment
 */
interface CallMetrics {
  iceGatheringStart: number;
  iceGatheringEnd: number;
  mediaAcquisitionStart: number;
  mediaAcquisitionEnd: number;
  callSetupStart: number;
  callSetupEnd: number;
  totalTime: number;
}

/**
 * Pre-warmed connection that has completed ICE gathering
 */
interface WarmConnection {
  peer: Peer;
  mediaStream: MediaStream;
  createdAt: number;
  isReady: boolean;
}

/**
 * Call optimizer that implements various performance optimizations
 * for faster call establishment without trickle ICE support
 */
export class CallOptimizer {
  private warmConnections: WarmConnection[] = [];
  private sharedMediaStream: MediaStream | null = null;
  private mediaStreamRefCount: number = 0;
  private readonly maxWarmConnections: number = 2;
  private readonly connectionTTL: number = 30000; // 30 seconds
  private readonly poolMaintenanceInterval: number = 5000; // 5 seconds
  private poolMaintenanceTimer: NodeJS.Timeout | null = null;
  
  // Performance tracking
  private metrics: CallMetrics[] = [];
  
  constructor(private session: any) {
    this.startPoolMaintenance();
  }

  /**
   * Get or create an optimized peer connection for faster call setup
   */
  async getOptimizedPeer(options: any): Promise<{ peer: Peer; metrics: Partial<CallMetrics> }> {
    const callMetrics: Partial<CallMetrics> = {
      callSetupStart: performance.now()
    };

    // Try to use a pre-warmed connection first
    const warmConnection = await this.getWarmConnection(options);
    if (warmConnection) {
      logger.debug('CallOptimizer: Using pre-warmed connection');
      callMetrics.callSetupEnd = performance.now();
      callMetrics.totalTime = callMetrics.callSetupEnd - callMetrics.callSetupStart!;
      
      return { peer: warmConnection.peer, metrics: callMetrics };
    }

    // No warm connection available, create a new one
    logger.debug('CallOptimizer: Creating new connection with optimizations');
    const peer = await this.createOptimizedPeer(options, callMetrics);
    
    callMetrics.callSetupEnd = performance.now();
    callMetrics.totalTime = callMetrics.callSetupEnd - callMetrics.callSetupStart!;
    
    return { peer, metrics: callMetrics };
  }

  /**
   * Get a shared media stream to avoid repeated getUserMedia calls
   */
  async getSharedMediaStream(options: any): Promise<MediaStream> {
    if (streamIsValid(this.sharedMediaStream)) {
      this.mediaStreamRefCount++;
      logger.debug(`CallOptimizer: Reusing shared media stream (refs: ${this.mediaStreamRefCount})`);
      return this.sharedMediaStream!;
    }

    logger.debug('CallOptimizer: Creating new shared media stream');
    const constraints = await getMediaConstraints(options);
    this.sharedMediaStream = await getUserMedia(constraints);
    this.mediaStreamRefCount = 1;
    
    return this.sharedMediaStream;
  }

  /**
   * Release a reference to the shared media stream
   */
  releaseSharedMediaStream(): void {
    this.mediaStreamRefCount = Math.max(0, this.mediaStreamRefCount - 1);
    
    if (this.mediaStreamRefCount === 0 && this.sharedMediaStream) {
      logger.debug('CallOptimizer: Releasing shared media stream');
      this.sharedMediaStream.getTracks().forEach(track => track.stop());
      this.sharedMediaStream = null;
    }
  }

  /**
   * Pre-warm connections by creating peer connections with completed ICE gathering
   */
  private async preWarmConnection(options: any): Promise<WarmConnection | null> {
    try {
      const startTime = performance.now();
      logger.debug('CallOptimizer: Pre-warming connection...');

      // Create optimized configuration for faster ICE gathering
      const optimizedOptions = this.getOptimizedOptions(options);
      
      // Get media stream (reuse if possible)
      const mediaStream = await this.getSharedMediaStream(optimizedOptions);
      optimizedOptions.localStream = mediaStream;

      // Create peer with optimized settings
      const peer = new Peer(PeerType.Offer, optimizedOptions, this.session);
      
      // Wait for ICE gathering to complete
      await this.waitForIceGathering(peer);
      
      const warmConnection: WarmConnection = {
        peer,
        mediaStream,
        createdAt: Date.now(),
        isReady: true
      };

      const endTime = performance.now();
      logger.debug(`CallOptimizer: Pre-warmed connection ready in ${endTime - startTime}ms`);
      
      return warmConnection;
    } catch (error) {
      logger.error('CallOptimizer: Failed to pre-warm connection:', error);
      return null;
    }
  }

  /**
   * Get optimized options for faster connection establishment
   */
  private getOptimizedOptions(baseOptions: any): any {
    return {
      ...baseOptions,
      // Enable ICE candidate prefetching
      prefetchIceCandidates: true,
      // Optimize ICE gathering timeout
      iceGatheringTimeout: 2000, // Reduced from default
      // Use minimal ICE servers for faster gathering
      iceServers: this.getOptimizedIceServers(baseOptions.iceServers),
      // Optimize bundle policy
      bundlePolicy: 'balanced'
    };
  }

  /**
   * Get optimized ICE servers configuration
   */
  private getOptimizedIceServers(originalServers?: RTCIceServer[]): RTCIceServer[] {
    // If no servers provided, use optimized defaults
    if (!originalServers || originalServers.length === 0) {
      return [
        { urls: 'stun:stun.telnyx.com:3478' }
      ];
    }

    // Filter to only include STUN servers for faster gathering
    // TURN servers can be added back if connectivity issues occur
    return originalServers.filter(server => 
      server.urls.toString().includes('stun:')
    );
  }

  /**
   * Wait for ICE gathering to complete on a peer connection
   */
  private waitForIceGathering(peer: Peer): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ICE gathering timeout'));
      }, 5000);

      const checkIceGathering = () => {
        if (peer.instance.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        } else {
          // Check again in 100ms
          setTimeout(checkIceGathering, 100);
        }
      };

      // Start checking
      checkIceGathering();

      // Also listen for the event
      peer.instance.addEventListener('icegatheringstatechange', () => {
        if (peer.instance.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  /**
   * Create an optimized peer connection
   */
  private async createOptimizedPeer(options: any, metrics: Partial<CallMetrics>): Promise<Peer> {
    const optimizedOptions = this.getOptimizedOptions(options);
    
    // Track media acquisition time
    metrics.mediaAcquisitionStart = performance.now();
    const mediaStream = await this.getSharedMediaStream(optimizedOptions);
    metrics.mediaAcquisitionEnd = performance.now();
    optimizedOptions.localStream = mediaStream;

    // Track ICE gathering time
    metrics.iceGatheringStart = performance.now();
    const peer = new Peer(PeerType.Offer, optimizedOptions, this.session);
    await this.waitForIceGathering(peer);
    metrics.iceGatheringEnd = performance.now();

    return peer;
  }

  /**
   * Get a warm connection if available
   */
  private async getWarmConnection(options: any): Promise<WarmConnection | null> {
    // Find a ready warm connection
    const warmConnection = this.warmConnections.find(conn => 
      conn.isReady && !this.isConnectionExpired(conn)
    );

    if (warmConnection) {
      // Remove from pool since we're using it
      this.warmConnections = this.warmConnections.filter(conn => conn !== warmConnection);
      
      // Start maintaining the pool again
      this.maintainPool(options);
      
      return warmConnection;
    }

    return null;
  }

  /**
   * Check if a connection has expired
   */
  private isConnectionExpired(connection: WarmConnection): boolean {
    return Date.now() - connection.createdAt > this.connectionTTL;
  }

  /**
   * Maintain the pool of warm connections
   */
  private async maintainPool(options?: any): Promise<void> {
    if (!options) return;

    // Remove expired connections
    const expiredConnections = this.warmConnections.filter(conn => 
      this.isConnectionExpired(conn)
    );
    
    expiredConnections.forEach(conn => {
      logger.debug('CallOptimizer: Removing expired connection');
      conn.peer.instance.close();
      this.releaseSharedMediaStream();
    });

    this.warmConnections = this.warmConnections.filter(conn => 
      !this.isConnectionExpired(conn)
    );

    // Add new connections if needed
    const connectionsNeeded = this.maxWarmConnections - this.warmConnections.length;
    
    if (connectionsNeeded > 0) {
      logger.debug(`CallOptimizer: Creating ${connectionsNeeded} warm connections`);
      
      const newConnections = await Promise.allSettled(
        Array(connectionsNeeded).fill(null).map(() => this.preWarmConnection(options))
      );

      newConnections.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          this.warmConnections.push(result.value);
        }
      });
    }
  }

  /**
   * Start the pool maintenance timer
   */
  private startPoolMaintenance(): void {
    if (this.poolMaintenanceTimer) return;

    this.poolMaintenanceTimer = setInterval(() => {
      // Clean up expired connections
      const expiredConnections = this.warmConnections.filter(conn => 
        this.isConnectionExpired(conn)
      );
      
      if (expiredConnections.length > 0) {
        logger.debug(`CallOptimizer: Cleaning up ${expiredConnections.length} expired connections`);
        expiredConnections.forEach(conn => {
          conn.peer.instance.close();
          this.releaseSharedMediaStream();
        });

        this.warmConnections = this.warmConnections.filter(conn => 
          !this.isConnectionExpired(conn)
        );
      }
    }, this.poolMaintenanceInterval);
  }

  /**
   * Initialize the connection pool with specific options
   */
  async initializePool(options: any): Promise<void> {
    logger.debug('CallOptimizer: Initializing connection pool');
    await this.maintainPool(options);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): CallMetrics[] {
    return [...this.metrics];
  }

  /**
   * Add performance metrics
   */
  addMetrics(metrics: Partial<CallMetrics>): void {
    if (metrics.callSetupStart && metrics.callSetupEnd) {
      this.metrics.push(metrics as CallMetrics);
      
      // Keep only the last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    logger.debug('CallOptimizer: Destroying optimizer');
    
    if (this.poolMaintenanceTimer) {
      clearInterval(this.poolMaintenanceTimer);
      this.poolMaintenanceTimer = null;
    }

    // Close all warm connections
    this.warmConnections.forEach(conn => {
      conn.peer.instance.close();
    });
    this.warmConnections = [];

    // Release shared media stream
    if (this.sharedMediaStream) {
      this.sharedMediaStream.getTracks().forEach(track => track.stop());
      this.sharedMediaStream = null;
    }

    this.mediaStreamRefCount = 0;
  }
}

export default CallOptimizer;