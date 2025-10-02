/**
 * Enhanced error class for Telnyx WebRTC SDK with better context and tracing
 */
export class TelnyxError extends Error {
  public readonly code: string;
  public readonly context: string;
  public readonly originalError?: Error;
  public readonly metadata?: any;
  public readonly timestamp: string;
  public readonly canRetry: boolean;
  public readonly userMessage?: string;
  public readonly suggestedAction?: string;

  constructor(
    message: string,
    code: string,
    context: string,
    originalError?: Error,
    metadata?: any,
    canRetry = false,
    userMessage?: string,
    suggestedAction?: string
  ) {
    super(message);
    this.name = 'TelnyxError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    this.canRetry = canRetry;
    this.userMessage = userMessage;
    this.suggestedAction = suggestedAction;

    // Preserve original stack trace if available
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  /**
   * Create a TelnyxError for media access issues
   */
  static mediaError(
    originalError: Error,
    context: string,
    metadata?: any
  ): TelnyxError {
    let userMessage = 'Cannot access media devices';
    let suggestedAction = 'Please check your browser permissions';

    if (originalError.name === 'NotAllowedError') {
      userMessage = 'Media access denied';
      suggestedAction = 'Please allow access to your microphone and camera in browser settings';
    } else if (originalError.name === 'NotFoundError') {
      userMessage = 'No media devices found';
      suggestedAction = 'Please ensure your microphone and camera are connected and enabled';
    } else if (originalError.name === 'NotReadableError') {
      userMessage = 'Media devices are in use';
      suggestedAction = 'Please close other applications using your microphone or camera';
    } else if (originalError.name === 'OverconstrainedError') {
      userMessage = 'Media device constraints not supported';
      suggestedAction = 'Try using different audio/video settings';
    }

    return new TelnyxError(
      `Media error: ${originalError.message}`,
      'MEDIA_ERROR',
      context,
      originalError,
      metadata,
      true,
      userMessage,
      suggestedAction
    );
  }

  /**
   * Create a TelnyxError for connection issues
   */
  static connectionError(
    originalError: Error,
    context: string,
    metadata?: any
  ): TelnyxError {
    return new TelnyxError(
      `Connection error: ${originalError.message}`,
      'CONNECTION_ERROR',
      context,
      originalError,
      metadata,
      true,
      'Connection lost. Please check your internet connection.',
      'The connection will be restored automatically when your network is available.'
    );
  }

  /**
   * Create a TelnyxError for call failures
   */
  static callError(
    cause: string,
    sipCode?: number,
    sipReason?: string,
    context = 'Call',
    metadata?: any
  ): TelnyxError {
    let userMessage = 'Call failed';
    let suggestedAction = 'Please try your call again';
    let canRetry = false;

    switch (cause) {
      case 'USER_BUSY':
        userMessage = 'The person you are calling is busy';
        suggestedAction = 'Try calling again in a few minutes';
        canRetry = true;
        break;
      case 'CALL_REJECTED':
        userMessage = 'Call was declined';
        suggestedAction = 'The call was rejected by the recipient';
        canRetry = true;
        break;
      case 'NO_ANSWER':
        userMessage = 'No answer';
        suggestedAction = 'The call was not answered. You can try again later';
        canRetry = true;
        break;
      case 'UNALLOCATED_NUMBER':
        userMessage = 'Invalid phone number';
        suggestedAction = 'Please check the phone number and try again';
        canRetry = false;
        break;
      case 'NETWORK_ERROR':
        userMessage = 'Network error during call';
        suggestedAction = 'Please check your internet connection and try again';
        canRetry = true;
        break;
    }

    // Override with SIP-specific messages if available
    if (sipCode) {
      switch (sipCode) {
        case 403:
          userMessage = 'Call not allowed';
          suggestedAction = 'Please check your account permissions';
          canRetry = false;
          break;
        case 404:
          userMessage = 'Number not found';
          suggestedAction = 'Please check the phone number';
          canRetry = false;
          break;
        case 486:
          userMessage = 'User is busy';
          suggestedAction = 'Try calling again later';
          canRetry = true;
          break;
        case 503:
          userMessage = 'Service temporarily unavailable';
          suggestedAction = 'Please try again in a few minutes';
          canRetry = true;
          break;
      }
    }

    return new TelnyxError(
      `Call failed: ${cause}${sipCode ? ` (SIP ${sipCode})` : ''}`,
      'CALL_ERROR',
      context,
      undefined,
      { cause, sipCode, sipReason, ...metadata },
      canRetry,
      userMessage,
      suggestedAction
    );
  }

  /**
   * Create a TelnyxError for authentication issues
   */
  static authError(
    originalError: Error,
    context: string,
    metadata?: any
  ): TelnyxError {
    return new TelnyxError(
      `Authentication error: ${originalError.message}`,
      'AUTH_ERROR',
      context,
      originalError,
      metadata,
      false,
      'Authentication failed. Please check your credentials.',
      'Verify your token or login credentials and try again.'
    );
  }

  /**
   * Convert to a plain object for serialization
   */
  toObject(): any {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      canRetry: this.canRetry,
      userMessage: this.userMessage,
      suggestedAction: this.suggestedAction,
      metadata: this.metadata,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined,
      stack: this.stack
    };
  }
}
