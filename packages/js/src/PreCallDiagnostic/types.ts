import type Call from '../Modules/Verto/webrtc/Call';
import type { RTCIceCandidateStats } from '../PreCallDiagnosis';
import type { TelnyxRTC } from '../TelnyxRTC';

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

export interface PreCallDiagnosticOptions {
  client: TelnyxRTC;
  destinationNumber?: string;
  callerName?: string;
  callerNumber?: string;
  audio?: boolean | MediaStreamConstraints['audio'];
  callSetupTimeoutMs?: number;
  statsSampleIntervalMs?: number;
  durationMs?: number;
  autoHangup?: boolean;
  ice?: boolean | PreCallIceOptions;
  network?: boolean | PreCallNetworkOptions;
  microphone?: boolean | PreCallMicrophoneOptions;
  mode?: 'full' | 'network-only' | 'microphone-only';
  debug?: boolean;
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
  relayProtocol?: string;
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

export interface PreCallIceReport {
  candidateGatheringCompleted?: boolean;
  gatheringComplete?: boolean;
  candidateCounts: Record<RTCIceCandidateType, number>;
  candidates: RTCIceCandidateStats[];
  hasRelayCandidate: boolean;
  onlyHostCandidates: boolean;
  isTurnRequired?: boolean;
  hasMultipleNetworkInterfaces?: boolean;
  vpnDetected?: boolean;
  hasSelectedPair: boolean;
  selectedPair?: NominatedPair;
  iceGatheringState?: RTCIceGatheringState | string;
  iceConnectionState?: RTCIceConnectionState | string;
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

export interface PreCallNetworkReport {
  quality?: 'good' | 'fair' | 'poor' | 'unknown';
  rtt?: NetworkMinMaxAverage;
  jitter?: NetworkMinMaxAverage;
  packets?: NetworkPacketCounters;
  bytes?: NetworkByteCounters;
  bitrate?: NetworkBitrate;
  inbound?: NetworkAudioDirection;
  outbound?: NetworkAudioDirection;
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

export interface PreCallMicrophoneReport {
  currentPermissionState: MicrophonePermissionState;
  isPermissionGrantedCurrently: boolean;
  isGetUserMediaFailed: boolean;
  deviceAvailable: boolean;
  deviceCount: number;
  devices: PreCallAudioDevice[];
  labelsAccessible?: boolean;
  activeCapturePerformed?: boolean;
  audioLevel?: number;
  audioLevelStats?: PreCallMicrophoneAudioLevelStats;
  audioDetected?: boolean;
  captureError?:
    | 'permission_denied'
    | 'no_device'
    | 'not_supported'
    | 'unknown';
  captureErrorMessage?: string;
  recordingPerformed?: boolean;
  recordingDataUrl?: string;
  recordingMimeType?: string;
  recordingDurationMs?: number;
  playbackPerformed?: boolean;
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

export interface PreCallDiagnosticReport {
  version: 1;
  verdict?:
    | 'ready'
    | 'degraded'
    | 'blocked'
    | 'permission_denied'
    | 'inconclusive';
  reasons?: PreCallDiagnosticReason[];
  warnings?: PreCallDiagnosticWarning[];
  timings?: PreCallTimingsReport;
  ice?: PreCallIceReport;
  network?: PreCallNetworkReport;
  microphone?: PreCallMicrophoneReport;
  serverTests?: PreCallServerTestReport[];
  callId?: string;
  raw?: {
    stats?: RTCStatsReport | unknown;
    samples?: unknown[];
  };
}

export interface PreCallDiagnosticRunner {
  run(): Promise<PreCallDiagnosticReport>;
}

export type { Call };
