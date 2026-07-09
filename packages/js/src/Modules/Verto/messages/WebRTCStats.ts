import BaseMessage from './BaseMessage';
import { VertoMethod } from '../webrtc/constants';

const DEBUG_REPORT_VERSION = 1;

export class DebugReportStartMessage extends BaseMessage {
  constructor(id: string, callID: string) {
    super();
    this.buildRequest({
      type: 'debug_report_start',
      debug_report_id: id,
      debug_report_version: DEBUG_REPORT_VERSION,
      call_id: callID,
    });
  }
}

export class DebugReportStopMessage extends BaseMessage {
  constructor(id: string, callID: string) {
    super();
    this.buildRequest({
      type: 'debug_report_stop',
      debug_report_id: id,
      debug_report_version: DEBUG_REPORT_VERSION,
      call_id: callID,
    });
  }
}

export class DebugReportDataMessage extends BaseMessage {
  constructor(id: string, callID: string, data: unknown) {
    super();
    this.buildRequest({
      type: 'debug_report_data',
      debug_report_id: id,
      debug_report_version: DEBUG_REPORT_VERSION,
      call_id: callID,
      debug_report_data: data,
    });
  }
}

export class ClientErrorMessage extends BaseMessage {
  constructor(
    errorType: string,
    errorMessage: string,
    context?: Record<string, unknown>
  ) {
    super();
    this.buildRequest({
      method: VertoMethod.ClientError,
      params: {
        error_type: errorType,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
        ...context,
      },
    });
  }
}
