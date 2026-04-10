import TelnyxRTC from './TelnyxRTC';
import {
  IClientOptions,
  ICallOptions,
  ICredentials,
  INotification,
} from './utils/interfaces';
import { SwEvent } from './Modules/Verto/util/constants';
import {
  NOTIFICATION_TYPE,
  ERROR_TYPE,
} from './Modules/Verto/webrtc/constants';
import Call from './Modules/Verto/webrtc/Call';

export {
  Call,
  TelnyxRTC,
  IClientOptions,
  ICallOptions,
  ICredentials,
  INotification,
  SwEvent,
  NOTIFICATION_TYPE,
  ERROR_TYPE,
};

export {
  SDK_ERRORS,
  SDK_WARNINGS,
  TelnyxError,
  createTelnyxError,
  createTelnyxWarning,
  isMediaRecoveryErrorEvent,
} from './Modules/Verto/util/errors';
export {
  TELNYX_ERROR_CODES,
  TELNYX_WARNING_CODES,
} from './Modules/Verto/util/constants/errorCodes';
export type {
  ITelnyxError,
  ITelnyxMediaError,
  ITelnyxErrorEvent,
  ITelnyxMediaRecoveryErrorEvent,
  ITelnyxStandardErrorEvent,
  TelnyxMediaErrorCode,
  SdkErrorCode,
  SdkWarningCode,
} from './Modules/Verto/util/errors';
export type {
  ITelnyxWarning,
  ITelnyxWarningEvent,
} from './Modules/Verto/util/constants/warnings';

export * from './PreCallDiagnosis';
