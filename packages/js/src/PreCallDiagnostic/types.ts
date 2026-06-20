/**
 * Type definitions for the new PreCallDiagnostic system.
 *
 * This module defines the public API surface, report interfaces, and
 * narrow dependency interfaces used by PreCallDiagnostic and its
 * module builders.
 *
 * The existing PreCallDiagnosis class is NOT modified — this is a
 * separate, extensible diagnostic framework.
 */

/**
 * Narrow interface representing the client/call runtime dependency.
 *
 * PreCallDiagnostic uses this instead of importing TelnyxRTC directly,
 * so that tests and future consumers can provide mock implementations
 * without pulling in the full SDK.
 */
export interface ClientLike {
  /**
   * Make a new outbound call.
   * Returns a CallLike instance for the diagnostic call.
   */
  newCall(options: CallLikeOptions): CallLike;
}

/**
 * Options for creating a diagnostic call via ClientLike.
 */
export interface CallLikeOptions {
  /** The destination number to dial for the diagnostic call. */
  destinationNumber: string;
  /** Caller name to identify the diagnostic call source. */
  callerName?: string;
  /** Caller number for the diagnostic call. */
  callerNumber?: string;
  /** Audio constraints for the diagnostic call. */
  audio?: boolean | MediaStreamConstraints['audio'];
  /** Whether to enable debug/stats collection on the call. */
  debug?: boolean;
}

/**
 * Narrow interface representing a call object returned by ClientLike.
 *
 * This provides just the methods PreCallDiagnostic needs for lifecycle
 * management and stats access.
 */
export interface CallLike {
  /** Unique identifier for this call. */
  id: string;
  /**
   * Hang up the call.
   * May return a Promise (e.g. SDK Call.hangup()) or void synchronously.
   * Consumers should await the result when possible.
   */
  hangup(): void | Promise<void>;
  /** The underlying RTCPeerConnection, if available. */
  peerConnection?: RTCPeerConnection;
}

/**
 * Options for the ICE diagnostic module.
 */
export interface PreCallIceOptions {
  /** Whether to gather ICE candidate information. Default: true. */
  gatherCandidates?: boolean;
  /** Timeout in ms for ICE gathering. Default: 5000. */
  gatherTimeoutMs?: number;
}

/**
 * Options for the network diagnostic module.
 */
export interface PreCallNetworkOptions {
  /** Whether to measure network quality. Default: true. */
  enabled?: boolean;
}

/**
 * Options for the media diagnostic module.
 */
export interface PreCallMediaOptions {
  /** Whether to check media flow. Default: true. */
  enabled?: boolean;
}

/**
 * Options for the microphone diagnostic module.
 */
export interface PreCallMicrophoneOptions {
  /** Whether to check microphone permission. Default: true. */
  checkPermission?: boolean;
  /** Whether to check device availability. Default: true. */
  checkDeviceAvailability?: boolean;
}

/**
 * Options for the PreCallDiagnostic constructor.
 */
export interface PreCallDiagnosticOptions {
  /** Required runtime dependency for creating diagnostic calls. */
  client: ClientLike;

  /** The destination number to dial for the diagnostic call. */
  destinationNumber: string;

  /** Caller name for the diagnostic call. */
  callerName?: string;

  /** Caller number for the diagnostic call. */
  callerNumber?: string;

  /** Audio constraints for the diagnostic call. */
  audio?: boolean | MediaStreamConstraints['audio'];

  /** Overall timeout in ms for the diagnostic run. Default: 30000. */
  timeoutMs?: number;

  /** Timeout in ms for the call setup phase. Default: 15000. */
  callSetupTimeoutMs?: number;

  /** Interval in ms between stats samples. Default: 1000. */
  statsSampleIntervalMs?: number;

  /** Duration in ms to keep the diagnostic call active for sampling. Default: 5000. */
  durationMs?: number;

  /** Whether to automatically hang up the diagnostic call on completion. Default: true. */
  autoHangup?: boolean;

  /** Whether to run the ICE diagnostic module. Default: true (if true, uses defaults). */
  ice?: boolean | PreCallIceOptions;

  /** Whether to run the network diagnostic module. Default: true (if true, uses defaults). */
  network?: boolean | PreCallNetworkOptions;

  /** Whether to run the media diagnostic module. Default: true (if true, uses defaults). */
  media?: boolean | PreCallMediaOptions;

  /** Whether to run the microphone diagnostic module. Default: true (if true, uses defaults). */
  microphone?: boolean | PreCallMicrophoneOptions;

  /** Optional RTC configuration override for the diagnostic call. */
  rtcConfig?: RTCConfiguration;
}

/**
 * A reason entry in the diagnostic report, explaining a specific
 * finding that contributes to the overall verdict.
 */
export interface PreCallDiagnosticReason {
  /** Machine-readable reason code (e.g., 'ice_no_srflx', 'network_high_jitter'). */
  code: string;
  /** Human-readable description of the finding. */
  message: string;
  /** Which module produced this reason (e.g., 'ice', 'network', 'media', 'microphone'). */
  source: string;
}

/**
 * Timing measurements for the diagnostic run.
 */
export interface PreCallTimingsReport {
  /** Time in ms from diagnostic start to call creation. */
  callCreateMs?: number;
  /** Time in ms from call creation to call active. */
  callSetupMs?: number;
  /** Total time in ms for the diagnostic run. */
  totalMs?: number;
  /** Timestamp when the diagnostic started (epoch ms). */
  startedAt?: number;
  /** Timestamp when the diagnostic completed (epoch ms). */
  completedAt?: number;
}

/**
 * Report from the ICE diagnostic module.
 * Placeholder structure — to be filled in by T2/VSDK-299 and T3/VSDK-300.
 */
export interface PreCallIceReport {
  /** Whether ICE gathering completed successfully. */
  gatheringComplete?: boolean;
  /** ICE candidate types found. */
  candidateTypes?: string[];
  /** Whether a selected ICE pair was found. */
  hasSelectedPair?: boolean;
}

/**
 * Report from the network diagnostic module.
 * Placeholder structure — to be filled in by T4/VSDK-301.
 */
export interface PreCallNetworkReport {
  /** Overall network quality assessment. */
  quality?: 'good' | 'fair' | 'poor' | 'unknown';
}

/**
 * Report from the media diagnostic module.
 * Placeholder structure — to be filled in by T5/VSDK-302.
 */
export interface PreCallMediaReport {
  /** Whether media (audio) is flowing in both directions. */
  audioFlowing?: boolean;
}

/**
 * Permission state values for the microphone diagnostic module.
 *
 * Mirrors the browser Permissions API states where supported.
 * 'unknown' is used when the Permissions API is not available or
 * returns an unrecognized state.
 */
export type MicrophonePermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unknown';

/**
 * Report from the microphone permission and device availability check.
 *
 * Implemented by T6 (VSDK-303). T7 (VSDK-304) adds active capture
 * and audio-level diagnostics as a separate concern.
 */
export interface PreCallMicrophoneReport {
  /** Microphone permission state from the Permissions API (or best-effort inference). */
  permissionState?: MicrophonePermissionState;
  /**
   * Whether microphone permission was granted.
   * Convenience boolean: true when permissionState is 'granted', false otherwise.
   * Undefined when permission state could not be determined.
   */
  permissionGranted?: boolean;
  /**
   * Whether at least one audio input device is available.
   * Undefined when device enumeration is not available.
   */
  deviceAvailable?: boolean;
  /**
   * Number of audio input devices found via enumerateDevices.
   * Undefined when device enumeration is not available.
   */
  deviceCount?: number;
  /**
   * Whether device labels are accessible (implies permission was granted).
   * When false, device labels may be empty strings.
   * Undefined when device enumeration is not available.
   */
  labelsAccessible?: boolean;
  /**
   * Reason codes for any issues found, suitable for verdict/reason module input.
   * E.g. 'microphone_permission_denied', 'microphone_no_device'.
   */
  reasons?: PreCallDiagnosticReason[];
}

/**
 * The complete diagnostic report returned by PreCallDiagnostic.run().
 */
export interface PreCallDiagnosticReport {
  /** Report schema version. Always 1. */
  version: 1;
  /** Overall verdict of the diagnostic run. */
  verdict?:
    | 'ready'
    | 'degraded'
    | 'blocked'
    | 'permission_denied'
    | 'inconclusive';
  /** List of reasons contributing to the verdict. */
  reasons?: PreCallDiagnosticReason[];
  /** Timing measurements. */
  timings?: PreCallTimingsReport;
  /** ICE diagnostic results. */
  ice?: PreCallIceReport;
  /** Network diagnostic results. */
  network?: PreCallNetworkReport;
  /** Media diagnostic results. */
  media?: PreCallMediaReport;
  /** Microphone diagnostic results. */
  microphone?: PreCallMicrophoneReport;
  /** Raw data for advanced analysis. */
  raw?: {
    /** Raw RTC stats report, if available. */
    stats?: RTCStatsReport | unknown;
    /** Collected stats samples over the diagnostic duration. */
    samples?: unknown[];
  };
}

/**
 * Runner interface for the diagnostic. PreCallDiagnostic implements this.
 * Future alternative runners can implement the same interface.
 */
export interface PreCallDiagnosticRunner {
  /**
   * Execute the diagnostic and return the report.
   */
  run(): Promise<PreCallDiagnosticReport>;
}
