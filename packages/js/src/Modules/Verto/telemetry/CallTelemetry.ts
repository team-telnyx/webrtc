/**
 * Call Report V2: the call-scoped events of one call object (contract 1.4, 1.5).
 *
 * call_started, call_state, ice_candidate, call_media_changed, call_metrics,
 * call_warning, call_timings, call_ended and call/media errors.
 *
 * Created by BaseCall only when session.telemetry is set. Every public method
 * swallows its own errors: telemetry never throws into the SDK.
 */
import type TelemetryClient from './TelemetryClient';
import {
  WARNING_CODES,
  type B2buaRtc,
  type CallEndReason,
  type CallEndedPayload,
  type CallMediaChangedPayload,
  type CallMetricsPayload,
  type CallStartedPayload,
  type CallState,
  type CallStatePayload,
  type CallTimingsPayload,
  type CallTotals,
  type Codec,
  type EventBody,
  type EventName,
  type IceCandidate,
  type IceCandidatePayload,
  type InputDevice,
  type KnownIds,
  type MediaChange,
} from './contract';
import { stripDeviceLabel, toCodedErrorInfo } from './sanitize';
import {
  observeCallMarks,
  readCallMarks,
} from '../webrtc/CallEstablishmentTimings';
import type { IVertoCallOptions } from '../webrtc/interfaces';

/** What CallTelemetry needs from the telemetry client. */
export type CallTelemetrySink = Pick<
  TelemetryClient,
  'emit' | 'callStarted' | 'callEnded' | 'metricsIntervalMs'
>;

/** What CallTelemetry reads from the call. */
export interface ICallTelemetryCall {
  id: string;
  options: IVertoCallOptions;
  cause?: string;
  causeCode?: number;
  sipCode?: number;
  sipReason?: string;
}

/** What CallTelemetry reads from the session. Everything is optional: read defensively. */
export interface ICallTelemetrySession {
  telemetry?: CallTelemetrySink | null;
  region?: string | null;
  dc?: string | null;
  options?: {
    iceServers?: RTCIceServer[];
    keepConnectionAliveOnSocketClose?: boolean;
  };
}

/** Details the quality detector may give with a warning. */
export interface ICallWarningDetails {
  metric?: string;
  value?: number;
  threshold?: number;
}

const FINAL_STATS_TIMEOUT_MS = 1000;

const TERMINAL_STATES = ['hangup', 'destroy', 'purge'];

const nowPerf = (): number =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

const round = (value: number, decimals = 0): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * B2BUA-RTC names. VSP sends them in the signaling login result (one VSP
 * socket maps to one B2BUA-RTC); the session keeps them as session.b2buaRtc.
 * The only place that knows where they live.
 */
export function readB2buaRtc(session: unknown): B2buaRtc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const source = (session as any)?.b2buaRtc ?? {};
  const result: B2buaRtc = {};
  const node = str(source.b2bua_rtc_node);
  const region = str(source.b2bua_rtc_region);
  const dc = str(source.b2bua_rtc_dc);
  if (node) result.b2bua_rtc_node = node;
  if (region) result.b2bua_rtc_region = region;
  if (dc) result.b2bua_rtc_dc = dc;
  return result;
}

/** The signaling VSP's names: session.signalingVsp, else session.region / session.dc. */
export function readSignalingVsp(session: unknown): {
  signaling_region?: string;
  signaling_dc?: string;
  signaling_node?: string;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = session as any;
  const vsp = s?.signalingVsp ?? {};
  const result: {
    signaling_region?: string;
    signaling_dc?: string;
    signaling_node?: string;
  } = {};
  const region = str(vsp.signaling_region) ?? str(s?.region);
  const dc = str(vsp.signaling_dc) ?? str(s?.dc);
  const node = str(vsp.signaling_node);
  if (region) result.signaling_region = region;
  if (dc) result.signaling_dc = dc;
  if (node) result.signaling_node = node;
  return result;
}

// ─── ICE candidates ──────────────────────────────────────────────────────

const CANDIDATE_TYPES = ['host', 'srflx', 'prflx', 'relay'];
const TCP_TYPES = ['active', 'passive', 'so'];
const RELAY_PROTOCOLS = ['udp', 'tcp', 'tls'];
const NETWORK_TYPES = ['ethernet', 'wifi', 'cellular', 'vpn', 'unknown'];

export type ParsedCandidate = IceCandidate & {
  component: 'rtp' | 'rtcp';
  ufrag?: string;
};

/**
 * Parses an ICE candidate line ("candidate:..." with or without "a=").
 * The ufrag is returned for generation tracking only: it is never sent.
 */
export function parseCandidateLine(line: string): ParsedCandidate | null {
  if (!line) return null;
  const text = line
    .trim()
    .replace(/^a=/, '')
    .replace(/^candidate:/, '');
  const parts = text.split(/\s+/);
  if (parts.length < 8) return null;
  const [foundation, component, protocol, priority, address, port] = parts;
  const extras: Record<string, string> = {};
  for (let i = 6; i + 1 < parts.length; i += 2) {
    extras[parts[i]] = parts[i + 1];
  }
  const type = extras.typ;
  const proto = protocol.toLowerCase();
  if (!CANDIDATE_TYPES.includes(type) || (proto !== 'udp' && proto !== 'tcp')) {
    return null;
  }
  const candidate: ParsedCandidate = {
    candidate_type: type as IceCandidate['candidate_type'],
    protocol: proto as IceCandidate['protocol'],
    component: component === '2' ? 'rtcp' : 'rtp',
  };
  if (foundation) candidate.foundation = foundation;
  const prio = Number(priority);
  if (Number.isFinite(prio)) candidate.priority = prio;
  if (address) candidate.address = address;
  const portNumber = Number(port);
  if (Number.isFinite(portNumber)) candidate.port = portNumber;
  // raddr/rport (related_address / related_port) are not sent: not needed
  // (owner, 2026-10-06). The raw candidate line in the logs still has them.
  if (extras.tcptype && TCP_TYPES.includes(extras.tcptype)) {
    candidate.tcp_type = extras.tcptype as IceCandidate['tcp_type'];
  }
  if (extras.ufrag) candidate.ufrag = extras.ufrag;
  return candidate;
}

/** One side of the selected pair, from a local-candidate / remote-candidate stats report. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function candidateFromStats(report: any): IceCandidate | undefined {
  if (!report) return undefined;
  const type = report.candidateType;
  const protocol = String(report.protocol || '').toLowerCase();
  if (
    !CANDIDATE_TYPES.includes(type) ||
    (protocol !== 'udp' && protocol !== 'tcp')
  ) {
    return undefined;
  }
  const candidate: IceCandidate = {
    candidate_type: type,
    protocol: protocol as IceCandidate['protocol'],
  };
  const relayProtocol = String(report.relayProtocol || '').toLowerCase();
  if (RELAY_PROTOCOLS.includes(relayProtocol)) {
    candidate.relay_protocol = relayProtocol as IceCandidate['relay_protocol'];
  }
  if (NETWORK_TYPES.includes(report.networkType)) {
    candidate.network_type = report.networkType;
  }
  if (str(report.foundation)) candidate.foundation = report.foundation;
  if (num(report.priority) !== undefined) candidate.priority = report.priority;
  if (TCP_TYPES.includes(report.tcpType)) candidate.tcp_type = report.tcpType;
  const address = str(report.address) ?? str(report.ip);
  if (address) candidate.address = address;
  if (num(report.port) !== undefined) candidate.port = report.port;
  if (str(report.url)) candidate.url = report.url;
  return candidate;
}

// ─── getStats() snapshot ─────────────────────────────────────────────────

/** One getStats() result, reduced to what call_metrics and call_media_changed need. */
export type StatsSnapshot = {
  /** Raw numbers by "<report>.<field>": cumulative counters and raw gauges. */
  n: Record<string, number>;
  pairId?: string;
  iceState?: CallMediaChangedPayload['ice_state'];
  dtlsState?: CallMediaChangedPayload['dtls_state'];
  srtpCipher?: string;
  dtlsVersion?: string;
  pairChanges?: number;
  localCandidate?: IceCandidate;
  remoteCandidate?: IceCandidate;
  codecIn?: Codec;
  codecOut?: Codec;
  targetBitrate?: number;
  sending?: boolean;
  echoReturnLoss?: number;
  echoReturnLossEnhancement?: number;
};

const FIELDS: Record<string, string[]> = {
  in: [
    'packetsReceived',
    'bytesReceived',
    'packetsLost',
    'packetsDiscarded',
    'fecPacketsReceived',
    'totalSamplesReceived',
    'concealedSamples',
    'concealmentEvents',
    'jitter',
    'jitterBufferDelay',
    'jitterBufferEmittedCount',
    'jitterBufferTargetDelay',
    'totalAudioEnergy',
    'totalSamplesDuration',
    'audioLevel',
  ],
  play: [
    'totalSamplesCount',
    'synthesizedSamplesDuration',
    'totalPlayoutDelay',
  ],
  out: [
    'packetsSent',
    'bytesSent',
    'retransmittedPacketsSent',
    'nackCount',
    'totalPacketSendDelay',
  ],
  src: ['totalAudioEnergy', 'totalSamplesDuration', 'audioLevel'],
  rin: [
    'roundTripTime',
    'jitter',
    'packetsLost',
    'totalRoundTripTime',
    'roundTripTimeMeasurements',
  ],
  rout: ['packetsSent'],
  pair: [
    'currentRoundTripTime',
    'totalRoundTripTime',
    'requestsSent',
    'responsesReceived',
  ],
};

const ICE_STATES = [
  'new',
  'checking',
  'connected',
  'completed',
  'disconnected',
  'failed',
  'closed',
];
const DTLS_STATES = ['new', 'connecting', 'connected', 'closed', 'failed'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAudio = (report: any) => (report.kind ?? report.mediaType) === 'audio';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function codecFromStats(report: any): Codec | undefined {
  if (!report || !str(report.mimeType)) return undefined;
  const codec: Codec = {
    mime_type: report.mimeType,
    clock_rate: num(report.clockRate) ?? 0,
    channels: num(report.channels) ?? 1,
    payload_type: num(report.payloadType) ?? -1,
  };
  if (str(report.sdpFmtpLine)) codec.sdp_fmtp_line = report.sdpFmtpLine;
  return codec;
}

/** Reduces a getStats() report (an RTCStatsReport or any Map-like of reports). */
export function extractStats(report: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forEach(callback: (value: any) => void): void;
}): StatsSnapshot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId: Record<string, any> = {};
  report.forEach((stat) => {
    if (!stat || typeof stat !== 'object') return;
    all.push(stat);
    if (stat.id) byId[stat.id] = stat;
  });
  const find = (type: string, audioOnly = true) =>
    all.find((s) => s.type === type && (!audioOnly || isAudio(s)));

  const transport =
    all.find((s) => s.type === 'transport' && s.selectedCandidatePairId) ??
    all.find((s) => s.type === 'transport');
  const pair =
    (transport?.selectedCandidatePairId &&
      byId[transport.selectedCandidatePairId]) ??
    all.find((s) => s.type === 'candidate-pair' && s.selected === true) ??
    all.find(
      (s) =>
        s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded'
    );
  const sources = {
    in: find('inbound-rtp'),
    play: find('media-playout', false),
    out: find('outbound-rtp'),
    src: find('media-source'),
    rin: find('remote-inbound-rtp'),
    rout: find('remote-outbound-rtp'),
    pair,
  };

  const snapshot: StatsSnapshot = { n: {} };
  for (const [prefix, fields] of Object.entries(FIELDS)) {
    const source = sources[prefix as keyof typeof sources];
    if (!source) continue;
    for (const field of fields) {
      const value = num(source[field]);
      if (value !== undefined) snapshot.n[`${prefix}.${field}`] = value;
    }
  }

  if (pair) {
    snapshot.pairId = pair.id;
    snapshot.localCandidate = candidateFromStats(byId[pair.localCandidateId]);
    snapshot.remoteCandidate = candidateFromStats(byId[pair.remoteCandidateId]);
  }
  if (transport) {
    if (ICE_STATES.includes(transport.iceState)) {
      snapshot.iceState = transport.iceState;
    }
    if (DTLS_STATES.includes(transport.dtlsState)) {
      snapshot.dtlsState = transport.dtlsState;
    }
    if (str(transport.srtpCipher)) snapshot.srtpCipher = transport.srtpCipher;
    if (str(transport.tlsVersion)) snapshot.dtlsVersion = transport.tlsVersion;
    if (num(transport.selectedCandidatePairChanges) !== undefined) {
      snapshot.pairChanges = transport.selectedCandidatePairChanges;
    }
  }
  if (sources.in) snapshot.codecIn = codecFromStats(byId[sources.in.codecId]);
  if (sources.out) {
    snapshot.codecOut = codecFromStats(byId[sources.out.codecId]);
    if (num(sources.out.targetBitrate) !== undefined) {
      snapshot.targetBitrate = sources.out.targetBitrate;
    }
    if (typeof sources.out.active === 'boolean') {
      snapshot.sending = sources.out.active;
    }
  }
  if (sources.src) {
    if (num(sources.src.echoReturnLoss) !== undefined) {
      snapshot.echoReturnLoss = round(sources.src.echoReturnLoss, 2);
    }
    if (num(sources.src.echoReturnLossEnhancement) !== undefined) {
      snapshot.echoReturnLossEnhancement = round(
        sources.src.echoReturnLossEnhancement,
        2
      );
    }
  }
  return snapshot;
}

// ─── call_metrics ────────────────────────────────────────────────────────

type MetricKey = Exclude<keyof CallMetricsPayload, 'counters_reset'>;

/** Counters sent as per-interval deltas; a delta of 0 is omitted. */
const COUNTERS: Array<[MetricKey, string]> = [
  ['in_packets', 'in.packetsReceived'],
  ['in_bytes', 'in.bytesReceived'],
  ['in_lost', 'in.packetsLost'],
  ['in_discarded', 'in.packetsDiscarded'],
  ['in_fec_packets', 'in.fecPacketsReceived'],
  ['in_samples', 'in.totalSamplesReceived'],
  ['in_concealed_samples', 'in.concealedSamples'],
  ['in_concealment_events', 'in.concealmentEvents'],
  ['out_packets', 'out.packetsSent'],
  ['out_bytes', 'out.bytesSent'],
  ['out_retransmitted_packets', 'out.retransmittedPacketsSent'],
  ['out_nacks', 'out.nackCount'],
  ['remote_lost', 'rin.packetsLost'],
  ['remote_sent_packets', 'rout.packetsSent'],
  ['ice_requests', 'pair.requestsSent'],
  ['ice_responses', 'pair.responsesReceived'],
];

/**
 * One call_metrics payload from two snapshots (contract 1.5).
 * prev = null: the first interval, or the first after the peer connection was
 * replaced; counters then count from 0.
 */
export function buildMetrics(
  prev: StatsSnapshot | null,
  cur: StatsSnapshot,
  intervalMs: number,
  countersReset = false
): CallMetricsPayload {
  const metrics: CallMetricsPayload = {
    interval_ms: Math.max(0, Math.round(intervalMs)),
  };
  const c = cur.n;
  const samePair = !!prev && prev.pairId === cur.pairId;
  const delta = (key: string): number | undefined => {
    const value = c[key];
    if (value === undefined) return undefined;
    if (key.startsWith('pair.') && !samePair) return value;
    const base = prev?.n[key];
    if (base === undefined) return value;
    return Math.max(0, value - base);
  };
  const set = (key: MetricKey, value: number | undefined) => {
    if (value !== undefined && Number.isFinite(value)) {
      (metrics as unknown as Record<string, number>)[key] = value;
    }
  };
  const ratio = (
    top: string,
    bottom: string,
    scale: number,
    decimals: number
  ) => {
    const t = delta(top);
    const b = delta(bottom);
    return t !== undefined && b !== undefined && b > 0
      ? round((t / b) * scale, decimals)
      : undefined;
  };
  const level = (prefix: string) => {
    const energy = delta(`${prefix}.totalAudioEnergy`);
    const duration = delta(`${prefix}.totalSamplesDuration`);
    if (energy !== undefined && duration !== undefined && duration > 0) {
      return round(Math.sqrt(Math.max(0, energy) / duration), 4);
    }
    const audioLevel = c[`${prefix}.audioLevel`];
    return audioLevel !== undefined ? round(audioLevel, 4) : undefined;
  };
  const gauge = (key: string, scale: number, decimals: number) =>
    c[key] !== undefined ? round(c[key] * scale, decimals) : undefined;

  // Network (gauges)
  set('rtt_ms', gauge('pair.currentRoundTripTime', 1000, 0));
  set('rtcp_rtt_ms', gauge('rin.roundTripTime', 1000, 0));
  set('jitter_ms', gauge('in.jitter', 1000, 1));
  set('remote_jitter_ms', gauge('rin.jitter', 1000, 1));

  // Counters: a delta of 0 is omitted
  for (const [name, key] of COUNTERS) {
    const value = delta(key);
    if (value) set(name, Math.round(value));
  }

  // Playout: sent even when 0, whenever the stat exists
  const played = delta('play.totalSamplesCount');
  if (played !== undefined) set('played_samples', Math.round(played));
  const synthesized = delta('play.synthesizedSamplesDuration');
  if (synthesized !== undefined)
    set('synthesized_ms', Math.round(synthesized * 1000));

  // Derived gauges: omitted when not measured in this interval
  set(
    'jitter_buffer_ms',
    ratio('in.jitterBufferDelay', 'in.jitterBufferEmittedCount', 1000, 1)
  );
  set(
    'jitter_buffer_target_ms',
    ratio('in.jitterBufferTargetDelay', 'in.jitterBufferEmittedCount', 1000, 1)
  );
  set(
    'playout_delay_ms',
    ratio('play.totalPlayoutDelay', 'play.totalSamplesCount', 1000, 1)
  );
  set('in_level', level('in'));
  set(
    'out_send_delay_ms',
    ratio('out.totalPacketSendDelay', 'out.packetsSent', 1000, 1)
  );
  set('out_level', level('src'));

  if (countersReset) metrics.counters_reset = true;
  return metrics;
}

/** Keys summed across replaced peer connections for call_ended.totals. */
const TOTAL_KEYS = [
  'in.packetsReceived',
  'in.bytesReceived',
  'in.packetsLost',
  'in.packetsDiscarded',
  'in.totalSamplesReceived',
  'in.concealedSamples',
  'in.concealmentEvents',
  'out.packetsSent',
  'out.bytesSent',
  'out.retransmittedPacketsSent',
  'out.nackCount',
  'rin.packetsLost',
];

/**
 * call_ended.totals from the final cumulative counters.
 * carried = counters of peer connections the call replaced; rttSamples = rtt_ms seen.
 */
export function buildTotals(
  last: StatsSnapshot | null,
  carried: Record<string, number> = {},
  rttSamples: number[] = [],
  observedPairChanges = 0
): CallTotals {
  const n = last?.n ?? {};
  const total = (key: string): number | undefined => {
    const value = n[key];
    const before = carried[key];
    if (value === undefined && before === undefined) return undefined;
    return Math.round((value ?? 0) + (before ?? 0));
  };
  const totals: CallTotals = {
    in_packets: total('in.packetsReceived') ?? 0,
    in_bytes: total('in.bytesReceived') ?? 0,
    in_lost: Math.max(0, total('in.packetsLost') ?? 0),
    in_discarded: total('in.packetsDiscarded') ?? 0,
    out_packets: total('out.packetsSent') ?? 0,
    out_bytes: total('out.bytesSent') ?? 0,
    pair_changes: last?.pairChanges ?? observedPairChanges,
  };
  const optional: Array<[keyof CallTotals, string]> = [
    ['in_samples', 'in.totalSamplesReceived'],
    ['in_concealed_samples', 'in.concealedSamples'],
    ['in_concealment_events', 'in.concealmentEvents'],
    ['out_retransmitted_packets', 'out.retransmittedPacketsSent'],
    ['out_nacks', 'out.nackCount'],
    ['remote_lost', 'rin.packetsLost'],
  ];
  for (const [name, key] of optional) {
    const value = total(key);
    if (value !== undefined) (totals as Record<string, number>)[name] = value;
  }

  const responses = n['pair.responsesReceived'];
  const totalRtt = n['pair.totalRoundTripTime'];
  if (totalRtt !== undefined && responses) {
    totals.rtt_avg_ms = round((totalRtt / responses) * 1000);
  } else if (rttSamples.length) {
    totals.rtt_avg_ms = round(
      rttSamples.reduce((sum, value) => sum + value, 0) / rttSamples.length
    );
  }
  const rtts = [...rttSamples];
  if (n['pair.currentRoundTripTime'] !== undefined) {
    rtts.push(round(n['pair.currentRoundTripTime'] * 1000));
  }
  if (rtts.length) totals.rtt_max_ms = Math.max(...rtts);
  const measurements = n['rin.roundTripTimeMeasurements'];
  if (n['rin.totalRoundTripTime'] !== undefined && measurements) {
    totals.rtcp_rtt_avg_ms = round(
      (n['rin.totalRoundTripTime'] / measurements) * 1000
    );
  }
  return totals;
}

// ─── call_timings ────────────────────────────────────────────────────────

/** performance mark suffix -> call_timings field. */
const TIMING_MARKS: Array<[string, keyof CallTimingsPayload]> = [
  ['answer-called', 'answer_called_ms'],
  ['new-peer', 'peer_created_ms'],
  ['get-user-media', 'media_devices_acquired_ms'],
  ['peer-creation-end', 'peer_setup_complete_ms'],
  ['start-negotiation', 'sdp_negotiation_started_ms'],
  ['create-offer', 'sdp_local_created_ms'],
  ['create-answer', 'sdp_local_created_ms'],
  ['set-local-description', 'local_description_applied_ms'],
  ['ice-gathering-started', 'ice_gathering_started_ms'],
  ['send-sdp', 'sdp_sent_ms'],
  ['first-candidate', 'first_ice_candidate_ms'],
  ['first-non-host-candidate', 'first_srflx_or_relay_candidate_ms'],
  ['ice-gathering-completed', 'all_ice_candidates_gathered_ms'],
  ['ringing', 'remote_ringing_ms'],
  ['telnyx-rtc-media', 'early_media_ms'],
  ['telnyx-rtc-answer', 'remote_answered_ms'],
  ['first-remote-media-track', 'first_remote_track_ms'],
  ['set-remote-description', 'remote_description_applied_ms'],
  ['call-active', 'call_active_ms'],
  ['ice-connected', 'ice_connected_ms'],
  ['dtls-connected', 'dtls_connected_ms'],
];

// ─── End reason ──────────────────────────────────────────────────────────

const BUSY_CAUSES = ['USER_BUSY', 'CALL_REJECTED_BUSY'];
const NO_ANSWER_CAUSES = [
  'NO_ANSWER',
  'NO_USER_RESPONSE',
  'ORIGINATOR_CANCEL_TIMEOUT',
];

export function mapEndReason(input: {
  initiator?: string;
  execute: boolean;
  recovering: boolean;
  answered: boolean;
  direction: 'inbound' | 'outbound';
  cause?: string;
  sipCode?: number;
}): CallEndReason {
  const {
    initiator,
    execute,
    recovering,
    answered,
    direction,
    cause,
    sipCode,
  } = input;
  if (recovering) return 'network_lost';
  if (!initiator) {
    // hangup({}, false): the SDK lost the session (not reattached, reconnect exhausted)
    return execute ? 'unknown' : 'network_lost';
  }
  if (initiator.startsWith('remote:')) {
    if (answered) return 'remote_hangup';
    if (
      BUSY_CAUSES.includes(cause ?? '') ||
      sipCode === 486 ||
      sipCode === 600
    ) {
      return 'busy';
    }
    if (
      NO_ANSWER_CAUSES.includes(cause ?? '') ||
      sipCode === 480 ||
      sipCode === 408
    ) {
      return 'no_answer';
    }
    return 'remote_hangup';
  }
  if (initiator === 'sdk:server-disconnect') return 'network_lost';
  if (
    initiator.startsWith('app:') ||
    initiator === 'sdk:beforeunload' ||
    initiator === 'sdk:screenshare-track-ended'
  ) {
    if (answered) return 'local_hangup';
    return direction === 'inbound' ? 'rejected' : 'cancelled';
  }
  if (initiator.startsWith('sdk:')) return 'failed';
  return 'unknown';
}

// ─── The per-call recorder ───────────────────────────────────────────────

type MediaSnapshot = Omit<CallMediaChangedPayload, 'changed'>;

/** Which snapshot fields belong to which MediaChange. */
const MEDIA_GROUPS: Array<[MediaChange, Array<keyof MediaSnapshot>]> = [
  ['codec', ['codec_in', 'codec_out', 'target_bitrate_bps']],
  // pair_changes is compared on its own (see _pairChanged).
  ['candidate_pair', ['local_candidate', 'remote_candidate']],
  ['ice_state', ['ice_state']],
  ['dtls_state', ['dtls_state', 'srtp_cipher', 'dtls_version']],
  ['sending', ['sending']],
  ['input_device', ['input_device', 'input_device_count']],
  ['output_device', ['output_device_label', 'output_device_count']],
  ['echo', ['echo_return_loss_db', 'echo_return_loss_enhancement_db']],
];

export default class CallTelemetry {
  /** The newest recorder per call ID: a reattach builds a new call with the same ID. */
  private static _latest = new Map<string, CallTelemetry>();

  private readonly _startedAt = Date.now();
  private readonly _startedPerf = nowPerf();
  private readonly _direction: 'inbound' | 'outbound';
  private _telnyxIds: Pick<KnownIds, 'telnyx_leg_id' | 'telnyx_session_id'> =
    {};
  private _b2buaSent = false;
  private _lastState: CallState = 'new';
  /** The state of the last call_state built (fallback for previous_state). */
  private _lastEmittedState: CallState | null = null;
  private _frozenLastState: CallState | null = null;
  private _answered = false;
  private _activeAtPerf: number | null = null;
  private _ended = false;
  private _endPromise: Promise<void> | null = null;

  // End inputs
  private _hangup: {
    initiator?: string;
    execute: boolean;
    recovering: boolean;
  } | null = null;
  private _finalStats: Promise<StatsSnapshot | null> | null = null;

  // Peer connection and metrics loop
  private _pc: RTCPeerConnection | null = null;
  private _pcCleanup: Array<() => void> = [];
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _inFlight = false;
  private _prevSnapshot: StatsSnapshot | null = null;
  private _lastSnapshot: StatsSnapshot | null = null;
  private _carried: Record<string, number> = {};
  private _countersReset = false;
  private _lastTickPerf = 0;
  private _metricsSamples = 0;
  private _rttSamples: number[] = [];
  private _pairIds = new Set<string>();

  // Media snapshot
  private _lastMedia: MediaSnapshot | null = null;
  private _inputCount?: number;
  private _outputCount?: number;
  private _outputLabels: Record<string, string> = {};
  private _deviceCleanup: (() => void) | null = null;
  private _devicesReady: Promise<void> | null = null;

  // ICE
  private _iceGeneration = 1;
  private _localUfrag: string | null = null;
  private _gatheringStartedPerf: number | null = null;
  private _remoteDescriptionPerf: number | null = null;
  private _isLocalCandidateSignaled: () => boolean = () => true;

  // Timings
  private _marks: Record<string, number> = {};
  private _stopObservingMarks: (() => void) | null = null;
  private _dtlsConnected = false;
  private _timingsSent = false;
  private _firstPacketPerf: number | null = null;

  /** null when telemetry is off: then the call does nothing for telemetry. */
  static create(
    call: ICallTelemetryCall,
    session: ICallTelemetrySession | null | undefined
  ): CallTelemetry | null {
    try {
      const telemetry = session?.telemetry;
      return telemetry ? new CallTelemetry(telemetry, call, session) : null;
    } catch {
      return null;
    }
  }

  constructor(
    private readonly _telemetry: CallTelemetrySink,
    private readonly _call: ICallTelemetryCall,
    private readonly _session: ICallTelemetrySession
  ) {
    const options = _call.options || {};
    this._direction =
      options.remoteSdp || options.attach ? 'inbound' : 'outbound';
  }

  get metricsSamples(): number {
    return this._metricsSamples;
  }

  // ── Emitting ─────────────────────────────────────────────────────────

  private _ids(withTelnyx = true): Partial<KnownIds> {
    return withTelnyx
      ? { call_id: this._call.id, ...this._telnyxIds }
      : { call_id: this._call.id };
  }

  private _emit<N extends EventName>(
    name: N,
    payload: Extract<EventBody, { name: N }>['payload'],
    timestamp?: number
  ) {
    try {
      return this._telemetry.emit(name as EventName, payload as never, {
        ids: this._ids(name !== 'call_metrics'),
        ...(timestamp !== undefined ? { timestamp } : {}),
      });
    } catch {
      return null;
    }
  }

  // ── call_started ─────────────────────────────────────────────────────

  start(): void {
    try {
      CallTelemetry._latest.set(this._call.id, this);
      this._telemetry.callStarted(this._call.id);
      this._stopObservingMarks = observeCallMarks(this._call.id, (marks) =>
        this._mergeMarks(marks)
      );
      this._emit('call_started', this._buildStarted(), this._startedAt);
    } catch {
      // never throw into the SDK
    }
  }

  private _buildStarted(): CallStartedPayload {
    const options = this._call.options || {};
    const session = this._session;
    const inbound = this._direction === 'inbound';
    const iceServers = Array.isArray(options.iceServers)
      ? options.iceServers
      : [];
    const appIceServers = session.options?.iceServers;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolvedIceServers = (session as any).iceServers;
    const b2bua = readB2buaRtc(session);
    if (Object.keys(b2bua).length) this._b2buaSent = true;
    const payload: CallStartedPayload = {
      direction: this._direction,
      audio: options.audio !== false,
      video: !!options.video,
      trickle_ice: !!options.trickleIce,
      force_relay_candidate: options.forceRelayCandidate ?? false,
      prefetch_ice_candidates: options.prefetchIceCandidates ?? false,
      keep_connection_alive_on_socket_close:
        options.keepConnectionAliveOnSocketClose ??
        session.options?.keepConnectionAliveOnSocketClose ??
        false,
      // The app's own servers, for the client or for this call (not the SDK's defaults).
      custom_ice_servers:
        (Array.isArray(appIceServers) && appIceServers.length > 0) ||
        (iceServers.length > 0 && iceServers !== resolvedIceServers),
      ice_servers_count: iceServers.length,
      use_stereo: !!options.useStereo,
      use_sdp_as_bandwidth: !!options.mediaSettings?.useSdpASBandwidthKbps,
      remote_element_provided: !!options.remoteElement,
      local_element_provided: !!options.localElement,
      mic_id_provided: !!options.micId,
      speaker_id_provided: !!options.speakerId,
      camera_id_provided: !!options.camId,
      is_reattach: options.attach === true || !!options.recoveredCallId,
      ...readSignalingVsp(session),
      ...b2bua,
    };
    const callerNumber = inbound
      ? options.remoteCallerNumber
      : options.callerNumber;
    const callerName = inbound ? options.remoteCallerName : options.callerName;
    if (typeof callerNumber === 'string' && callerNumber) {
      payload.caller_number = callerNumber;
    }
    if (typeof callerName === 'string' && callerName) {
      payload.caller_name = callerName;
    }
    if (typeof options.destinationNumber === 'string') {
      payload.destination_number = options.destinationNumber;
    }
    const kbps = num(options.mediaSettings?.sdpASBandwidthKbps);
    if (payload.use_sdp_as_bandwidth && kbps !== undefined) {
      payload.sdp_as_bandwidth_kbps = kbps;
    }
    if (
      Array.isArray(options.preferred_codecs) &&
      options.preferred_codecs.length
    ) {
      payload.preferred_codecs = options.preferred_codecs
        .filter((codec) => codec && codec.mimeType)
        .map((codec) =>
          [
            codec.mimeType,
            codec.clockRate,
            codec.channels > 1 ? codec.channels : null,
          ]
            .filter((part) => part !== null && part !== undefined)
            .join('/')
        );
    }
    if (Array.isArray(options.customHeaders) && options.customHeaders.length) {
      payload.custom_header_names = options.customHeaders
        .map((header) => header?.name)
        .filter((name): name is string => typeof name === 'string' && !!name);
    }
    return payload;
  }

  // ── call_state ───────────────────────────────────────────────────────

  onState(state: string, previousState: string): void {
    if (this._ended) return;
    try {
      const options = this._call.options || {};
      if (!this._telnyxIds.telnyx_leg_id && options.telnyxLegId) {
        this._telnyxIds.telnyx_leg_id = options.telnyxLegId;
      }
      if (!this._telnyxIds.telnyx_session_id && options.telnyxSessionId) {
        this._telnyxIds.telnyx_session_id = options.telnyxSessionId;
      }
      const payload: CallStatePayload = { state: state as CallState };
      // Always when known, also for a repeated state: the call report rebuilds
      // the state machine from transitions and finds a lost call_state where
      // previous_state differs from the state before it.
      const previous = previousState || this._lastEmittedState;
      if (previous) payload.previous_state = previous as CallState;
      this._lastEmittedState = state as CallState;
      if (!this._b2buaSent) {
        const b2bua = readB2buaRtc(this._session);
        if (Object.keys(b2bua).length) {
          Object.assign(payload, b2bua);
          this._b2buaSent = true;
        }
      }
      if (!TERMINAL_STATES.includes(state) && state !== 'recovering') {
        this._lastState = state as CallState;
      }
      if (state === 'active') {
        this._answered = true;
        if (this._activeAtPerf === null) this._activeAtPerf = nowPerf();
      }
      if (state === 'hangup' || state === 'purge') this._freezeLastState();
      this._emit('call_state', payload);
    } catch {
      // never throw into the SDK
    }
  }

  /** After BaseCall handled the state (marks set): the timings may be complete now. */
  afterState(state: string): void {
    if (state === 'active') this._maybeSendTimings();
  }

  private _freezeLastState(): void {
    if (this._frozenLastState === null) this._frozenLastState = this._lastState;
  }

  // ── Peer connection: ICE candidates, DTLS, metrics loop ─────────────

  /** Hooks a Peer calls (it has no telemetry of its own). */
  peerHooks() {
    return {
      onRemoteDescription: (sdp: string) => this.onRemoteSdp(sdp),
      onError: (error: unknown) => this.onError(error),
    };
  }

  /**
   * A new RTCPeerConnection for this call. Own listeners only: the SDK removes
   * its icecandidate handler once a non-trickle SDP was sent.
   */
  attachPeer(
    pc: RTCPeerConnection,
    isLocalCandidateSignaled?: () => boolean
  ): void {
    if (this._ended || !pc) return;
    try {
      if (isLocalCandidateSignaled) {
        this._isLocalCandidateSignaled = isLocalCandidateSignaled;
      }
      if (this._pc && this._pc !== pc) {
        // Replaced: carry the old counters into the totals, restart deltas.
        this._carry(this._lastSnapshot);
        this._prevSnapshot = null;
        this._lastSnapshot = null;
        this._countersReset = true;
      }
      this._detachPeer();
      this._pc = pc;
      this._dtlsConnected = pc.connectionState === 'connected';

      const listen = (type: string, handler: (event: Event) => void) => {
        pc.addEventListener?.(type, handler);
        this._pcCleanup.push(() => pc.removeEventListener?.(type, handler));
      };
      listen('icecandidate', (event) =>
        this._onLocalCandidate(event as RTCPeerConnectionIceEvent)
      );
      listen('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'gathering') {
          this._gatheringStartedPerf = nowPerf();
        }
      });
      listen('connectionstatechange', () => {
        if (pc.connectionState === 'connected') {
          this._dtlsConnected = true;
          this._maybeSendTimings();
        }
      });

      this._maybeSendTimings();
      this._lastTickPerf = nowPerf();
      const interval = this._telemetry.metricsIntervalMs || 1000;
      this._timer = setInterval(() => void this._tick(), interval);
      this._watchDevices();
    } catch {
      // never throw into the SDK
    }
  }

  private _detachPeer(): void {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    for (const cleanup of this._pcCleanup) {
      try {
        cleanup();
      } catch {
        // ignore
      }
    }
    this._pcCleanup = [];
  }

  private _carry(snapshot: StatsSnapshot | null): void {
    if (!snapshot) return;
    for (const key of TOTAL_KEYS) {
      const value = snapshot.n[key];
      if (value !== undefined)
        this._carried[key] = (this._carried[key] ?? 0) + value;
    }
  }

  private _onLocalCandidate(event: RTCPeerConnectionIceEvent): void {
    try {
      const candidate = event?.candidate;
      if (!candidate || !candidate.candidate) return;
      const parsed = parseCandidateLine(candidate.candidate);
      if (!parsed) return;
      const { ufrag, ...fields } = parsed;
      if (ufrag) {
        if (this._localUfrag && ufrag !== this._localUfrag)
          this._iceGeneration += 1;
        this._localUfrag = ufrag;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extra = candidate as any;
      const url =
        str(extra.url) ?? str((event as unknown as { url?: string }).url);
      if (url) fields.url = url;
      const relayProtocol = String(extra.relayProtocol || '').toLowerCase();
      if (RELAY_PROTOCOLS.includes(relayProtocol)) {
        fields.relay_protocol = relayProtocol as IceCandidate['relay_protocol'];
      }
      const payload: IceCandidatePayload = {
        ...fields,
        side: 'local',
        ice_generation: this._iceGeneration,
        signaled: this._safeSignaled(),
      };
      if (this._gatheringStartedPerf !== null) {
        payload.since_gathering_started_ms = round(
          nowPerf() - this._gatheringStartedPerf,
          1
        );
      }
      this._emit('ice_candidate', payload);
    } catch {
      // never throw into the SDK
    }
  }

  private _safeSignaled(): boolean {
    try {
      return this._isLocalCandidateSignaled();
    } catch {
      return true;
    }
  }

  /** The remote SDP was applied: one ice_candidate per a=candidate line. */
  onRemoteSdp(sdp: string): void {
    if (this._ended) return;
    try {
      this._remoteDescriptionPerf = nowPerf();
      for (const line of String(sdp || '').split(/\r?\n/)) {
        if (line.startsWith('a=candidate:')) this._emitRemote(line, 0);
      }
    } catch {
      // never throw into the SDK
    }
  }

  /** A trickle telnyx_rtc.candidate frame. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRemoteCandidate(params: any): void {
    if (this._ended) return;
    try {
      const line = params?.candidate;
      if (typeof line !== 'string' || !line) return;
      const since =
        this._remoteDescriptionPerf !== null
          ? round(nowPerf() - this._remoteDescriptionPerf, 1)
          : undefined;
      this._emitRemote(line, since);
    } catch {
      // never throw into the SDK
    }
  }

  private _emitRemote(line: string, since?: number): void {
    const parsed = parseCandidateLine(line);
    if (!parsed) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ufrag, ...fields } = parsed;
    const payload: IceCandidatePayload = {
      ...fields,
      side: 'remote',
      ice_generation: this._iceGeneration,
    };
    if (since !== undefined) payload.since_gathering_started_ms = since;
    this._emit('ice_candidate', payload);
  }

  // ── Devices (for the media snapshot) ────────────────────────────────

  private _watchDevices(): void {
    if (this._deviceCleanup) return;
    const mediaDevices =
      typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') {
      return;
    }
    const refresh = () =>
      Promise.resolve(mediaDevices.enumerateDevices())
        .then((devices) => {
          if (!Array.isArray(devices)) return;
          this._inputCount = devices.filter(
            (d) => d.kind === 'audioinput'
          ).length;
          const outputs = devices.filter((d) => d.kind === 'audiooutput');
          this._outputCount = outputs.length;
          this._outputLabels = {};
          for (const device of outputs) {
            if (device.label)
              this._outputLabels[device.deviceId] = device.label;
          }
        })
        .catch(() => undefined);
    // The first media snapshot waits for the device counts.
    this._devicesReady = refresh();
    if (typeof mediaDevices.addEventListener === 'function') {
      mediaDevices.addEventListener('devicechange', refresh);
      this._deviceCleanup = () =>
        mediaDevices.removeEventListener?.('devicechange', refresh);
    } else {
      this._deviceCleanup = () => undefined;
    }
  }

  private _inputDevice(): InputDevice | undefined {
    const track = this._call.options?.localStream?.getAudioTracks?.()[0];
    if (!track) return undefined;
    const device: InputDevice = {
      label: stripDeviceLabel(track.label),
      enabled: track.enabled,
      muted: track.muted,
      ready_state: track.readyState === 'ended' ? 'ended' : 'live',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = track.getSettings?.() ?? {};
    if (typeof settings.autoGainControl === 'boolean') {
      device.auto_gain_control = settings.autoGainControl;
    }
    if (typeof settings.echoCancellation === 'boolean') {
      device.echo_cancellation = settings.echoCancellation;
    }
    if (typeof settings.noiseSuppression === 'boolean') {
      device.noise_suppression = settings.noiseSuppression;
    }
    if (num(settings.sampleRate) !== undefined)
      device.sample_rate = settings.sampleRate;
    if (num(settings.sampleSize) !== undefined)
      device.sample_size = settings.sampleSize;
    if (num(settings.channelCount) !== undefined) {
      device.channel_count = settings.channelCount;
    }
    if (num(settings.latency) !== undefined) {
      device.latency_ms = round(settings.latency * 1000, 1);
    }
    return device;
  }

  private _mediaSnapshot(snapshot: StatsSnapshot): MediaSnapshot {
    const media: MediaSnapshot = {};
    const put = <K extends keyof MediaSnapshot>(
      key: K,
      value: MediaSnapshot[K]
    ) => {
      if (value !== undefined) media[key] = value;
    };
    put('codec_in', snapshot.codecIn);
    put('codec_out', snapshot.codecOut);
    put('target_bitrate_bps', snapshot.targetBitrate);
    put('local_candidate', snapshot.localCandidate);
    put('remote_candidate', snapshot.remoteCandidate);
    put('pair_changes', snapshot.pairChanges);
    const iceState = snapshot.iceState ?? this._pc?.iceConnectionState;
    if (iceState && ICE_STATES.includes(iceState)) {
      put('ice_state', iceState as MediaSnapshot['ice_state']);
    }
    put('dtls_state', snapshot.dtlsState);
    put('srtp_cipher', snapshot.srtpCipher);
    put('dtls_version', snapshot.dtlsVersion);
    put('sending', snapshot.sending);
    put('input_device', this._inputDevice());
    const speakerId = this._call.options?.speakerId || 'default';
    const outputLabel = this._outputLabels[speakerId];
    if (outputLabel) put('output_device_label', stripDeviceLabel(outputLabel));
    put('input_device_count', this._inputCount);
    put('output_device_count', this._outputCount);
    put('echo_return_loss_db', snapshot.echoReturnLoss);
    put('echo_return_loss_enhancement_db', snapshot.echoReturnLossEnhancement);
    return media;
  }

  private _checkMedia(snapshot: StatsSnapshot, timestamp: number): void {
    const media = this._mediaSnapshot(snapshot);
    const previous = this._lastMedia;
    let changed: MediaChange[];
    if (!previous) {
      changed = ['initial'];
    } else {
      changed = MEDIA_GROUPS.filter(([, keys]) =>
        keys.some(
          (key) => JSON.stringify(media[key]) !== JSON.stringify(previous[key])
        )
      ).map(([name]) => name);
      // The pair can change and change back within one tick: the counter
      // still went up. A counter that merely appeared is not a change.
      if (
        !changed.includes('candidate_pair') &&
        typeof previous.pair_changes === 'number' &&
        typeof media.pair_changes === 'number' &&
        media.pair_changes > previous.pair_changes
      ) {
        changed.push('candidate_pair');
      }
      if (!changed.length) return;
    }
    const payload: CallMediaChangedPayload = { changed, ...media };
    if (previous && changed.includes('candidate_pair')) {
      if (previous.local_candidate) {
        payload.previous_local_candidate = previous.local_candidate;
      }
      if (previous.remote_candidate) {
        payload.previous_remote_candidate = previous.remote_candidate;
      }
    }
    this._lastMedia = media;
    this._emit('call_media_changed', payload, timestamp);
  }

  // ── call_metrics ─────────────────────────────────────────────────────

  /** One metrics interval. Public for tests. */
  async _tick(): Promise<void> {
    const pc = this._pc;
    if (this._ended || this._inFlight || !pc) return;
    if (pc.connectionState === 'closed' || pc.signalingState === 'closed') {
      this._detachPeer();
      return;
    }
    this._inFlight = true;
    try {
      if (this._devicesReady) await this._devicesReady;
      const report = await pc.getStats();
      if (this._ended || pc !== this._pc) return;
      const timestamp = Date.now();
      const perf = nowPerf();
      const snapshot = extractStats(report);
      const metrics = buildMetrics(
        this._prevSnapshot,
        snapshot,
        perf - this._lastTickPerf,
        this._countersReset
      );
      this._lastTickPerf = perf;
      this._countersReset = false;
      this._prevSnapshot = snapshot;
      this._lastSnapshot = snapshot;
      if (snapshot.pairId) this._pairIds.add(snapshot.pairId);
      if (metrics.rtt_ms !== undefined) this._rttSamples.push(metrics.rtt_ms);
      if (this._firstPacketPerf === null && (metrics.in_packets ?? 0) > 0) {
        this._firstPacketPerf = perf;
      }

      this._checkMedia(snapshot, timestamp);
      if (this._emit('call_metrics', metrics, timestamp)) {
        this._metricsSamples += 1;
      }
    } catch {
      // a failed getStats() loses this interval only
    } finally {
      this._inFlight = false;
    }
  }

  // ── call_warning, error ─────────────────────────────────────────────

  onWarning(
    warning: { code: number; name?: string },
    details?: ICallWarningDetails
  ): void {
    if (this._ended || !warning) return;
    try {
      const code = Number(warning.code);
      const known = (WARNING_CODES as Record<number, string>)[code];
      const payload = {
        code,
        name: known ?? String(warning.name || code).toLowerCase(),
      } as Extract<EventBody, { name: 'call_warning' }>['payload'];
      if (details?.metric) payload.metric = details.metric;
      if (num(details?.value) !== undefined)
        payload.value = round(details.value, 4);
      if (num(details?.threshold) !== undefined)
        payload.threshold = details.threshold;
      this._emit('call_warning', payload);
    } catch {
      // never throw into the SDK
    }
  }

  /**
   * A call or media error. Media = the 420xx device/getUserMedia codes;
   * everything else the call emits is stage "call".
   */
  onError(
    error: unknown,
    fallbackCode: string | number = 49000,
    details?: Record<string, unknown>
  ): void {
    try {
      const info = toCodedErrorInfo(error, fallbackCode);
      const stage = /^42\d{3}$/.test(info.code) ? 'media' : 'call';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fatal = (error as any)?.fatal;
      this._emit('error', {
        stage,
        error: info,
        is_fatal: typeof fatal === 'boolean' ? fatal : false,
        ...(details ? { details } : {}),
      });
    } catch {
      // never throw into the SDK
    }
  }

  // ── call_timings ─────────────────────────────────────────────────────

  private _mergeMarks(marks: Record<string, number>): void {
    for (const [suffix, time] of Object.entries(marks)) {
      if (this._marks[suffix] === undefined) this._marks[suffix] = time;
    }
  }

  private _maybeSendTimings(): void {
    try {
      if (this._timingsSent || this._ended) return;
      if (!this._dtlsConnected || this._activeAtPerf === null) return;
      this._sendTimings(true);
    } catch {
      // never throw into the SDK
    }
  }

  private _sendTimings(complete: boolean): void {
    if (this._timingsSent) return;
    this._timingsSent = true;
    this._mergeMarks(readCallMarks(this._call.id));
    const payload: CallTimingsPayload = { complete };
    for (const [suffix, field] of TIMING_MARKS) {
      const time = this._marks[suffix];
      if (time === undefined || payload[field] !== undefined) continue;
      (payload as Record<string, unknown>)[field] = round(
        Math.max(0, time - this._startedPerf),
        1
      );
    }
    if (this._firstPacketPerf !== null) {
      payload.first_packet_received_ms = round(
        Math.max(0, this._firstPacketPerf - this._startedPerf),
        1
      );
    }
    this._emit('call_timings', payload);
  }

  // ── call_ended ───────────────────────────────────────────────────────

  /**
   * BaseCall.hangup() entered. Freezes the state before hangup and takes the
   * final getStats() while the peer connection is still open.
   */
  noteHangup(
    initiator: string | undefined,
    execute: boolean,
    recovering: boolean
  ): void {
    if (this._ended) return;
    try {
      if (!this._hangup) this._hangup = { initiator, execute, recovering };
      this._freezeLastState();
      this._startFinalStats();
    } catch {
      // never throw into the SDK
    }
  }

  private _startFinalStats(): void {
    if (this._finalStats) return;
    const pc = this._pc;
    if (
      !pc ||
      pc.connectionState === 'closed' ||
      typeof pc.getStats !== 'function'
    ) {
      this._finalStats = Promise.resolve(null);
      return;
    }
    // getStats() is called now, synchronously, before the SDK closes the connection.
    let stats: Promise<StatsSnapshot | null>;
    try {
      stats = Promise.resolve(pc.getStats())
        .then((report) => extractStats(report))
        .catch(() => null);
    } catch {
      stats = Promise.resolve(null);
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), FINAL_STATS_TIMEOUT_MS);
    });
    this._finalStats = Promise.race([stats, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  /**
   * The call object is being destroyed: stop everything, then send
   * call_timings (if never sent) and call_ended. Idempotent.
   */
  end(): Promise<void> {
    if (this._endPromise) return this._endPromise;
    this._ended = true;
    try {
      this._freezeLastState();
      this._startFinalStats();
      this._detachPeer();
      this._deviceCleanup?.();
      this._deviceCleanup = null;
      this._stopObservingMarks?.();
      this._stopObservingMarks = null;
      // Marks may still exist (cleared right after this hook).
      this._mergeMarks(readCallMarks(this._call.id));
    } catch {
      // never throw into the SDK
    }
    const endedAt = Date.now();
    const endedPerf = nowPerf();
    const finalStats = this._finalStats ?? Promise.resolve(null);
    this._endPromise = finalStats
      .catch(() => null)
      .then((final) => {
        try {
          if (!this._timingsSent) this._sendTimings(false);
          this._emit(
            'call_ended',
            this._buildEnded(final, endedAt, endedPerf),
            endedAt
          );
        } catch {
          // never throw into the SDK
        } finally {
          // Synchronously after call_ended (contract 2.1): it is the call's last
          // record, so nothing built after it may carry the call's ID.
          this._release();
        }
      })
      .finally(() => this._release());
    return this._endPromise;
  }

  /** The call leaves the telemetry client's active calls. Idempotent. */
  private _release(): void {
    try {
      if (CallTelemetry._latest.get(this._call.id) === this) {
        CallTelemetry._latest.delete(this._call.id);
        this._telemetry.callEnded(this._call.id);
      }
    } catch {
      // ignore
    }
  }

  private _buildEnded(
    final: StatsSnapshot | null,
    endedAt: number,
    endedPerf: number
  ): CallEndedPayload {
    const last =
      final && Object.keys(final.n).length ? final : this._lastSnapshot;
    const hangup = this._hangup ?? { execute: true, recovering: false };
    const call = this._call;
    const payload: CallEndedPayload = {
      end_reason: mapEndReason({
        initiator: hangup.initiator,
        execute: hangup.execute,
        recovering: hangup.recovering,
        answered: this._answered,
        direction: this._direction,
        cause: call.cause,
        sipCode: num(Number(call.sipCode)) || undefined,
      }),
      last_state: this._frozenLastState ?? this._lastState,
      answered: this._answered,
      duration_ms: Math.max(0, endedAt - this._startedAt),
      metrics_samples: this._metricsSamples,
      totals: buildTotals(
        last,
        this._carried,
        this._rttSamples,
        this._pairIds.size
      ),
    };
    if (str(call.cause)) payload.cause = call.cause;
    const causeCode = num(Number(call.causeCode));
    if (
      call.causeCode !== null &&
      call.causeCode !== undefined &&
      causeCode !== undefined
    ) {
      payload.cause_code = causeCode;
    }
    const sipCode = num(Number(call.sipCode));
    if (
      call.sipCode !== null &&
      call.sipCode !== undefined &&
      sipCode !== undefined
    ) {
      payload.sip_code = sipCode;
    }
    if (str(call.sipReason)) payload.sip_reason = call.sipReason;
    if (this._activeAtPerf !== null) {
      payload.talk_ms = Math.max(0, Math.round(endedPerf - this._activeAtPerf));
    }
    return payload;
  }
}
