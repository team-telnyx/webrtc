import BaseSession from '../BaseSession';
import { ErrorHandler } from '../util/ErrorHandler';
import { TelnyxError } from '../util/TelnyxError';
import { SwEvent } from '../util/constants';
import { trigger } from './Handler';
import logger from '../util/logger';

/**
 * Enhanced connection manager with intelligent reconnection and error recovery
 */
export class ConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectBackoffMultiplier = 1.5;
  private baseReconnectDelay = 1000;
  private lastConnectedAt?: Date;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed' = 'disconnected';
  private reconnectTimer?: NodeJS.Timeout;
  private networkListener?: () => void;

  constructor(private session: BaseSession) {
    this.setupNetworkListener();
  }

  /**
   * Get current connection state
   */
  get state(): string {
    return this.connectionState;
  }

  /**
   * Get reconnection status
   */
  get reconnectionInfo() {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      nextRetryIn: this.getNextRetryDelay(),
      lastConnectedAt: this.lastConnectedAt
    };
  }

  /**
   * Handle successful connection
   */
  onConnected(): void {
    this.connectionState = 'connected';
    this.lastConnectedAt = new Date();
    this.reconnectAttempts = 0; // Reset on successful connection
    
    this.clearReconnectTimer();
    this.notifyConnectionState('connected');
    
    logger.info('Connection established successfully');
  }

  /**
   * Handle connection error with intelligent recovery
   */
  async handleConnectionError(error: Error): Promise<void> {
    const connectionError = ErrorHandler.handleConnectionError(
      error,
      'ConnectionManager.handleConnectionError',
      {
        reconnectAttempts: this.reconnectAttempts,
        lastConnectedAt: this.lastConnectedAt?.toISOString(),
        networkState: typeof navigator !== 'undefined' ? navigator.onLine : true,
        connectionState: this.connectionState
      }
    );

    this.connectionState = 'disconnected';
    
    // Notify immediately about disconnection
    this.notifyConnectionState('disconnected', connectionError);
    
    // Start reconnection process
    await this.startReconnectionProcess();
  }

  /**
   * Handle connection close
   */
  onConnectionClosed(wasExpected = false): void {
    this.connectionState = 'disconnected';
    this.clearReconnectTimer();
    
    if (!wasExpected && (this.session as any)._autoReconnect) {
      logger.info('Unexpected disconnection, starting reconnection process');
      this.startReconnectionProcess();
    } else {
      this.notifyConnectionState('disconnected');
    }
  }

  /**
   * Start the intelligent reconnection process
   */
  private async startReconnectionProcess(): Promise<void> {
    // Check if we've exceeded max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState = 'failed';
      const error = new TelnyxError(
        'Maximum reconnection attempts exceeded',
        'RECONNECTION_FAILED',
        'ConnectionManager',
        undefined,
        {
          attempts: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts
        },
        false,
        'Unable to reconnect. Please refresh the page.',
        'Check your internet connection and refresh the page to reconnect.'
      );
      
      this.notifyConnectionState('failed', error);
      return;
    }

    // Check network connectivity before attempting
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.info('Network offline, waiting for connectivity');
      this.waitForNetworkConnectivity();
      return;
    }

    // Schedule reconnection attempt
    this.scheduleReconnectionAttempt();
  }

  /**
   * Schedule the next reconnection attempt with exponential backoff
   */
  private scheduleReconnectionAttempt(): void {
    const delay = this.getNextRetryDelay();
    this.reconnectAttempts++;
    
    logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      await this.attemptReconnection();
    }, delay);
  }

  /**
   * Calculate next retry delay using exponential backoff
   */
  private getNextRetryDelay(): number {
    return Math.min(
      this.baseReconnectDelay * Math.pow(this.reconnectBackoffMultiplier, this.reconnectAttempts),
      30000 // Max 30 seconds
    );
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnection(): Promise<void> {
    if (this.connectionState === 'connecting') {
      return; // Already attempting
    }

    this.connectionState = 'connecting';
    this.notifyConnectionState('connecting');
    
    try {
      logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      await this.session.connect();
      
      // Connection successful
      this.onConnected();
    } catch (error) {
      logger.warn(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      const reconnectionError = ErrorHandler.handleConnectionError(
        error as Error,
        'ConnectionManager.attemptReconnection',
        {
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts
        }
      );

      this.connectionState = 'disconnected';
      
      // Continue with next attempt
      await this.startReconnectionProcess();
    }
  }

  /**
   * Wait for network connectivity to be restored
   */
  private waitForNetworkConnectivity(): void {
    if (this.networkListener) {
      return; // Already listening
    }

    this.networkListener = () => {
      logger.info('Network connectivity restored, attempting reconnection');
      this.removeNetworkListener();
      this.startReconnectionProcess();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.networkListener, { once: true });
    }
  }

  /**
   * Setup network connectivity monitoring
   */
  private setupNetworkListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        logger.warn('Network connectivity lost');
        this.notifyConnectionState('disconnected', new TelnyxError(
          'Network connectivity lost',
          'NETWORK_OFFLINE',
          'ConnectionManager',
          undefined,
          undefined,
          true,
          'Network connection lost',
          'Please check your internet connection'
        ));
      });
    }
  }

  /**
   * Remove network listener
   */
  private removeNetworkListener(): void {
    if (this.networkListener && typeof window !== 'undefined') {
      window.removeEventListener('online', this.networkListener);
      this.networkListener = undefined;
    }
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Notify about connection state changes
   */
  private notifyConnectionState(state: string, error?: TelnyxError): void {
    const notification = {
      type: 'connectionStateChange',
      state,
      error: error?.toObject(),
      reconnectionInfo: this.reconnectionInfo
    };

    trigger(SwEvent.Notification, notification, this.session.uuid);
    
    // Also trigger specific connection events for backward compatibility
    switch (state) {
      case 'connected':
        trigger(SwEvent.Ready, {}, this.session.uuid);
        break;
      case 'disconnected':
      case 'failed':
        if (error) {
          trigger(SwEvent.Error, error.toObject(), this.session.uuid);
        }
        break;
    }
  }

  /**
   * Force immediate reconnection attempt
   */
  async forceReconnect(): Promise<void> {
    this.clearReconnectTimer();
    this.reconnectAttempts = 0; // Reset attempts for manual reconnection
    await this.startReconnectionProcess();
  }

  /**
   * Stop all reconnection attempts
   */
  stopReconnection(): void {
    this.clearReconnectTimer();
    this.removeNetworkListener();
    this.connectionState = 'disconnected';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopReconnection();
  }
}
