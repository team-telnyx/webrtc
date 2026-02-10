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
import logger from './logger';

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
export interface ConnectionStateDetails {
  connectionState: RTCPeerConnectionState;
  previousConnectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
  dtlsState?: RTCDtlsTransportState;
  dtlsCipher?: string;
  srtpCipher?: string;
  tlsVersion?: string;
  sctpState?: RTCSctpTransportState;
  localCandidateType?: string;
  remoteCandidateType?: string;
  candidatePairState?: RTCStatsIceCandidatePairState;
  selectedCandidatePair?: {
    local: {
      address: string;
      port: number;
      protocol: string;
      candidateType: string;
    };
    remote: {
      address: string;
      port: number;
      protocol: string;
      candidateType: string;
    };
  };
}

export async function getConnectionStateDetails(
  pc: RTCPeerConnection,
  previousConnectionState: RTCPeerConnectionState
): Promise<ConnectionStateDetails> {
  const details: ConnectionStateDetails = {
    connectionState: pc.connectionState,
    previousConnectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    signalingState: pc.signalingState,
  };

  // Get DTLS state from transceivers
  const transceivers = pc.getTransceivers();
  if (transceivers.length > 0) {
    const sender = transceivers[0].sender;
    const dtlsTransport = sender?.transport;
    if (dtlsTransport) {
      details.dtlsState = dtlsTransport.state;
    }
  }

  // Get SCTP state
  if (pc.sctp) {
    details.sctpState = pc.sctp.state;
  }

  // Get detailed stats including candidate pair and DTLS info
  try {
    const stats = await pc.getStats();
    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        details.candidatePairState = report.state;

        // Find local and remote candidates
        stats.forEach((candidateReport) => {
          if (
            candidateReport.type === 'local-candidate' &&
            candidateReport.id === report.localCandidateId
          ) {
            details.localCandidateType = candidateReport.candidateType;
            details.selectedCandidatePair = details.selectedCandidatePair || {
              local: {} as any,
              remote: {} as any,
            };
            details.selectedCandidatePair.local = {
              address: candidateReport.address,
              port: candidateReport.port,
              protocol: candidateReport.protocol,
              candidateType: candidateReport.candidateType,
            };
          }
          if (
            candidateReport.type === 'remote-candidate' &&
            candidateReport.id === report.remoteCandidateId
          ) {
            details.remoteCandidateType = candidateReport.candidateType;
            details.selectedCandidatePair = details.selectedCandidatePair || {
              local: {} as any,
              remote: {} as any,
            };
            details.selectedCandidatePair.remote = {
              address: candidateReport.address,
              port: candidateReport.port,
              protocol: candidateReport.protocol,
              candidateType: candidateReport.candidateType,
            };
          }
        });
      }

      // Get DTLS cipher info from transport stats
      if (report.type === 'transport') {
        details.dtlsCipher = report.dtlsCipher;
        details.srtpCipher = report.srtpCipher;
        details.tlsVersion = report.tlsVersion;
        if (report.dtlsState) {
          details.dtlsState = report.dtlsState;
        }
      }
    });
  } catch (e) {
    logger.error('Error gathering connection state details:', e);
  }

  return details;
}

export interface IceCandidateErrorDetails {
  errorCode: number;
  errorText: string;
  url: string;
  address: string | null;
  port: number | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
  localDescriptionType?: RTCSdpType;
  remoteDescriptionType?: RTCSdpType;
}

export function getIceCandidateErrorDetails(
  event: RTCPeerConnectionIceErrorEvent,
  pc: RTCPeerConnection
): IceCandidateErrorDetails {
  return {
    errorCode: event.errorCode,
    errorText: event.errorText,
    url: event.url,
    address: event.address,
    port: event.port,
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    signalingState: pc.signalingState,
    localDescriptionType: pc.localDescription?.type,
    remoteDescriptionType: pc.remoteDescription?.type,
  };
}

export type WebRTCStatsReporter = {
  isRunning: boolean;
  start: (
    peerConnection: RTCPeerConnection,
    peerId: string,
    connectionId: string
  ) => Promise<void>;
  stop: (debugOutput: string) => Promise<void>;
  reportConnectionStateChange: (details: ConnectionStateDetails) => void;
  reportIceCandidateError: (details: IceCandidateErrorDetails) => void;
};

export function createWebRTCStatsReporter(
  session: BrowserSession,
  callID: string
): WebRTCStatsReporter {
  const reportId = uuid();
  let isRunning = false;

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
    if (isRunning) {
      logger.debug(
        `[${callID}] Stats reporter already running, skipping start`
      );
      return;
    }

    await session.execute(new DebugReportStartMessage(reportId, callID));
    stats.on('timeline', onTimelineMessage);

    try {
      await stats.addConnection({
        pc: peerConnection,
        peerId,
        connectionId,
      });
      isRunning = true;
    } catch (error) {
      logger.error(`[${callID}] Failed to start stats reporter:`, error);
      stats.removeAllPeers();
      stats.destroy();
    }
  };

  const stop = async (debugOutput: string) => {
    // Emit final report
    const timeline = stats.getTimeline();
    trigger(SwEvent.StatsReport, timeline, session.uuid);
    if (debugOutput === 'file') {
      const filename = `webrtc-stats-${reportId}-${Date.now()}`;
      saveToFile(timeline, filename);
    }

    await session.execute(new DebugReportStopMessage(reportId, callID));

    stats.removeAllPeers();
    stats.destroy();
    isRunning = false;
  };

  const reportConnectionStateChange = (details: ConnectionStateDetails) => {
    const message = {
      event: 'connectionstatechange-detailed',
      tag: 'connection',
      timestamp: new Date().toISOString(),
      data: details,
    };
    onTimelineMessage(message);
  };

  const reportIceCandidateError = (details: IceCandidateErrorDetails) => {
    const message = {
      event: 'icecandidateerror-detailed',
      tag: 'connection',
      timestamp: new Date().toISOString(),
      data: details,
    };
    onTimelineMessage(message);
  };

  return {
    get isRunning() {
      return isRunning;
    },
    start,
    stop,
    reportConnectionStateChange,
    reportIceCandidateError,
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
