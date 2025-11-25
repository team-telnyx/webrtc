import { WebRTCStats } from '@peermetrics/webrtc-stats';
import { calculateMOS, getQuality } from '../../../utils/mos';
import { v4 as uuid } from 'uuid';
import BrowserSession from '../BrowserSession';
import {
  DebugReportDataMessage,
  DebugReportStartMessage,
  DebugReportStopMessage,
} from '../messages/WebRTCStats';
import { trigger } from '../services/Handler';
import { SwEvent } from './constants';

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
  start: (
    peerConnection: RTCPeerConnection,
    peerId: string,
    connectionId: string
  ) => Promise<void>;
  stop: (debugOutput: string) => Promise<void>;
};

export function createWebRTCStatsReporter(
  session: BrowserSession,
  callID: string
): WebRTCStatsReporter {
  const reportId = uuid();

  const stats = new WebRTCStats({
    getStatsInterval: POLL_INTERVAL,
    rawStats: false,
    statsObject: true,
    filteredStats: false,
    remote: true,
    debug: false,
    logLevel: 'warn',
  });

  const onTimelineMessage = async (message: any) => {
    if (message.event === 'stats') {
      trigger(SwEvent.StatsFrame, toRealtimeMetrics(message), session.uuid);
    }
    await session.execute(new DebugReportDataMessage(reportId, message));
  };

  const start = async (
    peerConnection: RTCPeerConnection,
    peerId: string,
    connectionId: string
  ) => {
    await session.execute(new DebugReportStartMessage(reportId, callID));
    stats.on('timeline', onTimelineMessage);
    await new Promise((resolve) => setTimeout(resolve, 500));

    stats.addConnection({
      pc: peerConnection,
      peerId,
      connectionId,
    });
  };

  const stop = async (debugOutput: string) => {
    const timeline = stats.getTimeline();
    trigger(SwEvent.StatsReport, timeline, session.uuid);
    if (debugOutput === 'file') {
      const filename = `webrtc-stats-${reportId}-${Date.now()}`;
      saveToFile(timeline, filename);
    }
    await session.execute(new DebugReportStopMessage(reportId, callID));
    stats.removeAllPeers();
    stats.destroy();
  };

  return {
    start,
    stop,
  };
}

function toRealtimeMetrics({ data }) {
  const { audio, remote } = data;
  const { audio: remoteAudio } = remote;
  const jitter = remoteAudio.inbound[0]?.jitter ?? Infinity;
  const rtt = remoteAudio.inbound[0]?.roundTripTime ?? Infinity;
  const packetsReceived = audio.inbound[0]?.packetsReceived ?? -1;
  const packetsLost = audio.inbound[0]?.packetsLost ?? -1;

  const mos = calculateMOS({
    jitter: jitter * 1000, // in ms
    rtt: rtt * 1000, // in ms
    packetsLost: packetsLost,
    packetsReceived: packetsReceived,
  });

  return {
    jitter,
    rtt,
    mos,
    quality: getQuality(mos),
    inboundAudio: audio.inbound[0],
    outboundAudio: audio.outbound[0],
    remoteInboundAudio: remoteAudio.inbound[0],
    remoteOutboundAudio: remoteAudio.outbound[0],
  };
}
