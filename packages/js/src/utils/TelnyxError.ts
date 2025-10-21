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