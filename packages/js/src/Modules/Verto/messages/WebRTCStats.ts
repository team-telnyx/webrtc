import BaseMessage from './BaseMessage';

const DEBUG_REPORT_VERSION = 1;

export class DebugReportStartMessage extends BaseMessage {
  constructor(id: string) {
    super();
    this.buildRequest({
      type: 'debug_report_start',
      debug_report_id: id,
      debug_report_version: DEBUG_REPORT_VERSION,
    });
  }
}

export class DebugReportStopMessage extends BaseMessage {
  constructor(id: string) {
    super();
    this.buildRequest({
      type: 'debug_report_stop',
      debug_report_id: id,
      debug_report_version: DEBUG_REPORT_VERSION,
    });
  }
}

export class DebugReportDataMessage extends BaseMessage {
  constructor(id: string, data: any) {
    super();
    this.buildRequest({
      type: 'debug_report_data',
      debug_report_id: id,
      debug_report_version: DEBUG_REPORT_VERSION,
      debug_report_data: data,
    });
  }
}
