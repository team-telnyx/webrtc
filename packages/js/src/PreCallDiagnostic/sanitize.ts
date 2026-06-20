/**
 * RTC configuration sanitization utilities.
 *
 * Provides helpers for redacting TURN credentials (username, credential)
 * from RTCConfiguration objects so they never appear in logs, reports,
 * snapshots, or summaries.
 *
 * Non-secret metadata (urls, credentialType) is preserved so the output
 * remains useful for diagnostics without exposing secrets.
 */

import type { CallLikeOptions } from './types';

/**
 * A sanitized ICE server entry with secrets redacted.
 * Only non-secret metadata is included.
 */
export interface SanitizedIceServer {
  /** The ICE server URLs (preserved for diagnostics). */
  urls: string | string[];
  /** Whether a username was provided (value is redacted). */
  hasUsername: boolean;
  /** Whether a credential was provided (value is redacted). */
  hasCredential: boolean;
  /** The credential type, if specified (e.g., 'password', 'oauth'). */
  credentialType?: RTCIceCredentialType;
}

/**
 * A sanitized RTCConfiguration with TURN secrets redacted.
 * Non-secret fields are preserved; credential fields are replaced
 * with boolean indicators.
 */
export interface SanitizedRtcConfig {
  /** Sanitized ICE servers with redacted credentials. */
  iceServers?: SanitizedIceServer[];
  /** ICE transport policy (preserved — not secret). */
  iceTransportPolicy?: RTCIceTransportPolicy;
  /** Bundle policy (preserved — not secret). */
  bundlePolicy?: RTCBundlePolicy;
  /** ICE candidate pool size (preserved — not secret). */
  iceCandidatePoolSize?: number;
}

/**
 * Sanitize a single RTCIceServer by redacting username and credential.
 *
 * @param server - The ICE server entry to sanitize.
 * @returns A sanitized entry with secrets replaced by boolean indicators.
 */
export function sanitizeIceServer(server: RTCIceServer): SanitizedIceServer {
  const result: SanitizedIceServer = {
    urls: server.urls,
    hasUsername: Boolean(server.username),
    hasCredential: Boolean(server.credential),
  };

  // Preserve credentialType — it's metadata, not a secret
  if (server.credentialType) {
    result.credentialType = server.credentialType;
  }

  return result;
}

/**
 * Sanitize an RTCConfiguration by redacting TURN credentials.
 *
 * Returns a new object where every `iceServers` entry has its
 * `username` and `credential` values replaced with boolean
 * indicators (`hasUsername`, `hasCredential`). Non-secret fields
 * such as `urls`, `credentialType`, `iceTransportPolicy`,
 * `bundlePolicy`, and `iceCandidatePoolSize` are preserved.
 *
 * If the input is `undefined`, returns `undefined`.
 * If `iceServers` is empty or missing, the result omits the field.
 *
 * @param config - The RTCConfiguration to sanitize.
 * @returns A sanitized copy with secrets redacted.
 */
export function sanitizeRtcConfig(
  config?: RTCConfiguration
): SanitizedRtcConfig | undefined {
  if (!config) {
    return undefined;
  }

  const result: SanitizedRtcConfig = {};

  // Sanitize iceServers
  if (config.iceServers && config.iceServers.length > 0) {
    result.iceServers = config.iceServers.map(sanitizeIceServer);
  }

  // Preserve non-secret fields
  if (config.iceTransportPolicy) {
    result.iceTransportPolicy = config.iceTransportPolicy;
  }
  if (config.bundlePolicy) {
    result.bundlePolicy = config.bundlePolicy;
  }
  if (config.iceCandidatePoolSize !== undefined) {
    result.iceCandidatePoolSize = config.iceCandidatePoolSize;
  }

  return result;
}

/**
 * Sanitize the rtcConfig field from CallLikeOptions.
 *
 * Convenience wrapper that extracts `rtcConfig` from call options
 * and sanitizes it for logging/reporting.
 *
 * @param options - Call options that may contain rtcConfig.
 * @returns Sanitized RTC config, or undefined if not provided.
 */
export function sanitizeCallOptionsRtcConfig(
  options: CallLikeOptions
): SanitizedRtcConfig | undefined {
  return sanitizeRtcConfig(options.rtcConfig);
}
