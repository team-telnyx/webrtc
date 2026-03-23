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

export { SDK_ERRORS, SdkErrorCode };
export { SDK_WARNINGS, SdkWarningCode, ITelnyxWarning, createTelnyxWarning };

export interface ITelnyxError {
  /** Numeric error code (e.g. 40001) */
  code: number;
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
}

export class TelnyxError extends Error implements ITelnyxError {
  public readonly code: number;
  public readonly description: string;
  public readonly causes: string[];
  public readonly solutions: string[];
  public readonly originalError?: unknown;

  constructor(params: Omit<ITelnyxError, 'message'> & { message?: string }) {
    const message = params.message || `[${params.code}] ${params.name}`;
    super(message);

    this.name = params.name;
    this.code = params.code;
    this.description = params.description;
    this.causes = params.causes;
    this.solutions = params.solutions;
    this.originalError = params.originalError;

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
    };
  }
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
): 42001 | 42002 | 42003 {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 42001;
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return 42002;
    }
  }
  return 42003;
}

/**
 * Factory that creates a `TelnyxError` from a registered error code.
 *
 * @param code - One of the numeric keys from `SDK_ERRORS`
 * @param originalError - The underlying error, if available
 * @param message - Optional override for the default message
 */
export function createTelnyxError(
  code: SdkErrorCode,
  originalError?: unknown,
  message?: string
): TelnyxError {
  const entry = SDK_ERRORS[code];
  return new TelnyxError({
    code,
    name: entry.name,
    description: entry.description,
    message: message || entry.message,
    causes: [...entry.causes],
    solutions: [...entry.solutions],
    originalError,
  });
}
