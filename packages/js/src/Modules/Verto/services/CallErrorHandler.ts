import { IWebRTCCall } from '../webrtc/interfaces';
import { ErrorHandler } from '../util/ErrorHandler';
import { TelnyxError } from '../util/TelnyxError';
import { SwEvent } from '../util/constants';
import { NOTIFICATION_TYPE } from '../webrtc/constants';
import { trigger } from './Handler';
import logger from '../util/logger';

/**
 * Specialized error handler for call-related errors
 */
export class CallErrorHandler {
  /**
   * Handle call failure with enhanced error information and user guidance
   */
  static handleCallFailure(call: IWebRTCCall): void {
    const errorInfo = {
      callId: call.id,
      state: call.state,
      cause: call.cause,
      causeCode: call.causeCode,
      direction: call.direction,
      destinationNumber: call.options?.destinationNumber,
      callerNumber: call.options?.callerNumber,
      options: call.options
    };

    // Create enhanced error
    const telnyxError = TelnyxError.callError(
      call.cause,
      undefined, // sipCode not available in interface
      undefined, // sipReason not available in interface
      'CallErrorHandler.handleCallFailure',
      errorInfo
    );

    // Log detailed error information for debugging
    logger.error('Call failure details:', errorInfo);

    // Get additional user guidance
    const additionalGuidance = this.getAdditionalGuidance(call);
    
    // Create enhanced notification with user-friendly information
    const notification = {
      type: NOTIFICATION_TYPE.callUpdate,
      call,
      error: {
        ...telnyxError.toObject(),
        canRetry: this.canRetryCall(call),
        suggestedAction: this.getSuggestedAction(call),
        additionalGuidance,
        nextSteps: this.getNextSteps(call)
      }
    };

    // Trigger notification - try call level first, then session level
    if (!trigger(SwEvent.Notification, notification, call.id, false)) {
      // Fall back to session level notification
      trigger(SwEvent.Notification, notification);
    }

    // Track error for monitoring
    ErrorHandler.handleError('CallFailure', telnyxError);
  }

  /**
   * Handle media errors during calls
   */
  static handleCallMediaError(call: IWebRTCCall, error: Error): void {
    const telnyxError = ErrorHandler.handleMediaError(
      error,
      'CallErrorHandler.handleCallMediaError',
      {
        callId: call.id,
        callState: call.state,
        direction: call.direction
      }
    );

    const notification = {
      type: NOTIFICATION_TYPE.userMediaError,
      call,
      error: telnyxError.toObject()
    };

    if (!trigger(SwEvent.Notification, notification, call.id, false)) {
      // Fall back to global notification
      trigger(SwEvent.Notification, notification);
    }

    // Auto-hangup on media errors
    call.hangup({}, false);
  }

  /**
   * Determine if a call can be retried based on the failure reason
   */
  private static canRetryCall(call: IWebRTCCall): boolean {
    const retryableCauses = [
      'USER_BUSY',
      'NO_ANSWER',
      'NETWORK_ERROR',
      'NORMAL_TEMPORARY_FAILURE',
      'RECOVERY_ON_TIMER_EXPIRE'
    ];

    return retryableCauses.includes(call.cause);
  }

  /**
   * Get user-friendly suggested action for call failures
   */
  private static getSuggestedAction(call: IWebRTCCall): string {
    // Use cause-based guidance since SIP codes aren't available in interface
    switch (call.cause) {
      case 'USER_BUSY':
        return 'The person you are calling is busy. Try again later';
      case 'CALL_REJECTED':
        return 'Call was declined by the recipient';
      case 'NO_ANSWER':
        return 'No answer. The person may be unavailable';
      case 'UNALLOCATED_NUMBER':
        return 'Invalid phone number. Please check and try again';
      case 'NETWORK_ERROR':
        return 'Network connection issue. Check your internet and try again';
      case 'NORMAL_CLEARING':
        return 'Call completed normally';
      case 'INVALID_NUMBER_FORMAT':
        return 'Invalid phone number format. Please check and try again';
      case 'SUBSCRIBER_ABSENT':
        return 'The number is not reachable at this time';
      default:
        return 'Please try your call again';
    }
  }

  /**
   * Get additional guidance based on call context
   */
  private static getAdditionalGuidance(call: IWebRTCCall): string[] {
    const guidance: string[] = [];

    // Add specific guidance based on call details
    if (call.direction === 'outbound') {
      if (call.cause === 'UNALLOCATED_NUMBER') {
        guidance.push('Verify the country code and area code are correct');
        guidance.push('Some numbers may not be reachable from your location');
      }
    }

    if (call.cause === 'NETWORK_ERROR') {
      guidance.push('Check your internet connection stability');
      guidance.push('Try switching to a different network if available');
      guidance.push('Ensure no firewall is blocking WebRTC traffic');
    }

    if (call.cause === 'USER_BUSY') {
      guidance.push('The recipient may be on another call');
      guidance.push('Try calling again in a few minutes');
    }

    return guidance;
  }

  /**
   * Get next steps the user can take
   */
  private static getNextSteps(call: IWebRTCCall): string[] {
    const nextSteps: string[] = [];

    if (this.canRetryCall(call)) {
      nextSteps.push('Try calling again');
      
      if (call.cause === 'USER_BUSY') {
        nextSteps.push('Wait a few minutes before retrying');
      }
    }

    if (call.cause === 'UNALLOCATED_NUMBER') {
      nextSteps.push('Double-check the phone number');
      nextSteps.push('Contact support if you believe the number is correct');
    }

    if (call.cause === 'CALL_REJECTED') {
      nextSteps.push('The recipient declined the call');
      nextSteps.push('Try contacting them through alternative means');
    }

    if (call.cause === 'NETWORK_ERROR') {
      nextSteps.push('Check your internet connection');
      nextSteps.push('Try calling from a different network');
      nextSteps.push('Contact technical support if the problem persists');
    }

    return nextSteps;
  }

  /**
   * Get escalation information for persistent call failures
   */
  static getEscalationInfo(consecutiveFailures: number): {
    shouldEscalate: boolean;
    message?: string;
    supportContact?: string;
  } {
    if (consecutiveFailures >= 3) {
      return {
        shouldEscalate: true,
        message: 'Multiple call attempts have failed. This may indicate a service issue.',
        supportContact: 'Please contact technical support for assistance'
      };
    }

    return { shouldEscalate: false };
  }
}
