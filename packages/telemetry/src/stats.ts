/**
 * getStats() -> call_metrics, call_ended.totals and the media snapshot, from
 * tables with one row per output field. Raw values are kept by
 * "<report>.<field>": in = inbound-rtp, play = media-playout, out =
 * outbound-rtp, src = media-source, rin/rout = remote-inbound/outbound-rtp,
 * pair = the selected candidate pair, pairs = every pair summed, tr =
 * transport, mic = the microphone track's own stats.
 */
import type { CallMetricsPayload, CallTotals } from './contract';
import {
  defined,
  num,
  round,
  str,
  table,
  words,
  type Any,
  type Flat,
} from './sanitize';

type Row = {
  name: string;
  kind: string;
  key: string;
  den: string;
  scale: number;
  dp: number;
  total: string;
};

/**
 * kind: count = per-interval delta, 0 omitted; always = delta, 0 sent; gauge
 * = the current value; ratio = delta key / delta den; level = audio level
 * from energy and duration. scale and dp (decimals) shape the value; total
 * names the call_ended.totals field (a count totals under its own name).
 */
export const ROWS: Row[] = table(`
  rtt_ms                           gauge  pair.currentRoundTripTime          -  1000  0
  rtcp_rtt_ms                      gauge  rin.roundTripTime                  -  1000  0
  jitter_ms                        gauge  in.jitter                          -  1000  1
  remote_jitter_ms                 gauge  rin.jitter                         -  1000  1
  in_packets                       count  in.packetsReceived
  in_bytes                         count  in.bytesReceived
  in_lost                          count  in.packetsLost
  in_discarded                     count  in.packetsDiscarded
  in_fec_packets                   count  in.fecPacketsReceived
  in_samples                       count  in.totalSamplesReceived
  in_concealed_samples             count  in.concealedSamples
  in_concealment_events            count  in.concealmentEvents
  out_packets                      count  out.packetsSent
  out_bytes                        count  out.bytesSent
  out_retransmitted_packets        count  out.retransmittedPacketsSent
  out_nacks                        count  out.nackCount
  remote_lost                      count  rin.packetsLost
  remote_sent_packets              count  rout.packetsSent
  ice_requests                     count  pair.requestsSent
  ice_responses                    count  pair.responsesReceived
  in_header_bytes                  count  in.headerBytesReceived
  in_fec_bytes                     count  in.fecBytesReceived
  in_fec_packets_discarded         count  in.fecPacketsDiscarded
  in_packets_duplicated            count  in.packetsDuplicated
  in_nacks_sent                    count  in.nackCount
  in_retransmitted_packets         count  in.retransmittedPacketsReceived
  in_retransmitted_bytes           count  in.retransmittedBytesReceived
  in_silent_concealed_samples      count  in.silentConcealedSamples
  in_inserted_samples              count  in.insertedSamplesForDeceleration
  in_removed_samples               count  in.removedSamplesForAcceleration
  in_jitter_buffer_emitted         count  in.jitterBufferEmittedCount
  in_jitter_buffer_flushes         count  in.jitterBufferFlushes
  in_delayed_packet_outage_samples count  in.delayedPacketOutageSamples
  in_interruptions                 count  in.interruptionCount
  in_interruption_ms               count  in.totalInterruptionDuration       -  1000
  in_ect1_packets                  count  in.packetsReceivedWithEct1
  in_ce_packets                    count  in.packetsReceivedWithCe
  synthesized_events               count  play.synthesizedSamplesEvents
  out_header_bytes                 count  out.headerBytesSent
  out_retransmitted_bytes          count  out.retransmittedBytesSent
  mic_dropped_ms                   count  mic.dropped                        -  1000
  remote_reports                   count  rin.reportsReceived
  rtcp_rtt_measurements            count  rin.roundTripTimeMeasurements
  remote_received_packets          count  rin.packetsReceived
  remote_sent_bytes                count  rout.bytesSent
  remote_reports_sent              count  rout.reportsSent
  pair_bytes_sent                  count  pair.bytesSent
  pair_bytes_received              count  pair.bytesReceived
  pair_packets_sent                count  pair.packetsSent
  pair_packets_received            count  pair.packetsReceived
  pair_packets_discarded_on_send   count  pair.packetsDiscardedOnSend
  pair_bytes_discarded_on_send     count  pair.bytesDiscardedOnSend
  ice_requests_received            count  pair.requestsReceived
  ice_responses_sent               count  pair.responsesSent
  ice_consent_requests             count  pair.consentRequestsSent
  transport_bytes_sent             count  tr.bytesSent
  transport_bytes_received         count  tr.bytesReceived
  transport_packets_sent           count  tr.packetsSent
  transport_packets_received       count  tr.packetsReceived
  played_samples                   always play.totalSamplesCount
  synthesized_ms                   always play.synthesizedSamplesDuration    -  1000
  jitter_buffer_ms                 ratio  in.jitterBufferDelay          in.jitterBufferEmittedCount     1000 1 jitter_buffer_avg_ms
  jitter_buffer_target_ms          ratio  in.jitterBufferTargetDelay    in.jitterBufferEmittedCount     1000 1 jitter_buffer_target_avg_ms
  playout_delay_ms                 ratio  play.totalPlayoutDelay        play.totalSamplesCount          1000 1 playout_delay_avg_ms
  in_level                         level  in                                 -  1     4 in_level_avg
  out_send_delay_ms                ratio  out.totalPacketSendDelay      out.packetsSent                 1000 1 out_send_delay_avg_ms
  out_level                        level  src                                -  1     4 out_level_avg
  jitter_buffer_minimum_ms         ratio  in.jitterBufferMinimumDelay   in.jitterBufferEmittedCount     1000 1 jitter_buffer_minimum_avg_ms
  processing_delay_ms              ratio  in.totalProcessingDelay       in.jitterBufferEmittedCount     1000 1 processing_delay_avg_ms
  in_arrival_delay_ms              ratio  in.relativePacketArrivalDelay in.packetsReceived              1000 1
  -                                ratio  rout.totalRoundTripTime       rout.roundTripTimeMeasurements  1000 0 remote_rtt_avg_ms
  in_last_packet_age_ms            gauge  in.lastPacketAge
  mic_latency_ms                   gauge  mic.latency                        -  1000  1
  remote_fraction_lost             gauge  rin.fractionLost                   -  1     4
  remote_rtt_ms                    gauge  rout.roundTripTime                 -  1000  0
  available_outgoing_bitrate_bps   gauge  pair.availableOutgoingBitrate
  available_incoming_bitrate_bps   gauge  pair.availableIncomingBitrate
  pair_last_received_age_ms        gauge  pair.lastReceivedAge
  pair_last_sent_age_ms            gauge  pair.lastSentAge
`).map(([name, kind, key, den = '-', scale = '1', dp = '0', total]) => ({
  name: name === '-' ? '' : name,
  kind,
  key,
  den,
  scale: Number(scale),
  dp: Number(dp),
  total: total ?? (kind === 'count' || kind === 'always' ? name : ''),
}));

/** The contract's structured fields; everything else goes under extra. */
const METRICS_FIELDS = words(`interval_ms rtt_ms rtcp_rtt_ms jitter_ms
  remote_jitter_ms in_packets in_bytes in_lost in_discarded in_fec_packets
  in_samples in_concealed_samples in_concealment_events played_samples
  synthesized_ms jitter_buffer_ms jitter_buffer_target_ms playout_delay_ms
  in_level out_packets out_bytes out_retransmitted_packets out_nacks
  out_send_delay_ms out_level remote_lost remote_sent_packets ice_requests
  ice_responses counters_reset`);
const TOTALS_FIELDS = words(`in_packets in_bytes in_lost in_discarded
  in_samples in_concealed_samples in_concealment_events out_packets out_bytes
  out_retransmitted_packets out_nacks remote_lost rtt_avg_ms rtt_max_ms
  rtcp_rtt_avg_ms pair_changes`);
const CANDIDATE_FIELDS = words(`candidate_type protocol relay_protocol
  network_type foundation priority tcp_type address port url`);
const MEDIA_FIELDS = words(`changed codec_in codec_out target_bitrate_bps
  local_candidate remote_candidate previous_local_candidate
  previous_remote_candidate pair_changes ice_state dtls_state srtp_cipher
  dtls_version sending input_device output_device_label input_device_count
  output_device_count echo_return_loss_db echo_return_loss_enhancement_db`);
const INPUT_DEVICE_FIELDS = words(`label enabled muted ready_state
  auto_gain_control echo_cancellation noise_suppression sample_rate
  sample_size channel_count latency_ms`);
/** Totals that are 0, never left out, when not measured. */
const REQUIRED_TOTALS = words(
  'in_packets in_bytes in_lost in_discarded out_packets out_bytes'
);
/** Raw keys computed here, not read from a report. */
const COMPUTED = words(
  'in.lastPacketAge pair.lastReceivedAge pair.lastSentAge'
);

/** Every raw "<report>.<field>" read from getStats(), by report. */
const FIELDS: Record<string, string[]> = {};
for (const key of [
  ...ROWS.flatMap((row) =>
    row.kind === 'level'
      ? words('totalAudioEnergy totalSamplesDuration audioLevel').map(
          (f) => `${row.key}.${f}`
        )
      : [row.key, row.den]
  ),
  'pair.totalRoundTripTime',
  'rin.totalRoundTripTime',
]) {
  const [prefix, field] = key.split('.');
  if (!field || COMPUTED.includes(key) || prefix === 'mic') continue;
  FIELDS[prefix] ??= [];
  if (!FIELDS[prefix].includes(field)) FIELDS[prefix].push(field);
}
/** Selected-pair counters, also summed over every pair. */
const PAIR_COUNTERS = ROWS.filter(
  (r) => r.kind === 'count' && r.key.startsWith('pair.')
).map((r) => r.key.slice(5));

/** Media snapshot fields read straight from a report: field, report, stat, check. */
const MEDIA_ROWS = table(`
  ice_state                        tr    iceState                     ice
  dtls_state                       tr    dtlsState                    dtls
  srtp_cipher                      tr    srtpCipher                   str
  dtls_version                     tr    tlsVersion                   str
  pair_changes                     tr    selectedCandidatePairChanges num
  ice_role                         tr    iceRole                      str
  dtls_role                        tr    dtlsRole                     str
  dtls_cipher                      tr    dtlsCipher                   str
  pair_state                       pair  state                        str
  pair_nominated                   pair  nominated                    bool
  ssrc_in                          in    ssrc                         num
  mid                              in    mid                          str
  target_bitrate_bps               out   targetBitrate                num
  sending                          out   active                       bool
  ssrc_out                         out   ssrc                         num
  mid                              out   mid                          str
  echo_return_loss_db              src   echoReturnLoss               db
  echo_return_loss_enhancement_db  src   echoReturnLossEnhancement    db
`);
export const ICE_STATES = words(
  'new checking connected completed disconnected failed closed'
);
const CHECKS: Record<string, (value: Any) => unknown> = {
  ice: (v) => (ICE_STATES.includes(v) ? v : undefined),
  dtls: (v) =>
    words('new connecting connected closed failed').includes(v) ? v : undefined,
  str,
  num,
  bool: (v) => (typeof v === 'boolean' ? v : undefined),
  db: (v) => (num(v) !== undefined ? round(v, 2) : undefined),
};
export const TCP_TYPES = words('active passive so');
export const RELAY_PROTOCOLS = words('udp tcp tls');

/** Splits a flat object into the contract's fields and the rest (undefined when none); `nested` objects alike. */
export function split<T>(
  flat: Flat,
  fields: string[],
  nested: Record<string, string[]> = {}
): [T, Flat | undefined] {
  const kept: Flat = {};
  const extra: Flat = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === undefined) continue;
    if (!fields.includes(key)) {
      extra[key] = value;
    } else if (nested[key] && value && typeof value === 'object') {
      const [inner, innerExtra] = split(value as Flat, nested[key]);
      kept[key] = inner;
      if (innerExtra) extra[key] = innerExtra;
    } else {
      kept[key] = value;
    }
  }
  return [kept as T, Object.keys(extra).length ? extra : undefined];
}

export const splitMedia = (media: Flat) =>
  split<Flat>(media, MEDIA_FIELDS, {
    local_candidate: CANDIDATE_FIELDS,
    remote_candidate: CANDIDATE_FIELDS,
    previous_local_candidate: CANDIDATE_FIELDS,
    previous_remote_candidate: CANDIDATE_FIELDS,
    input_device: INPUT_DEVICE_FIELDS,
  });

/** One getStats() result, reduced: raw numbers, the pair, the media snapshot fields. */
export type StatsSnapshot = {
  n: Record<string, number>;
  pairId?: string;
  media: Flat;
};

/** One side of the selected pair, from a local/remote-candidate report. */
export function candidateFromStats(report: Any): Flat | undefined {
  const type = report?.candidateType;
  const protocol = String(report?.protocol || '').toLowerCase();
  if (
    !words('host srflx prflx relay').includes(type) ||
    !['udp', 'tcp'].includes(protocol)
  ) {
    return undefined;
  }
  const relay = String(report.relayProtocol || '').toLowerCase();
  return {
    candidate_type: type,
    protocol,
    ...defined({
      relay_protocol: RELAY_PROTOCOLS.includes(relay) ? relay : undefined,
      network_type: words('ethernet wifi cellular vpn unknown').includes(
        report.networkType
      )
        ? report.networkType
        : undefined,
      foundation: str(report.foundation),
      priority: num(report.priority),
      tcp_type: TCP_TYPES.includes(report.tcpType) ? report.tcpType : undefined,
      address: str(report.address) ?? str(report.ip),
      port: num(report.port),
      url: str(report.url),
      vpn: typeof report.vpn === 'boolean' ? report.vpn : undefined,
      network_adapter_type: str(report.networkAdapterType),
    }),
  };
}

const codecFromStats = (report: Any): Flat | undefined =>
  str(report?.mimeType)
    ? {
        mime_type: report.mimeType,
        clock_rate: num(report.clockRate) ?? 0,
        channels: num(report.channels) ?? 1,
        payload_type: num(report.payloadType) ?? -1,
        ...defined({ sdp_fmtp_line: str(report.sdpFmtpLine) }),
      }
    : undefined;

/** Reduces a getStats() report (RTCStatsReport or any Map-like). */
export function extractStats(report: {
  forEach(callback: (value: Any) => void): void;
}): StatsSnapshot {
  const all: Any[] = [];
  const byId: Record<string, Any> = {};
  report.forEach((stat) => {
    if (!stat || typeof stat !== 'object') return;
    all.push(stat);
    if (stat.id) byId[stat.id] = stat;
  });
  const find = (type: string, audioOnly = true) =>
    all.find(
      (s) =>
        s.type === type && (!audioOnly || (s.kind ?? s.mediaType) === 'audio')
    );
  const tr =
    all.find((s) => s.type === 'transport' && s.selectedCandidatePairId) ??
    find('transport', false);
  const pair =
    (tr?.selectedCandidatePairId && byId[tr.selectedCandidatePairId]) ??
    all.find((s) => s.type === 'candidate-pair' && s.selected === true) ??
    all.find(
      (s) =>
        s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded'
    );
  const sources: Record<string, Any> = {
    in: find('inbound-rtp'),
    play: find('media-playout', false),
    out: find('outbound-rtp'),
    src: find('media-source'),
    rin: find('remote-inbound-rtp'),
    rout: find('remote-outbound-rtp'),
    pair,
    tr,
  };
  const n: Record<string, number> = {};
  for (const [prefix, fields] of Object.entries(FIELDS)) {
    for (const field of fields) {
      const value = num(sources[prefix]?.[field]);
      if (value !== undefined) n[`${prefix}.${field}`] = value;
    }
  }
  for (const stat of all.filter((s) => s.type === 'candidate-pair')) {
    for (const field of PAIR_COUNTERS) {
      const value = num(stat[field]);
      if (value !== undefined)
        n[`pairs.${field}`] = (n[`pairs.${field}`] ?? 0) + value;
    }
  }
  // Time since the last packet, on the report's own clock.
  const age = (stat: Any, field: string, key: string) => {
    const [at, now] = [num(stat?.[field]), num(stat?.timestamp)];
    if (at !== undefined && now !== undefined && at > 0)
      n[key] = Math.max(0, now - at);
  };
  age(sources.in, 'lastPacketReceivedTimestamp', 'in.lastPacketAge');
  age(pair, 'lastPacketReceivedTimestamp', 'pair.lastReceivedAge');
  age(pair, 'lastPacketSentTimestamp', 'pair.lastSentAge');

  const media: Flat = {};
  const put = (key: string, value: unknown) => {
    if (value !== undefined && media[key] === undefined) media[key] = value;
  };
  if (sources.in) put('codec_in', codecFromStats(byId[sources.in.codecId]));
  if (sources.out) put('codec_out', codecFromStats(byId[sources.out.codecId]));
  if (pair) {
    put('local_candidate', candidateFromStats(byId[pair.localCandidateId]));
    put('remote_candidate', candidateFromStats(byId[pair.remoteCandidateId]));
  }
  for (const [field, source, stat, check] of MEDIA_ROWS) {
    put(field, CHECKS[check](sources[source]?.[stat]));
  }
  for (const side of ['local', 'remote']) {
    const id = tr?.[`${side}CertificateId`];
    if (typeof id === 'string') {
      put(`${side}_certificate_algorithm`, str(byId[id]?.fingerprintAlgorithm));
    }
  }
  return { n, pairId: pair?.id, media };
}

/** The microphone track's own stats (MediaStreamTrack.stats, Chromium 125+). */
export function addTrackStats(snapshot: StatsSnapshot, track: Any): void {
  try {
    const stats = track?.stats;
    const total = num(stats?.totalFramesDuration);
    const delivered = num(stats?.deliveredFramesDuration);
    if (total !== undefined && delivered !== undefined) {
      snapshot.n['mic.dropped'] = Math.max(0, total - delivered);
    }
    const latency = num(stats?.latency);
    if (latency !== undefined) snapshot.n['mic.latency'] = latency;
  } catch {
    // not every browser has it
  }
}

/** Keys summed across replaced peer connections: not the selected pair's, not the microphone's. */
export const isCarriedKey = (key: string): boolean =>
  !key.startsWith('pair.') && !key.startsWith('mic.');

/** sqrt(energy / duration), or the reported level when there is no energy. */
function level(
  value: (key: string) => number | undefined,
  prefix: string,
  fallback?: number
) {
  const energy = value(`${prefix}.totalAudioEnergy`);
  const duration = value(`${prefix}.totalSamplesDuration`);
  if (energy !== undefined && duration !== undefined && duration > 0) {
    return round(Math.sqrt(Math.max(0, energy) / duration), 4);
  }
  return fallback !== undefined ? round(fallback, 4) : undefined;
}

/** One call_metrics payload; prev null = the first interval, or the first after a reset. */
export function buildMetrics(
  prev: StatsSnapshot | null,
  cur: StatsSnapshot,
  intervalMs: number,
  countersReset = false,
  pairBase?: Record<string, number>
): CallMetricsPayload & { extra?: Flat } {
  const c = cur.n;
  const samePair = !!prev && prev.pairId === cur.pairId;
  // A pair selected again counts from where it was left, not from its start.
  const delta = (key: string): number | undefined => {
    if (c[key] === undefined) return undefined;
    const base =
      key.startsWith('pair.') && !samePair ? pairBase?.[key] : prev?.n[key];
    return base === undefined ? c[key] : Math.max(0, c[key] - base);
  };
  const flat: Flat = { interval_ms: Math.max(0, Math.round(intervalMs)) };
  for (const { name, kind, key, den, scale, dp } of ROWS) {
    if (!name) continue;
    let value: number | undefined;
    if (kind === 'gauge') {
      value = c[key] !== undefined ? round(c[key] * scale, dp) : undefined;
    } else if (kind === 'level') {
      value = level(delta, key, c[`${key}.audioLevel`]);
    } else if (kind === 'ratio') {
      const [top, bottom] = [delta(key), delta(den)];
      value =
        top !== undefined && bottom !== undefined && bottom > 0
          ? round((top / bottom) * scale, dp)
          : undefined;
    } else {
      const d = delta(key);
      value = d !== undefined ? round(d * scale) : undefined;
      if (kind === 'count' && !value) value = undefined;
    }
    if (value !== undefined && Number.isFinite(value)) flat[name] = value;
  }
  if (countersReset) flat.counters_reset = true;
  const [metrics, extra] = split<CallMetricsPayload>(flat, METRICS_FIELDS);
  return extra ? { ...metrics, extra } : metrics;
}

/**
 * call_ended.totals from the final counters plus `carried` (those of peer
 * connections the call replaced): the contract's totals and the rest.
 */
export function buildTotals(
  last: StatsSnapshot | null,
  carried: Record<string, number> = {},
  rttSamples: number[] = [],
  observedPairChanges = 0
): [CallTotals, Flat | undefined] {
  const n = last?.n ?? {};
  const raw = (key: string): number | undefined =>
    n[key] === undefined && carried[key] === undefined
      ? undefined
      : (n[key] ?? 0) + (carried[key] ?? 0);
  const flat: Flat = {};
  for (const { kind, key, den, scale, dp, total } of ROWS) {
    if (!total) continue;
    let value: number | undefined;
    if (kind === 'level') {
      value = raw(`${key}.totalSamplesDuration`) ? level(raw, key) : undefined;
    } else if (kind === 'ratio') {
      const [top, bottom] = [raw(key), raw(den)];
      value =
        top !== undefined && bottom
          ? round((top / bottom) * scale, dp)
          : undefined;
    } else {
      // A selected-pair counter totals over every pair the call used.
      const sum = raw(key.replace(/^pair\./, 'pairs.'));
      value = sum !== undefined ? round(sum * scale) : undefined;
      if (REQUIRED_TOTALS.includes(total)) value ??= 0;
      if (total === 'in_lost') value = Math.max(0, value);
    }
    if (value !== undefined) flat[total] = value;
  }
  flat.pair_changes =
    (last?.media.pair_changes as number) ?? observedPairChanges;
  const [responses, totalRtt] = [
    n['pair.responsesReceived'],
    n['pair.totalRoundTripTime'],
  ];
  if (totalRtt !== undefined && responses) {
    flat.rtt_avg_ms = round((totalRtt / responses) * 1000);
  } else if (rttSamples.length) {
    flat.rtt_avg_ms = round(
      rttSamples.reduce((sum, v) => sum + v, 0) / rttSamples.length
    );
  }
  const rtts = rttSamples.slice();
  if (n['pair.currentRoundTripTime'] !== undefined) {
    rtts.push(round(n['pair.currentRoundTripTime'] * 1000));
  }
  // Not Math.max(...rtts): one sample a second outgrows the argument limit on long calls.
  if (rtts.length) flat.rtt_max_ms = rtts.reduce((a, b) => (b > a ? b : a));
  const measurements = n['rin.roundTripTimeMeasurements'];
  if (n['rin.totalRoundTripTime'] !== undefined && measurements) {
    flat.rtcp_rtt_avg_ms = round(
      (n['rin.totalRoundTripTime'] / measurements) * 1000
    );
  }
  return split<CallTotals>(flat, TOTALS_FIELDS);
}
