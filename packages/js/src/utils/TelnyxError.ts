/**
 * Custom error class for Telnyx WebRTC SDK
 * Provides enhanced error information including context and error codes
 */
export class TelnyxError extends Error {
  public readonly code?: string | number;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    options: {
      code?: string | number;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message);
    this.name = 'TelnyxError';
    this.code = options.code;
    this.context = options.context;
    this.timestamp = new Date();

    // Maintains proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TelnyxError);
    }
  }

  /**
   * Convert error to JSON for logging/debugging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Configuration error - when invalid settings are provided
 */
export class TelnyxConfigError extends TelnyxError {
  constructor(message: string, options: { code?: string | number; context?: Record<string, any> } = {}) {
    super(message, options);
    this.name = 'TelnyxConfigError';
  }
}

/**
 * Validation error - when required parameters are missing or invalid
 */
export class TelnyxValidationError extends TelnyxError {
  constructor(message: string, options: { code?: string | number; context?: Record<string, any> } = {}) {
    super(message, options);
    this.name = 'TelnyxValidationError';
  }
}

/**
 * Device error - when media devices are not accessible or invalid
 */
export class TelnyxDeviceError extends TelnyxError {
  constructor(message: string, options: { code?: string | number; context?: Record<string, any> } = {}) {
    super(message, options);
    this.name = 'TelnyxDeviceError';
  }
}

/**
 * Network error - when network operations fail
 */
export class TelnyxNetworkError extends TelnyxError {
  constructor(message: string, options: { code?: string | number; context?: Record<string, any> } = {}) {
    super(message, options);
    this.name = 'TelnyxNetworkError';
  }
}

/**
 * Call error - when call operations fail
 */
export class TelnyxCallError extends TelnyxError {
  constructor(message: string, options: { code?: string | number; context?: Record<string, any> } = {}) {
    super(message, options);
    this.name = 'TelnyxCallError';
  }
}

/**
 * SIP protocol error - when SIP operations fail with specific codes
 */
export class TelnyxSipError extends TelnyxError {
  public readonly sipCode?: number;
  public readonly sipReason?: string;
  public readonly cause?: string;
  public readonly causeCode?: number;

  constructor(
    message: string,
    options: {
      code?: string | number;
      sipCode?: number;
      sipReason?: string;
      cause?: string;
      causeCode?: number;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message, options);
    this.name = 'TelnyxSipError';
    this.sipCode = options.sipCode;
    this.sipReason = options.sipReason;
    this.cause = options.cause;
    this.causeCode = options.causeCode;
  }

  /**
   * Get user-friendly error message based on SIP code
   */
  getUserMessage(): string {
    if (this.sipCode) {
      switch (this.sipCode) {
        case 400:
          return 'Invalid request. Please check your call parameters.';
        case 401:
          return 'Authentication required. Please check your credentials.';
        case 403:
          return 'Call not allowed. Please check your account permissions.';
        case 404:
          return 'Number not found. Please check the phone number.';
        case 408:
          return 'Request timeout. Please try again.';
        case 480:
          return 'The person you are calling is temporarily unavailable.';
        case 486:
          return 'The person you are calling is busy.';
        case 487:
          return 'Call was cancelled.';
        case 488:
          return 'Media type not supported by remote party.';
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        case 604:
          return 'Number does not exist anywhere.';
        default:
          return `Call failed: ${this.sipReason || 'Unknown SIP error'} (${this.sipCode})`;
      }
    }

    if (this.cause) {
      switch (this.cause) {
        case 'USER_BUSY':
          return 'The person you are calling is busy.';
        case 'CALL_REJECTED':
          return 'Call was declined by the remote party.';
        case 'NO_ANSWER':
          return 'No answer. Please try again later.';
        case 'UNALLOCATED_NUMBER':
          return 'Invalid phone number.';
        case 'NORMAL_CLEARING':
          return 'Call ended normally.';
        case 'PURGE':
          return 'Call was terminated by the system.';
        default:
          return `Call ended: ${this.cause}`;
      }
    }

    return this.message;
  }

  /**
   * Convert to JSON with SIP-specific information
   */
  toJSON() {
    return {
      ...super.toJSON(),
      sipCode: this.sipCode,
      sipReason: this.sipReason,
      cause: this.cause,
      causeCode: this.causeCode,
      userMessage: this.getUserMessage(),
    };
  }
}

/**
 * WebSocket error - when WebSocket connection fails
 */
export class TelnyxWebSocketError extends TelnyxError {
  public readonly wsCode?: number;
  public readonly wsReason?: string;
  public readonly wsReadyState?: number;

  constructor(
    message: string,
    options: {
      code?: string | number;
      wsCode?: number;
      wsReason?: string;
      wsReadyState?: number;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message, options);
    this.name = 'TelnyxWebSocketError';
    this.wsCode = options.wsCode;
    this.wsReason = options.wsReason;
    this.wsReadyState = options.wsReadyState;
  }

  /**
   * Get user-friendly error message based on WebSocket close code
   */
  getUserMessage(): string {
    if (this.wsCode) {
      switch (this.wsCode) {
        case 1000:
          return 'Connection closed normally.';
        case 1001:
          return 'Connection lost due to server shutdown.';
        case 1002:
          return 'Connection closed due to protocol error.';
        case 1003:
          return 'Connection closed due to unsupported data type.';
        case 1006:
          return 'Connection lost unexpectedly. Please check your internet connection.';
        case 1007:
          return 'Connection closed due to invalid data format.';
        case 1008:
          return 'Connection closed due to policy violation.';
        case 1009:
          return 'Connection closed because message was too large.';
        case 1011:
          return 'Server error occurred. Please try again.';
        case 1012:
          return 'Server is restarting. Please try again in a moment.';
        case 1013:
          return 'Server is temporarily overloaded. Please try again later.';
        case 1014:
          return 'Bad gateway. Please try again.';
        case 1015:
          return 'TLS handshake failure.';
        default:
          return `Connection error (${this.wsCode}): ${this.wsReason || 'Unknown WebSocket error'}`;
      }
    }
    
    return this.message || 'WebSocket connection error occurred.';
  }

  /**
   * Determine if this WebSocket error is recoverable
   */
  isRecoverable(): boolean {
    if (!this.wsCode) return true; // Unknown errors might be recoverable
    
    // Recoverable WebSocket close codes
    const recoverableCodes = [
      1001, // Going away
      1006, // Abnormal closure
      1011, // Server error
      1012, // Service restart
      1013, // Try again later
      1014, // Bad gateway
    ];
    
    return recoverableCodes.includes(this.wsCode);
  }

  /**
   * Convert to JSON with WebSocket-specific information
   */
  toJSON() {
    return {
      ...super.toJSON(),
      wsCode: this.wsCode,
      wsReason: this.wsReason,
      wsReadyState: this.wsReadyState,
      userMessage: this.getUserMessage(),
      recoverable: this.isRecoverable(),
    };
  }
}