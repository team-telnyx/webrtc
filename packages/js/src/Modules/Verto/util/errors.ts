/**
 * Structured error types for the Telnyx WebRTC SDK.
 *
 * Error definitions live in `util/constants/errors.ts`.
 * Warning definitions live in `util/constants/warnings.ts`.
 *
 * This module provides the `TelnyxError` class (for errors) and
 * re-exports everything from the constants modules.
 */

import { SDK_ERRORS, SdkErrorCode } from './constants/errors';
import {
  SDK_WARNINGS,
  SdkWarningCode,
  ITelnyxWarning,
  createTelnyxWarning,
} from './constants/warnings';
import {
  MEDIA_MICROPHONE_PERMISSION_DENIED,
  MEDIA_DEVICE_NOT_FOUND,
  MEDIA_GET_USER_MEDIA_FAILED,
} from './constants/errorCodes';

export { SDK_ERRORS, SdkErrorCode } from './constants/errors';
export { SDK_WARNINGS, SdkWarningCode, ITelnyxWarning, createTelnyxWarning };

export type TelnyxMediaErrorCode =
  | typeof MEDIA_MICROPHONE_PERMISSION_DENIED
  | typeof MEDIA_DEVICE_NOT_FOUND
  | typeof MEDIA_GET_USER_MEDIA_FAILED;

export interface ITelnyxError {
  /** Numeric error code (e.g. 40001) */
  code: SdkErrorCode;
  /** Machine-readable error name in UPPER_SNAKE_CASE (e.g. 'SDP_CREATE_OFFER_FAILED') */
  name: string;
  /** Full explanation of the error — what happened and why */
  description: string;
  /** Short human-readable message suitable for UI alerts */
  message: string;
  /** Possible root causes */
  causes: string[];
  /** Suggested remediation steps */
  solutions: string[];
  /** The original error that triggered this, if any */
  originalError?: unknown;
  /**
   * `true` when the situation is terminal — operation/call/session is dead
   * and the client should stop. `false` when the SDK is handling recovery
   * (auto-reconnect, gateway retry, media-recovery, signaling-recovery via
   * SignalingHealth, etc.) or when the failure is benign enough to ignore.
   * Set from `SDK_ERRORS[code].fatal` at construction; emit sites override
   * per context when needed.
   *
   * Distinct from the top-level `ITelnyxStandardErrorEvent.recoverable`
   * field, which stays untouched for backward compatibility: `recoverable`
   * signals "SDK is recovering via an app-facing helper"; `fatal` signals
   * "give up vs wait vs ignore."
   */
  fatal: boolean;
}

export interface ITelnyxMediaError extends Omit<ITelnyxError, 'code'> {
  /** Media-layer error code (420xx) */
  code: TelnyxMediaErrorCode;
}

export interface ITelnyxStandardErrorEvent {
  /** Structured SDK error — carries the `fatal` field. */
  error: ITelnyxError;
  /** Current SDK session identifier */
  sessionId: string;
  /** Call identifier when the error is associated with a call */
  callId?: string;
  /** Non-recoverable errors omit recovery helpers — kept as-is. */
  recoverable?: false;
}

export interface ITelnyxMediaRecoveryErrorEvent {
  /** Structured media error for the failed initial getUserMedia attempt */
  error: ITelnyxMediaError;
  /** Current SDK session identifier */
  sessionId: string;
  /** Inbound call being recovered */
  callId: string;
  /** Indicates that the app can still recover by resuming the flow — kept as-is. */
  recoverable: true;
  /** Epoch timestamp in ms after which the SDK will stop waiting */
  retryDeadline: number;
  /** Retry media acquisition after the app resolves permissions */
  resume: () => void;
  /** Abort recovery and let the call fail immediately */
  reject: () => void;
}

export type ITelnyxErrorEvent =
  | ITelnyxStandardErrorEvent
  | ITelnyxMediaRecoveryErrorEvent;

export class TelnyxError extends Error implements ITelnyxError {
  public readonly code: SdkErrorCode;
  public readonly description: string;
  public readonly causes: string[];
  public readonly solutions: string[];
  public readonly originalError?: unknown;
  public readonly fatal: boolean;

  constructor(params: Omit<ITelnyxError, 'message'> & { message?: string }) {
    const message = params.message || `[${params.code}] ${params.name}`;
    super(message);

    this.name = params.name;
    this.code = params.code;
    this.description = params.description;
    this.causes = params.causes;
    this.solutions = params.solutions;
    this.originalError = params.originalError;
    this.fatal = params.fatal;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, TelnyxError.prototype);
  }

  toJSON(): ITelnyxError {
    return {
      code: this.code,
      name: this.name,
      description: this.description,
      message: this.message,
      causes: this.causes,
      solutions: this.solutions,
      originalError: this.originalError,
      fatal: this.fatal,
    };
  }
}

export function isMediaRecoveryErrorEvent(
  event: ITelnyxErrorEvent
): event is ITelnyxMediaRecoveryErrorEvent {
  return event.recoverable === true;
}

/**
 * Classify a media-related error into a structured error code.
 *
 * - 42001 → Permission denied (NotAllowedError)
 * - 42002 → Device not found (NotFoundError / OverconstrainedError)
 * - 42003 → Generic media error (fallback)
 */
export function classifyMediaErrorCode(
  error: unknown
):
  | typeof MEDIA_MICROPHONE_PERMISSION_DENIED
  | typeof MEDIA_DEVICE_NOT_FOUND
  | typeof MEDIA_GET_USER_MEDIA_FAILED {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return MEDIA_MICROPHONE_PERMISSION_DENIED;
    }
    if (
      error.name === 'NotFoundError' ||
      error.name === 'OverconstrainedError'
    ) {
      return MEDIA_DEVICE_NOT_FOUND;
    }
  }
  return MEDIA_GET_USER_MEDIA_FAILED;
}

/**
 * Factory that creates a `TelnyxError` from a registered error code.
 *
 * @param code - One of the numeric keys from `SDK_ERRORS`
 * @param originalError - The underlying error, if available
 * @param message - Optional override for the default message
 * @param fatal - Optional override for the `fatal` flag. When omitted, the
 *   default from `SDK_ERRORS[code].fatal` is used. Pass this only when the
 *   emit site's context differs from the registry default (e.g.
 *   `UNEXPECTED_ERROR` sites, the non-recovery `MEDIA_*` path,
 *   login-after-retry-exhaustion, etc.).
 */
export function createTelnyxError(
  code: SdkErrorCode,
  originalError?: unknown,
  message?: string,
  fatal?: boolean
): TelnyxError {
  const entry = SDK_ERRORS[code];
  const normalizedError =
    originalError instanceof Error
      ? originalError
      : originalError !== undefined
        ? new Error(String(originalError))
        : undefined;
  return new TelnyxError({
    code,
    name: entry.name,
    description: entry.description,
    message: message || entry.message,
    causes: [...entry.causes],
    solutions: [...entry.solutions],
    originalError: normalizedError,
    fatal: fatal ?? entry.fatal,
  });
}

/**
 * Indicates that a signaling request timed out waiting for a server
 * response. Carries the request ID, timeout duration, and Verto method
 * name so callers can decide whether to trigger signaling recovery.
 */
export class RequestTimeoutError extends Error {
  public readonly requestId: string;
  public readonly timeoutMs: number;
  public readonly method: string;

  constructor(requestId: string, timeoutMs: number, method: string = '') {
    super(
      `Signaling request timed out (id=${requestId}, method=${method || 'unknown'}, timeout=${timeoutMs}ms)`
    );
    this.name = 'RequestTimeoutError';
    this.requestId = requestId;
    this.timeoutMs = timeoutMs;
    this.method = method;
  }
}

/**
 * Indicates that a request's timeout fired after the WebSocket was replaced
 * by a newer connection (socket generation mismatch). The request is
 * effectively cancelled — its promise is settled with this error so callers
 * never hang, but signaling recovery must NOT be triggered since the new
 * socket is healthy.
 */
export class StaleRequestError extends Error {
  public readonly requestId: string;
  public readonly staleGeneration: number;
  public readonly currentGeneration: number;

  constructor(
    requestId: string,
    staleGeneration: number,
    currentGeneration: number
  ) {
    super(
      `Stale request cancelled (id=${requestId}, gen=${staleGeneration}, current=${currentGeneration})`
    );
    this.name = 'StaleRequestError';
    this.requestId = requestId;
    this.staleGeneration = staleGeneration;
    this.currentGeneration = currentGeneration;
  }
}
