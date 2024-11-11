import { v4 as uuid } from 'uuid';
import { WebRTCStats } from '@peermetrics/webrtc-stats';
import {
  DebugReportDataMessage,
  DebugReportStartMessage,
  DebugReportStopMessage,
} from '../messages/WebRTCStats';

const POLL_INTERVAL = 1000;
export function saveToFile(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data)], {
    type: 'application/json',
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

export type WebRTCStatsReporter = {
  reportDataMessage: (data: any) => DebugReportDataMessage;
  start: () => DebugReportStartMessage;
  stop: () => DebugReportStopMessage;
  reportId: string;
  debuggerInstance: WebRTCStats;
};

export function webRTCStatsReporter(): WebRTCStatsReporter {
  const reportId = uuid();
  const start = () => {
    return new DebugReportStartMessage(reportId);
  };

  const stop = () => {
    return new DebugReportStopMessage(reportId);
  };

  const reportDataMessage = (data) =>
    new DebugReportDataMessage(reportId, data);
  const debuggerInstance = new WebRTCStats({
    getStatsInterval: POLL_INTERVAL,
    rawStats: false,
    statsObject: true,
    filteredStats: false,
    remote: true,
    wrapGetUserMedia: true,
    debug: false,
    logLevel: 'warn',
  });

  return {
    reportDataMessage,
    start,
    stop,
    reportId,
    debuggerInstance,
  };
}
