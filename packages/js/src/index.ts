import TelnyxRTC from './TelnyxRTC';
import {
  IClientOptions,
  ICallOptions,
  ICredentials,
  INotification,
} from './utils/interfaces';
import { SwEvent } from './Modules/Verto/util/constants';
import Call from './Modules/Verto/webrtc/Call';

export {
  Call,
  TelnyxRTC,
  IClientOptions,
  ICallOptions,
  ICredentials,
  INotification,
  SwEvent,
};

// Export custom error classes for advanced error handling
export {
  TelnyxError,
  TelnyxConfigError,
  TelnyxValidationError,
  TelnyxDeviceError,
  TelnyxNetworkError,
  TelnyxCallError,
} from './utils/TelnyxError';

export * from './PreCallDiagnosis';
