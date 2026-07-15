/**
 * PreCallDiagnostic module — public exports.
 *
 * This barrel file re-exports the main class and types for convenient
 * importing. The existing PreCallDiagnosis is NOT affected.
 */

export { PreCallDiagnostic } from './PreCallDiagnostic';
export type {
  PreCallDiagnosticOptions,
  PreCallDiagnosticReport,
  PreCallDiagnosticRunner,
  PreCallDiagnosticReason,
  PreCallTimingsReport,
  PreCallEstablishmentTimings,
  PreCallEstablishmentStep,
  PreCallIceReport,
  PreCallIceCandidateCounts,
  PreCallIceCandidateInfo,
  PreCallIceSelectedPairReport,
  PreCallIceOptions,
  PreCallNetworkReport,
  PreCallNetworkOptions,
  NetworkAudioDirection,
  PreCallMicrophoneReport,
  PreCallMicrophoneOptions,
  PreCallServerTestReport,
  NetworkMinMaxAverage,
  NetworkPacketCounters,
  NetworkByteCounters,
  NetworkBitrate,
  MicrophonePermissionState,
} from './types';
export type { Call } from './types';
export type { PreCallDiagnosticContext } from './context';
export {
  IceReasonCode,
  NetworkReasonCode,
  MicrophoneReasonCode,
} from './modules/verdict';
export type {
  IceReasonCodeValue,
  NetworkReasonCodeValue,
  MicrophoneReasonCodeValue,
} from './modules/verdict';
export { createTimingsCollector, TimingsCollector } from './modules/timings';
export type { TimingsCallLike, TimingsBuildOptions } from './modules/timings';
export { MICROPHONE_RECORDING_NOTICE } from './modules/microphone';
