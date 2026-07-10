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
  /**
   * Whether to perform active microphone capture and audio-level detection.
   * When true, getUserMedia({ audio: true }) is called and the audio level
   * is measured during a short sample window. All tracks are stopped after
   * the sample completes.
   * Default: true (enabled for `runMicrophoneCheck()`).
   */
  activeCapture?: boolean;
  /**
   * Duration in ms for the audio-level sample window during active capture.
   * Default: 2000.
   */
  sampleDurationMs?: number;
  /**
   * RMS threshold below which audio is considered silent.
   * Value between 0 and 1. Default: 0.01.
   */
  silenceThreshold?: number;
  /**
   * Whether to record the microphone audio during the sample window
   * so the user can listen to it afterwards. When true, the captured
   * audio is recorded using a MediaRecorder and the resulting Blob is
   * available in the report as a data URL (`recordingDataUrl`).
   * Default: false.
   */
  record?: boolean;
  /**
   * Whether to play back the recorded audio after capture. Only applies
   * when `record` is true. When true, an `<audio>` element is created
   * and the recording is played through the speakers.
   * Default: false.
   */
  playback?: boolean;
}

/**
 * Options for the PreCallDiagnostic constructor.
 *
 * Internal-only fields (`mode`, `ice`/`network`/`media`/`microphone` module
 * toggles, `callerName`/`callerNumber`/`audio`, `statsSampleIntervalMs`,
 * `autoHangup`, `rtcConfig`) are NOT part of the public API surface — see
 * `RunPreCallOptions` in `TelnyxRTC.ts` for the trimmed 4-field public
 * surface (`destinationNumber`, `callSetupTimeoutMs`, `durationMs`,
 * `iceServers`).
 */
export interface PreCallDiagnosticOptions {
  /** Required runtime dependency for creating diagnostic calls. */
  client: TelnyxRTC;

  /**
   * The destination number to dial for the diagnostic call.
   *
   * Optional: only required for `'full'` mode (a real diagnostic call).
   * `'network-only'` and `'microphone-only'` modes do not place a call, so
   * `destinationNumber` is irrelevant for them and may be omitted.
   */
  destinationNumber?: string;

  /** Caller name for the diagnostic call (internal — not public surface). */
  callerName?: string;

  /** Caller number for the diagnostic call (internal — not public surface). */
  callerNumber?: string;

  /** Audio constraints for the diagnostic call (internal — not public surface). */
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

  /**
   * Diagnostic run mode — controls which path `PreCallDiagnostic.run()`
   * takes. Set internally by the public API methods:
   * - `runPreCall()` → `'full'` (establishes a diagnostic call, runs all modules)
   * - `runNetworkCheck()` → `'network-only'` (raw RTCPeerConnection, ICE only)
   * - `runMicrophoneCheck()` → `'microphone-only'` (getUserMedia + Web Audio)
   *
   * Not part of the public surface; module toggles (`ice`/`network`/`media`/
   * `microphone`) are NOT exposed to callers. Defaults to `'full'` when
   * omitted so a bare `new PreCallDiagnostic(options).run()` runs the
   * complete pipeline.
   */
  mode?: 'full' | 'network-only' | 'microphone-only';

  /**
   * Whether to enable SDK debug logging for the diagnostic call.
   * Default: false. When true, the diagnostic call is created with
   * `debug: true` (enables the SDK's full debug-log path). Callers must
   * opt in explicitly — diagnostic calls should not silently opt the
   * caller into verbose logging.
   */
  debug?: boolean;

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
 *
 * All duration fields are milliseconds. Missing sources result in omitted
 * fields (undefined), not zero placeholders.
 *
 * Lifecycle fields (`callCreateMs`, `callSetupMs`, `callAnsweredMs`,
 * `iceConnectedMs`, `dtlsConnectedMs`, `ringingMs`, `firstMediaStatsMs`) are
 * measured from the start of the call (the SDK `new-call-start` performance
 * mark) via the existing `CallEstablishmentTimings` system. Diagnostic-only
 * fields (`firstStatsMs`, `statsSamplingMs`, `cleanupMs`, `totalMs`) are
 * measured by the `TimingsCollector` inside the PreCallDiagnostic runner.
 */
export interface PreCallTimingsReport {
  /** Epoch timestamp (Date.now()) when the diagnostic started. */
  startedAt?: number;
  /** Epoch timestamp (Date.now()) when the diagnostic completed. */
  completedAt?: number;
  /** Total duration of the diagnostic run in ms (monotonic). */
  totalMs?: number;
  /** Time from diagnostic start to client ready/connect, if observable. */
  clientReadyMs?: number;
  /** Time from start to call creation (new-call-start mark). */
  callCreateMs?: number;
  /** Time from call creation to call active. */
  callSetupMs?: number;
  /** Time from call creation to call answered (telnyx-rtc-answer mark). */
  callAnsweredMs?: number;
  /** Time from call creation to ICE connected. */
  iceConnectedMs?: number;
  /** Time from start to DTLS connected, if observable. */
  dtlsConnectedMs?: number;
  /** Time from start to ringing, if observable. */
  ringingMs?: number;
  /** Time from start to first media stats (first-remote-media-track mark). */
  firstMediaStatsMs?: number;
  /** Time from call start to ICE candidate gathering started. */
  iceGatheringStartedMs?: number;
  /** Time from call start to the first ICE candidate gathered. */
  firstCandidateMs?: number;
  /** Time from call start to the first non-host (srflx/relay) candidate. */
  firstNonHostCandidateMs?: number;
  /** Time from call start to all ICE candidates gathered (gathering complete). */
  iceGatheringCompletedMs?: number;
  /** Duration of ICE candidate gathering (complete - started). */
  iceGatheringMs?: number;
  /** Time from start to first stats sample received inside collectSamples. */
  firstStatsMs?: number;
  /** Duration of the stats sampling phase. */
  statsSamplingMs?: number;
  /** Duration of cleanup (hangup + resource release). */
  cleanupMs?: number;
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
 *
 * Each gathered local candidate is reported with full information so the
 * diagnostic can explain the host's network topology (interface count,
 * private/public addresses, VPN tunnel adapters, relay usage).
 */
export interface PreCallIceCandidateInfo {
  /** Stats report ID for this candidate. */
  id?: string;
  /**
   * Candidate address as reported by the browser.
   * Chromium exposes this as `address`, Firefox as `ip`; the module
   * normalizes both into this field. May be omitted by the browser.
   */
  address?: string;
  /** Candidate port. */
  port?: number;
  /** Candidate type: host, srflx, prflx, relay, or a custom string. */
  candidateType?: 'host' | 'srflx' | 'prflx' | 'relay' | string;
  /** Transport protocol (e.g., 'udp', 'tcp'). */
  protocol?: string;
  /**
   * Network type as reported by the browser (e.g., 'wifi', 'cellular',
   * 'ethernet', 'vpn', 'unknown'). `vpn` is reported by Chromium when a VPN
   * is active. May be absent in some browsers (notably Firefox).
   */
  networkType?: string;
  /** Relay protocol when candidateType is 'relay' (e.g., 'turn', 'turns'). */
  relayProtocol?: string;
  /** TURN server URL associated with this relay candidate. */
  url?: string;
  /**
   * Raw ICE candidate string (the SDP `a=candidate:` line, minus the
   * `a=` prefix) for this candidate.
   *
   * When the browser exposes the raw candidate string directly on the
   * candidate stats entry (a non-standard `candidate` field on
   * `RTCIceCandidateStats`), that value is reported verbatim. Otherwise
   * the module reconstructs an SDP candidate line from the available
   * stats fields (foundation/component/priority are omitted when the
   * browser does not report them, producing a minimal but faithful
   * `candidate:<component> <protocol> <priority> <address> <port> typ <type>`
   * line). Undefined when no candidate fields are available.
   */
  candidate?: string;
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
  /**
   * Whether ICE candidate gathering has completed.
   *
   * This is the canonical field per the VSDK-412 spec (Section "ICE Module").
   * `gatheringComplete` is kept as a documented alias for callers that
   * prefer that name; both are populated with the same boolean.
   */
  candidateGatheringCompleted?: boolean;
  /**
   * Alias for `candidateGatheringCompleted`. Both fields are always
   * populated with the same boolean. Kept for naming compatibility.
   */
  gatheringComplete?: boolean;
  /** Counts of local ICE candidates by type. */
  candidateCounts: PreCallIceCandidateCounts;
  /** Unique local candidate types, sorted alphabetically. */
  candidateTypes: string[];
  /**
   * Full information for every gathered local candidate, in the order
   * reported by the browser. Empty array when no local candidates were
   * gathered. Provided so callers can inspect the host's network topology
   * (interface count, private/public addresses, VPN tunnel adapters).
   */
  candidates: PreCallIceCandidateInfo[];
  /** Whether at least one relay candidate was gathered. */
  hasRelayCandidate: boolean;
  /** Whether all gathered candidates are host-type only. */
  onlyHostCandidates: boolean;
  /**
   * Whether the selected candidate pair required a TURN relay.
   *
   * Derived from the selected pair: true when either the local or remote
   * candidate of the selected pair has `candidateType === 'relay'`.
   * False when the selected pair is known and neither side is a relay.
   * Undefined when there is no selected pair.
   */
  isTurnRequired?: boolean;
  /**
   * Whether the host appears to have multiple enabled network interfaces.
   * Detected by counting distinct host-candidate addresses (private IPs).
   * True only when two or more distinct host candidate addresses are
   * observed. Undefined when host candidate addresses are unavailable.
   */
  hasMultipleNetworkInterfaces?: boolean;
  /**
   * Whether a VPN appears to be active on the host.
   * Primary signal: a local candidate with `networkType === 'vpn'`
   * (Chromium reports this). Heuristic fallback (for browsers that do not
   * report networkType, e.g. Firefox): host candidates spanning multiple
   * distinct private subnets (e.g. a 192.168.x physical interface and a
   * 10.x VPN tunnel adapter). A single private subnet with srflx/relay
   * candidates is ordinary NAT traversal, not a VPN.
   * Undefined when not enough information is available to decide.
   */
  vpnDetected?: boolean;
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
  /**
   * Per-ICE-server gathering results, when `runNetworkCheck()` tests each
   * ICE server independently. Each entry shows which server it was, the
   * candidates it produced, how long gathering took, and whether it
   * gathered anything at all.
   *
   * Only populated in `'network-only'` mode (per-server testing). Omitted
   * for `'full'` mode (the call uses all servers at once).
   */
  perServerResults?: PreCallIceServerResult[];
  /**
   * Comparison of configured ICE servers against the gathered candidates.
   *
   * Identifies which configured ICE servers produced candidates and which
   * did not return any, along with warnings for strict networks (e.g.
   * configured STUN+TURN UDP+TCP but only TURN TCP candidates gathered).
   */
  serverCandidateComparison?: PreCallIceServerComparison;
}

/**
 * Result of testing a single ICE server independently.
 *
 * When `runNetworkCheck()` tests each ICE server one at a time (one
 * RTCPeerConnection per server), each result captures the full picture
 * for that server: which candidates it produced, gathering duration,
 * and whether any candidates were gathered at all.
 */
export interface PreCallIceServerResult {
  /** The ICE server configuration that was tested. */
  server: RTCIceServer;
  /** Whether this server produced at least one candidate. */
  gatheredAny: boolean;
  /** Candidates gathered from this server. */
  candidates: PreCallIceCandidateInfo[];
  /** Candidate counts from this server. */
  candidateCounts: PreCallIceCandidateCounts;
  /** Unique candidate types from this server, sorted. */
  candidateTypes: string[];
  /** Whether gathering completed (iceGatheringState === 'complete'). */
  gatheringComplete: boolean;
  /** Time in ms from gathering start to gathering complete. */
  gatheringMs?: number;
  /** Time in ms from gathering start to the first candidate. */
  firstCandidateMs?: number;
  /** Whether at least one relay candidate was gathered. */
  hasRelayCandidate: boolean;
  /** Error message if gathering from this server failed. */
  error?: string;
}

/**
 * Comparison of configured ICE servers against gathered candidates.
 *
 * Maps each configured ICE server URL to the candidates it produced (when
 * testable) and flags servers that returned no candidates, as well as
 * network-type warnings (e.g. strict network where only TURN TCP works).
 */
export interface PreCallIceServerComparison {
  /**
   * Per-server entries. Each maps a configured ICE server URL to its
   * outcome: candidates produced (and their types/protocols), or none.
   */
  servers: PreCallIceServerComparisonEntry[];
  /**
   * Whether any configured ICE server returned zero candidates.
   * A server returning no candidates is a warning (the server may be
   * unreachable, blocked, or misconfigured).
   */
  hasServerWithNoCandidates: boolean;
  /**
   * Whether the network appears to restrict UDP (strict network).
   * True when the ICE servers include STUN/TURN UDP servers but only
   * TURN TCP candidates were gathered — indicating UDP is blocked and
   * only TCP relay works.
   */
  appearsStrictNetwork: boolean;
}

/**
 * A single entry in the ICE server comparison.
 */
export interface PreCallIceServerComparisonEntry {
  /** The ICE server URL(s) from the configuration. */
  urls: string | string[];
  /** Whether this server produced at least one candidate. */
  hasCandidates: boolean;
  /** Candidate types gathered from this server (e.g. ['host', 'srflx', 'relay']). */
  candidateTypes: string[];
  /** Transport protocols observed in gathered candidates from this server. */
  protocols: string[];
  /** Number of candidates gathered from this server. */
  candidateCount: number;
}

/**
 * Summary statistics with min/max/average, used for RTT and jitter.
 * All values in milliseconds.
 */
export interface NetworkMinMaxAverage {
  /** Minimum observed value in ms. */
  min?: number;
  /** Maximum observed value in ms. */
  max?: number;
  /** Average of observed values in ms. */
  average?: number;
}

/**
 * Packet counters from the diagnostic call.
 */
export interface NetworkPacketCounters {
  /** Total RTP packets sent. */
  packetsSent?: number;
  /** Total RTP packets received. */
  packetsReceived?: number;
  /** Total RTP packets lost (cumulative). */
  packetsLost?: number;
  /** Packet loss fraction (0–1), computed from packetsLost / (packetsReceived + packetsLost). */
  packetLossFraction?: number;
}

/**
 * Byte counters from the diagnostic call.
 */
export interface NetworkByteCounters {
  /** Total bytes sent. */
  bytesSent?: number;
  /** Total bytes received. */
  bytesReceived?: number;
}

/**
 * Bitrate measurements computed from consecutive stats samples.
 * All values in bits per second (bps).
 */
export interface NetworkBitrate {
  /** Estimated outbound audio bitrate in bps. */
  outbound?: number;
  /** Estimated inbound audio bitrate in bps. */
  inbound?: number;
}

/**
 * Report from the network diagnostic module.
 *
 * Produces normalized network quality metrics from raw WebRTC stats,
 * with quality classification and reason inputs for verdict logic.
 */
export interface PreCallNetworkReport {
  /** Overall network quality assessment based on RTT, jitter, and packet loss. */
  quality?: 'good' | 'fair' | 'poor' | 'unknown';

  /** Round-trip time statistics in milliseconds. */
  rtt?: NetworkMinMaxAverage;

  /** Jitter statistics in milliseconds. */
  jitter?: NetworkMinMaxAverage;

  /** Packet loss and counter statistics. */
  packets?: NetworkPacketCounters;

  /** Byte transfer counters. */
  bytes?: NetworkByteCounters;

  /** Estimated audio bitrate in bps (computed from byte deltas between samples). */
  bitrate?: NetworkBitrate;

  /**
   * Reason inputs for the verdict module.
   * Each entry describes a specific network degradation detected.
   */
  reasons?: PreCallDiagnosticReason[];
}

/**
 * Per-direction audio flow details from the media diagnostic module.
 *
 * Describes whether audio RTP packets/bytes are observed increasing in one
 * direction during the diagnostic call, plus the raw counters and the
 * delta between the first and last samples.
 */
export interface MediaAudioDirection {
  /** Whether audio packets or bytes increased across samples. */
  flowing: boolean;
  /** Cumulative RTP packet count from the last sample. */
  packets?: number;
  /** Cumulative byte count from the last sample. */
  bytes?: number;
  /** Delta in packet count between first and last sample. */
  packetsDelta?: number;
  /** Delta in byte count between first and last sample. */
  bytesDelta?: number;
}

/**
 * RTP-level details in the media report.
 */
export interface MediaRtpDetails {
  /** Outbound (send-side) audio flow details. */
  outbound?: MediaAudioDirection;
  /** Inbound (receive-side) audio flow details. */
  inbound?: MediaAudioDirection;
}

/**
 * Report from the media diagnostic module — T5 (folded into VSDK-301).
 *
 * Describes whether audio RTP is flowing in both directions during the
 * diagnostic call, derived from the shared stats sample timeline
 * (`context.statsSamples`). The module reads only `context.statsSamples`;
 * it does not poll the peer connection or own timers.
 */
export interface PreCallMediaReport {
  /** Whether audio is flowing in both directions (derived from inbound + outbound). */
  audioFlowing?: boolean;
  /** Whether outbound audio RTP packets/bytes are increasing. */
  outboundAudioFlowing?: boolean;
  /** Whether inbound audio RTP packets/bytes are increasing. */
  inboundAudioFlowing?: boolean;
  /** Per-direction RTP packet/byte counters and deltas. */
  rtp?: MediaRtpDetails;
  /** Number of stats samples the report was built from. */
  sampleCount?: number;
  /** Reason inputs for the verdict module (namespaced with `media_*`). */
  reasons?: PreCallDiagnosticReason[];
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
 * Information about a single audio input device, from enumerateDevices.
 *
 * Includes the device label, deviceId, and kind so callers can display
 * the full list of microphones to the user.
 */
export interface PreCallAudioDevice {
  /** Device label (human-readable name). May be empty when permission not granted. */
  label: string;
  /** Device ID from the browser. May be empty when permission not granted. */
  deviceId: string;
  /** Device kind (always 'audioinput' for this module). */
  kind: 'audioinput';
}

/**
 * Audio-level statistics from the microphone capture sample window.
 *
 * Provides peak, average, and samples-count so callers can show the
 * user whether their microphone is producing sufficient audio level.
 */
export interface PreCallMicrophoneAudioLevelStats {
  /** Peak RMS audio level observed during the sample window (0–1). */
  peak: number;
  /** Average RMS audio level across all samples in the window (0–1). */
  average: number;
  /** Number of audio-level samples taken during the window. */
  samples: number;
}

/**
 * Report from the microphone diagnostic module.
 *
 * Populated by T6 (VSDK-303) for passive permission/device checks and
 * T7 (VSDK-304, folded into VSDK-303) for active microphone capture
 * and audio-level detection.
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
   * Full list of all available audio input devices, with label, deviceId,
   * and kind. Populated from enumerateDevices when permission is granted
   * (labels accessible). Undefined when device enumeration is not available.
   *
   * This gives callers the complete device list so they can show the
   * user all microphones and let them choose — not just a count.
   */
  devices?: PreCallAudioDevice[];
  /**
   * Whether device labels are accessible (implies permission was granted).
   * When false, device labels may be empty strings.
   * Undefined when device enumeration is not available.
   */
  labelsAccessible?: boolean;
  /**
   * Whether active microphone capture was performed.
   * Undefined when activeCapture is disabled or the module is skipped.
   */
  activeCapturePerformed?: boolean;
  /**
   * Peak RMS audio level observed during the sample window (0–1).
   * Undefined when activeCapture is disabled or capture failed.
   */
  audioLevel?: number;
  /**
   * Structured audio-level statistics from the sample window: peak,
   * average, and sample count. More detailed than `audioLevel` (which
   * is the peak only). Undefined when activeCapture is disabled or
   * capture failed.
   */
  audioLevelStats?: PreCallMicrophoneAudioLevelStats;
  /**
   * Whether audio energy above the silence threshold was detected.
   * Undefined when activeCapture is disabled or capture failed.
   */
  audioDetected?: boolean;
  /**
   * Structured capture error code, if active capture was requested but failed.
   * - 'permission_denied': getUserMedia was rejected (NotAllowedError, SecurityError).
   * - 'no_device': No microphone device found (NotFoundError, OverconstrainedError).
   * - 'not_supported': getUserMedia is not available in this environment.
   * - 'unknown': An unexpected error occurred during capture.
   */
  captureError?:
    | 'permission_denied'
    | 'no_device'
    | 'not_supported'
    | 'unknown';
  /** Human-readable description of the capture error, if any. */
  captureErrorMessage?: string;
  /**
   * Whether audio was recorded during the capture window.
   * Only set when `record: true` and capture succeeded.
   */
  recordingPerformed?: boolean;
  /**
   * Recording as a data URL (base64-encoded audio/webm). Only populated
   * when `record: true`, capture succeeded, and a MediaRecorder was
   * available. Callers can set this as an `<audio>` `src` to play it
   * back to the user.
   */
  recordingDataUrl?: string;
  /**
   * MIME type of the recording (e.g. 'audio/webm;codecs=opus').
   */
  recordingMimeType?: string;
  /**
   * Duration of the recording in milliseconds.
   */
  recordingDurationMs?: number;
  /**
   * A human-readable notice that audio is being recorded, for display to
   * the user BEFORE/DURING capture. Populated when `record: true` is set
   * so the caller can warn the user that their voice will be recorded
   * (VSDK-412 Review 18, point 2: "there is no warning that we will record
   * them"). The caller should surface this string in the UI before
   * calling `runMicrophoneCheck()`.
   */
  recordingNotice?: string;
  /**
   * Whether the recording was played back to the user through the
   * speakers after capture. Only set when `playback: true` and
   * `record: true` and playback succeeded.
   */
  playbackPerformed?: boolean;
  /**
   * Reason codes for any issues found, suitable for verdict/reason module input.
   * E.g. 'microphone_permission_denied', 'microphone_no_device',
   * 'microphone_capture_permission_denied', 'microphone_silent'.
   */
  reasons?: PreCallDiagnosticReason[];
}

/**
 * A non-fatal warning entry in the diagnostic report.
 *
 * Warnings describe degraded-but-functional signals (e.g. high jitter while
 * the call still works, only-host ICE candidates while connectivity
 * succeeded) that should be surfaced to the caller WITHOUT flipping the
 * overall verdict. They are separate from `reasons[]` (which drive the
 * verdict) and never cause the verdict to degrade to `'poor'` or
 * `'failed'` on their own.
 */
export interface PreCallDiagnosticWarning {
  /** Machine-readable warning code (e.g., 'ice_only_host_candidates', 'network_high_jitter'). */
  code: string;
  /** Human-readable description of the warning. */
  message: string;
  /** Which module produced this warning (e.g., 'ice', 'network', 'media', 'microphone'). */
  source: string;
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
  /**
   * Non-fatal warnings — degraded-but-functional signals that do NOT
   * flip the verdict. Separate from `reasons[]` (which drive the verdict).
   * Surfaced so callers can present advisory information without the
   * verdict degrading to `'blocked'`/`'degraded'` for conditions that
   * still allow a call to succeed.
   */
  warnings?: PreCallDiagnosticWarning[];
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
  /**
   * The diagnostic call's internal ID, when a call was placed (`'full'`
   * mode). Omitted for `'network-only'` and `'microphone-only'` modes
   * (no call is made). Useful for correlating the diagnostic with
   * downstream call reports.
   */
  callId?: string;
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
