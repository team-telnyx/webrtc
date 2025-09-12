import logger from './logger';
import { TelnyxError } from './TelnyxError';

/**
 * Error monitoring and analytics for tracking error patterns
 */
export class ErrorMonitoring {
  private static errorCounts: Map<string, number> = new Map();
  private static errorHistory: Array<{ error: TelnyxError; timestamp: string }> = [];
  private static readonly MAX_HISTORY_SIZE = 100;
  
  private static readonly errorThresholds = {
    'MEDIA_ERROR': 3,
    'CONNECTION_ERROR': 5,
    'CALL_ERROR': 10,
    'AUTH_ERROR': 2
  };

  /**
   * Track an error occurrence and check for patterns
   */
  static trackError(error: TelnyxError): void {
    const key = `${error.code}_${error.context}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // Add to history
    this.errorHistory.push({
      error,
      timestamp: error.timestamp
    });

    // Maintain history size
    if (this.errorHistory.length > this.MAX_HISTORY_SIZE) {
      this.errorHistory.shift();
    }

    // Check if we've hit a threshold
    const threshold = this.errorThresholds[error.code];
    if (threshold && count >= threshold) {
      this.reportHighErrorRate(error.code, count, error.context);
    }

    // Send to analytics if configured
    this.sendToAnalytics(error);
  }

  /**
   * Report high error rates for monitoring
   */
  private static reportHighErrorRate(errorCode: string, count: number, context: string): void {
    logger.warn(`High error rate detected: ${errorCode} in ${context} occurred ${count} times`);
    
    // Could trigger special handling, user notification, or alert systems
    // Example: Switch to fallback services, show maintenance message, etc.
  }

  /**
   * Send error data to analytics service
   */
  private static sendToAnalytics(error: TelnyxError): void {
    // This would integrate with your analytics service
    // Examples: Sentry, Datadog, Google Analytics, custom service
    
    if (typeof window !== 'undefined' && (window as any).analytics) {
      try {
        (window as any).analytics.track('WebRTC Error', {
          errorCode: error.code,
          context: error.context,
          message: error.message,
          canRetry: error.canRetry,
          timestamp: error.timestamp,
          metadata: error.metadata
        });
      } catch (e) {
        // Silently fail analytics to avoid cascading errors
        logger.debug('Analytics tracking failed:', e);
      }
    }
  }

  /**
   * Get error statistics for debugging
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByCode: Map<string, number>;
    recentErrors: Array<{ error: TelnyxError; timestamp: string }>;
  } {
    return {
      totalErrors: this.errorHistory.length,
      errorsByCode: new Map(this.errorCounts),
      recentErrors: [...this.errorHistory].slice(-10) // Last 10 errors
    };
  }

  /**
   * Clear error tracking data
   */
  static clearStats(): void {
    this.errorCounts.clear();
    this.errorHistory = [];
  }

  /**
   * Check if error rate is above threshold for a specific error type
   */
  static isErrorRateHigh(errorCode: string): boolean {
    const threshold = this.errorThresholds[errorCode];
    if (!threshold) return false;

    const count = this.errorCounts.get(errorCode) || 0;
    return count >= threshold;
  }
}

/**
 * Centralized error handler for consistent error processing
 */
export class ErrorHandler {
  private static sessionId?: string;
  private static userId?: string;
  private static reportingCallback?: (error: TelnyxError) => void;

  /**
   * Initialize error handler with session context
   */
  static initialize(sessionId?: string, userId?: string, reportingCallback?: (error: TelnyxError) => void): void {
    this.sessionId = sessionId;
    this.userId = userId;
    this.reportingCallback = reportingCallback;
  }

  /**
   * Handle any error with enhanced context and tracking
   */
  static handleError(
    context: string,
    error: Error | TelnyxError,
    additionalData?: any
  ): TelnyxError {
    let telnyxError: TelnyxError;

    if (error instanceof TelnyxError) {
      telnyxError = error;
    } else {
      // Convert regular Error to TelnyxError
      telnyxError = new TelnyxError(
        error.message,
        'UNKNOWN_ERROR',
        context,
        error,
        additionalData
      );
    }

    // Add session context
    if (telnyxError.metadata) {
      telnyxError.metadata.sessionId = this.sessionId;
      telnyxError.metadata.userId = this.userId;
      telnyxError.metadata.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      telnyxError.metadata.networkState = typeof navigator !== 'undefined' ? navigator.onLine : null;
    }

    // Log the error
    logger.error(`${context}:`, telnyxError.toObject());

    // Track for monitoring
    ErrorMonitoring.trackError(telnyxError);

    // Report to callback if configured
    if (this.reportingCallback) {
      try {
        this.reportingCallback(telnyxError);
      } catch (e) {
        logger.debug('Error reporting callback failed:', e);
      }
    }

    return telnyxError;
  }

  /**
   * Handle media errors specifically
   */
  static handleMediaError(
    originalError: Error,
    context: string,
    additionalData?: any
  ): TelnyxError {
    const telnyxError = TelnyxError.mediaError(originalError, context, {
      ...additionalData,
      sessionId: this.sessionId,
      userId: this.userId
    });

    return this.handleError(context, telnyxError);
  }

  /**
   * Handle connection errors specifically
   */
  static handleConnectionError(
    originalError: Error,
    context: string,
    additionalData?: any
  ): TelnyxError {
    const telnyxError = TelnyxError.connectionError(originalError, context, {
      ...additionalData,
      sessionId: this.sessionId,
      userId: this.userId
    });

    return this.handleError(context, telnyxError);
  }

  /**
   * Handle call errors specifically
   */
  static handleCallError(
    cause: string,
    sipCode?: number,
    sipReason?: string,
    context = 'Call',
    additionalData?: any
  ): TelnyxError {
    const telnyxError = TelnyxError.callError(cause, sipCode, sipReason, context, {
      ...additionalData,
      sessionId: this.sessionId,
      userId: this.userId
    });

    return this.handleError(context, telnyxError);
  }

  /**
   * Handle authentication errors specifically
   */
  static handleAuthError(
    originalError: Error,
    context: string,
    additionalData?: any
  ): TelnyxError {
    const telnyxError = TelnyxError.authError(originalError, context, {
      ...additionalData,
      sessionId: this.sessionId,
      userId: this.userId
    });

    return this.handleError(context, telnyxError);
  }

  /**
   * Get current error statistics
   */
  static getStats() {
    return ErrorMonitoring.getErrorStats();
  }
}
