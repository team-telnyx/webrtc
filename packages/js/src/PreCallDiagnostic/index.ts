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
  PreCallIceReport,
  PreCallIceCandidateCounts,
  PreCallIceCandidateInfo,
  PreCallIceSelectedPairReport,
  PreCallIceOptions,
  PreCallNetworkReport,
  PreCallNetworkOptions,
  PreCallMediaReport,
  PreCallMediaOptions,
  MediaAudioDirection,
  MediaRtpDetails,
  PreCallMicrophoneReport,
  PreCallMicrophoneOptions,
  NetworkMinMaxAverage,
  NetworkPacketCounters,
  NetworkByteCounters,
  NetworkBitrate,
  MicrophonePermissionState,
} from './types';
export type { Call } from './types';
export type {
  PreCallDiagnosticContext,
} from './context';
export {
  IceReasonCode,
  NetworkReasonCode,
  MediaReasonCode,
  MicrophoneReasonCode,
} from './modules/verdict';
export type {
  IceReasonCodeValue,
  NetworkReasonCodeValue,
  MediaReasonCodeValue,
  MicrophoneReasonCodeValue,
} from './modules/verdict';
export { createTimingsCollector, TimingsCollector } from './modules/timings';
export type { TimingsCallLike, TimingsBuildOptions } from './modules/timings';
