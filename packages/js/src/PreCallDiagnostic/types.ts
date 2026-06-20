/**
 * Type definitions for the new PreCallDiagnostic system.
 *
 * This module defines the public API surface and report interfaces
 * used by PreCallDiagnostic and its module builders.
 *
 * The existing PreCallDiagnosis class is NOT modified — this is a
 * separate, extensible diagnostic framework.
 */

import type { TelnyxRTC } from '../TelnyxRTC';
import type Call from '../Modules/Verto/webrtc/Call';

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
  client: TelnyxRTC;

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
 * Counts of ICE candidates by type, as gathered locally.
 */
export interface PreCallIceCandidateCounts {
  /** Total number of local ICE candidates. */
  total: number;
  /** Host candidates (direct interface addresses). */
  host: number;
  /** Server-reflexive candidates (STUN-derived). */
  srflx: number;
  /** Peer-reflexive candidates (discovered during connectivity checks). */
  prflx: number;
  /** Relay candidates (TURN-derived). */
  relay: number;
  /** Candidates with an unrecognized candidateType. */
  unknown: number;
}

/**
 * Metadata about a single ICE candidate, extracted from RTCStatsReport.
 */
export interface PreCallIceCandidateInfo {
  /** Stats report ID for this candidate. */
  id?: string;
  /** Candidate type: host, srflx, prflx, relay, or a custom string. */
  candidateType?: 'host' | 'srflx' | 'prflx' | 'relay' | string;
  /** Transport protocol (e.g., 'udp', 'tcp'). */
  protocol?: string;
  /** Network type as reported by the browser (e.g., 'wifi', 'cellular', 'ethernet'). */
  networkType?: string;
  /** Relay protocol when candidateType is 'relay' (e.g., 'turn', 'turns'). */
  relayProtocol?: string;
  /** TURN server URL associated with this relay candidate. */
  url?: string;
}

/**
 * Report about the selected ICE candidate pair.
 */
export interface PreCallIceSelectedPairReport {
  /** Stats report ID for this candidate pair. */
  id?: string;
  /** Candidate-pair state: frozen, waiting, in-progress, failed, succeeded. */
  state?: string;
  /** Whether this pair was nominated by the ICE agent. */
  nominated?: boolean;
  /** Whether this pair is writable. */
  writable?: boolean;
  /** Current round-trip time in seconds (as reported by the browser). */
  currentRoundTripTime?: number;
  /** Stats report ID of the local candidate in this pair. */
  localCandidateId?: string;
  /** Stats report ID of the remote candidate in this pair. */
  remoteCandidateId?: string;
  /** Metadata about the local candidate in this pair. */
  local?: PreCallIceCandidateInfo;
  /** Metadata about the remote candidate in this pair. */
  remote?: PreCallIceCandidateInfo;
}

/**
 * Report from the ICE diagnostic module.
 *
 * Combines candidate-gathering counts/flags (T2) and selected-pair
 * connectivity diagnostics (T3) into a single report section.
 */
export interface PreCallIceReport {
  /** Whether ICE candidate gathering has completed. */
  candidateGatheringCompleted?: boolean;
  /** Whether ICE gathering completed successfully (alias for candidateGatheringCompleted). */
  gatheringComplete?: boolean;
  /** Counts of local ICE candidates by type. */
  candidateCounts: PreCallIceCandidateCounts;
  /** Unique local candidate types, sorted alphabetically. */
  candidateTypes: string[];
  /** Whether at least one relay candidate was gathered. */
  hasRelayCandidate: boolean;
  /** Whether all gathered candidates are host-type only. */
  onlyHostCandidates: boolean;
  /** Whether a selected ICE candidate pair was found. */
  hasSelectedPair: boolean;
  /** Details about the selected candidate pair, if found. */
  selectedPair?: PreCallIceSelectedPairReport;
  /** Whether the selected (or fallback) candidate pair is in a failed state. */
  selectedPairFailed?: boolean;
  /** ICE gathering state from the RTCPeerConnection. */
  iceGatheringState?: RTCIceGatheringState | string;
  /** ICE connection state from the RTCPeerConnection. */
  iceConnectionState?: RTCIceConnectionState | string;
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
 * Report from the microphone diagnostic module.
 * Placeholder structure — to be filled in by T6/VSDK-303 and T7/VSDK-304.
 */
export interface PreCallMicrophoneReport {
  /** Whether microphone permission was granted. */
  permissionGranted?: boolean;
  /** Whether a microphone device is available. */
  deviceAvailable?: boolean;
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

/**
 * Re-export Call type for consumers that need to reference the diagnostic call.
 * Using the SDK's own Call class rather than a duplicate interface.
 */
export type { Call };
