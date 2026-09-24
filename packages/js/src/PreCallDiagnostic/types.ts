import type Call from '../Modules/Verto/webrtc/Call';
import type { TelnyxRTC } from '../TelnyxRTC';

/**
 * Interface representing the statistics of an RTC ICE candidate.
 * @inline
 */
export interface RTCIceCandidateStats {
  /**
   * The address of the ICE candidate.
   */
  address: RTCIceCandidate['address'];
  /**
   * The type of the ICE candidate.
   */
  candidateType: RTCIceCandidate['type'];
  /**
   * Indicates whether the ICE candidate has been deleted.
   */
  deleted: boolean;
  /**
   * The unique identifier for the ICE candidate.
   */
  id: string;
  /**
   * The port number of the ICE candidate.
   */
  port: RTCIceCandidate['port'];
  /**
   * The priority of the ICE candidate.
   */
  priority: RTCIceCandidate['priority'];
  /**
   * The protocol used by the ICE candidate.
   */
  protocol: RTCIceCandidate['protocol'] | 'tls';
  /**
   * The timestamp when the ICE candidate was generated.
   */
  timestamp: DOMHighResTimeStamp;
  /**
   * The transport identifier for the ICE candidate.
   */
  transportId: string;
  /**
   * The type of the ICE candidate, either local or remote.
   */
  type: string;
  /**
   * The URL of the ICE candidate.
   */
  url: string;
  networkType: string;
}

export interface PreCallIceOptions {
  gatherCandidates?: boolean;
  gatherTimeoutMs?: number;
}

export interface PreCallNetworkOptions {
  enabled?: boolean;
}

export interface PreCallMicrophoneOptions {
  sampleDurationMs?: number;
  silenceThreshold?: number;
  record?: boolean;
  warnOnRecording?: (notice: string) => void;
}

/**
 * Options for a pre-call diagnostic run.
 */
export interface PreCallDiagnosticOptions {
  /** Client used for the diagnostic call. */
  client: TelnyxRTC;
  /** Destination to call for the test. */
  destinationNumber?: string;
  /** Caller ID name. */
  callerName?: string;
  /** Caller ID number. */
  callerNumber?: string;
  /** Audio capture constraints. */
  audio?: boolean | MediaStreamConstraints['audio'];
  /** Interval between statistics samples, in milliseconds. */
  statsSampleIntervalMs?: number;
  /** Network sampling duration, in milliseconds. */
  durationMs?: number;
  /** Whether to hang up the diagnostic call after testing. */
  autoHangup?: boolean;
  /** ICE checks and candidate gathering options. */
  ice?: boolean | PreCallIceOptions;
  /** Network checks to run. */
  network?: boolean | PreCallNetworkOptions;
  /** Microphone checks and optional recording settings. */
  microphone?: boolean | PreCallMicrophoneOptions;
  /** Which diagnostic checks to run. */
  mode?: 'full' | 'network-only' | 'microphone-only';
  /** Include diagnostic debugging data. */
  debug?: boolean;
  /** Peer connection configuration for the diagnostic call. */
  rtcConfig?: RTCConfiguration;
}

export interface PreCallDiagnosticReason {
  code: string;
  message: string;
  source: string;
}

export type PreCallDiagnosticWarning = PreCallDiagnosticReason;

export interface PreCallEstablishmentStep {
  label: string;
  fromStart: number;
  delta: number;
}

export interface PreCallEstablishmentTimings {
  mode: 'trickle' | 'non-trickle';
  direction: 'outbound' | 'inbound';
  steps: PreCallEstablishmentStep[];
}

/** Diagnostic duration and call-establishment timing measurements. */
export interface PreCallTimingsReport {
  /** Total diagnostic duration, including cleanup. */
  totalMs?: number;
  /** Total ICE candidate gathering duration, from gathering start to completion. */
  iceGatheringMs?: number;
  /** Time from ICE gathering start until the first server-derived candidate. */
  firstNonHostCandidateMs?: number;
  /** Unmodified call-establishment timeline collected by the SDK. */
  callEstablishment?: PreCallEstablishmentTimings;
}

export interface PreCallIceCandidateCounts {
  total: number;
  host: number;
  srflx: number;
  prflx: number;
  relay: number;
  unknown: number;
}

export interface PreCallIceCandidateInfo {
  id?: string;
  address?: string;
  port?: number;
  candidateType?: RTCIceCandidateType | string;
  protocol?: string;
  networkType?: string;
  url?: string;
}

export interface PreCallIceSelectedPairReport {
  id?: string;
  state?: string;
  nominated?: boolean;
  writable?: boolean;
  currentRoundTripTime?: number;
  localCandidateId?: string;
  remoteCandidateId?: string;
  local?: PreCallIceCandidateInfo;
  remote?: PreCallIceCandidateInfo;
}

export interface NominatedPair extends RTCIceCandidatePairStats {
  localCandidate?: RTCIceCandidateStats;
  remoteCandidate?: RTCIceCandidateStats;
}

/**
 * ICE candidates, selected pair and connectivity findings.
 */
export interface PreCallIceReport {
  /** Whether candidate gathering completed. */
  candidateGatheringCompleted?: boolean;
  /** Whether gathering completed for the test. */
  gatheringComplete?: boolean;
  /** Candidate counts grouped by type. */
  candidateCounts: Record<RTCIceCandidateType, number>;
  /** Gathered ICE candidate statistics. */
  candidates: RTCIceCandidateStats[];
  /** Whether a relay candidate was found. */
  hasRelayCandidate: boolean;
  /** Whether all candidates are host candidates. */
  onlyHostCandidates: boolean;
  /** Whether the test indicates TURN is required. */
  isTurnRequired?: boolean;
  /** Whether multiple network interfaces were detected. */
  hasMultipleNetworkInterfaces?: boolean;
  /** Whether the test detected a possible VPN. */
  vpnDetected?: boolean;
  /** Whether a candidate pair was selected. */
  hasSelectedPair: boolean;
  /** Selected pair and its local and remote candidates. */
  selectedPair?: NominatedPair;
  /** ICE gathering state at collection time. */
  iceGatheringState?: RTCIceGatheringState | string;
  /** ICE connection state at collection time. */
  iceConnectionState?: RTCIceConnectionState | string;
  /** Candidate results grouped by ICE server. */
  serverCandidateComparison?: PreCallIceServerComparisonEntry[];
}

export interface PreCallIceServerComparison {
  servers: PreCallIceServerComparisonEntry[];
  hasServerWithNoCandidates: boolean;
  appearsStrictNetwork: boolean;
}

export interface PreCallIceServerComparisonEntry {
  urls: string | string[];
  hasCandidates: boolean;
  candidateType: RTCIceCandidateType | null;
  candidates: RTCIceCandidateStats[];
  candidateCount: number;
}

export interface NetworkMinMaxAverage {
  min?: number;
  max?: number;
  average?: number;
}

export interface NetworkPacketCounters {
  packetsSent?: number;
  packetsReceived?: number;
  packetsLost?: number;
  packetLossFraction?: number;
}

export interface NetworkByteCounters {
  bytesSent?: number;
  bytesReceived?: number;
}

export interface NetworkBitrate {
  outbound?: number;
  inbound?: number;
}

export interface NetworkAudioDirection {
  flowing: boolean;
  packets?: number;
  bytes?: number;
  packetsDelta?: number;
  bytesDelta?: number;
}

/**
 * Network quality and audio-flow measurements.
 */
export interface PreCallNetworkReport {
  /** Network quality assessment. */
  quality?: 'good' | 'fair' | 'poor' | 'unknown';
  /** Round-trip time statistics. */
  rtt?: NetworkMinMaxAverage;
  /** Jitter statistics. */
  jitter?: NetworkMinMaxAverage;
  /** Packet counts and loss. */
  packets?: NetworkPacketCounters;
  /** Sent and received byte counts. */
  bytes?: NetworkByteCounters;
  /** Inbound and outbound bitrate. */
  bitrate?: NetworkBitrate;
  /** Received audio-flow measurements. */
  inbound?: NetworkAudioDirection;
  /** Sent audio-flow measurements. */
  outbound?: NetworkAudioDirection;
  /** Reasons supporting the network assessment. */
  reasons?: PreCallDiagnosticReason[];
}

export type MicrophonePermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unknown';

export interface PreCallAudioDevice {
  label: string;
  deviceId: string;
  kind: 'audioinput';
}

export interface PreCallMicrophoneAudioLevelStats {
  peak: number;
  average: number;
  samples: number;
}

/**
 * Microphone permissions, availability and optional capture results.
 */
export interface PreCallMicrophoneReport {
  /** Current microphone permission state. */
  currentPermissionState: MicrophonePermissionState;
  /** Whether microphone permission is granted. */
  isPermissionGrantedCurrently: boolean;
  /** Whether media capture failed. */
  isGetUserMediaFailed: boolean;
  /** Whether an audio input is available. */
  deviceAvailable: boolean;
  /** Number of audio inputs found. */
  deviceCount: number;
  /** Available audio inputs. */
  devices: PreCallAudioDevice[];
  /** Whether device labels are accessible. */
  labelsAccessible?: boolean;
  /** Whether microphone capture was attempted. */
  activeCapturePerformed?: boolean;
  /** Measured audio level. */
  audioLevel?: number;
  /** Audio-level summary statistics. */
  audioLevelStats?: PreCallMicrophoneAudioLevelStats;
  /** Whether audio was detected. */
  audioDetected?: boolean;
  /** Capture failure category. */
  captureError?:
    | 'permission_denied'
    | 'no_device'
    | 'not_supported'
    | 'unknown';
  /** Capture failure description. */
  captureErrorMessage?: string;
  /** Whether optional recording was performed. */
  recordingPerformed?: boolean;
  /** Recorded audio as a data URL, when requested. */
  recordingDataUrl?: string;
  /** Recorded audio MIME type. */
  recordingMimeType?: string;
  /** Recorded audio duration, in milliseconds. */
  recordingDurationMs?: number;
  /** Whether recorded audio playback was performed. */
  playbackPerformed?: boolean;
  /** Reasons supporting the microphone assessment. */
  reasons?: PreCallDiagnosticReason[];
}

export interface PreCallServerTestReport {
  server: RTCIceServer;
  /** Whether this isolated server test produced candidates and selected a pair. */
  established: boolean;
  callId?: string;
  ice?: PreCallIceReport;
  network?: PreCallNetworkReport;
  timings?: PreCallTimingsReport;
  error?: string;
}

/**
 * Results of a pre-call diagnostic run, including the enabled checks.
 */
export interface PreCallDiagnosticReport {
  /** Report format version. */
  version: 1;
  /** Overall diagnostic assessment. */
  verdict?:
    | 'ready'
    | 'degraded'
    | 'blocked'
    | 'permission_denied'
    | 'inconclusive';
  /** Reasons supporting the assessment. */
  reasons?: PreCallDiagnosticReason[];
  /** Warnings encountered during the checks. */
  warnings?: PreCallDiagnosticWarning[];
  /** Diagnostic and call-establishment timings. */
  timings?: PreCallTimingsReport;
  /** ICE connectivity results. */
  ice?: PreCallIceReport;
  /** Network quality results. */
  network?: PreCallNetworkReport;
  /** Microphone check results. */
  microphone?: PreCallMicrophoneReport;
  /** Results of isolated ICE server tests. */
  serverTests?: PreCallServerTestReport[];
  /** Diagnostic call identifier, if a call was created. */
  callId?: string;
  /** Raw statistics and samples, when included. */
  raw?: {
    stats?: RTCStatsReport | unknown;
    samples?: unknown[];
  };
}

export interface PreCallDiagnosticRunner {
  run(): Promise<PreCallDiagnosticReport>;
}

export type { Call };
