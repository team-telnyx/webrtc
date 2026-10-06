/* eslint-disable @typescript-eslint/no-explicit-any */
import CallTelemetry, {
  addTrackStats,
  buildMetrics,
  buildTotals,
  extractStats,
  mapEndReason,
  parseCandidateLine,
  readB2buaRtc,
  type CallTelemetrySink,
  type StatsSnapshot,
} from '../../telemetry/CallTelemetry';
import {
  readPeerConfiguration,
  readPeerStates,
  readRtpParameters,
} from '../../telemetry/browserInfo';

type Stat = Record<string, unknown> & { id: string; type: string };

const report = (...stats: Stat[]) =>
  new Map(stats.map((stat) => [stat.id, stat]));

/** A healthy audio call's cumulative stats, scaled by `t` seconds. */
const audioStats = (
  t: number,
  overrides: Partial<Record<string, Record<string, unknown>>> = {}
): Map<string, Stat> =>
  report(
    {
      id: 'T0',
      type: 'transport',
      selectedCandidatePairId: 'CP1',
      iceState: 'connected',
      dtlsState: 'connected',
      srtpCipher: 'SRTP_AES128_CM_HMAC_SHA1_80',
      tlsVersion: 'FEFD',
      selectedCandidatePairChanges: 1,
      ...overrides.transport,
    },
    {
      id: 'CP1',
      type: 'candidate-pair',
      localCandidateId: 'L1',
      remoteCandidateId: 'R1',
      currentRoundTripTime: 0.046,
      totalRoundTripTime: 0.046 * t,
      requestsSent: t,
      responsesReceived: t,
      ...overrides.pair,
    },
    {
      id: 'L1',
      type: 'local-candidate',
      candidateType: 'srflx',
      protocol: 'udp',
      address: '203.0.113.7',
      port: 58889,
      networkType: 'ethernet',
      url: 'stun:turn.telnyx.com:3478',
    },
    {
      id: 'R1',
      type: 'remote-candidate',
      candidateType: 'host',
      protocol: 'udp',
      address: '198.51.100.9',
      port: 17314,
    },
    {
      id: 'C0',
      type: 'codec',
      mimeType: 'audio/PCMU',
      clockRate: 8000,
      channels: 1,
      payloadType: 0,
    },
    {
      id: 'IN',
      type: 'inbound-rtp',
      kind: 'audio',
      codecId: 'C0',
      packetsReceived: 50 * t,
      bytesReceived: 8000 * t,
      packetsLost: 0,
      packetsDiscarded: 0,
      totalSamplesReceived: 8000 * t,
      concealedSamples: 0,
      concealmentEvents: 0,
      jitter: 0.0009,
      jitterBufferDelay: 0.03 * 50 * t,
      jitterBufferEmittedCount: 50 * t,
      totalAudioEnergy: 0.000004 * t,
      totalSamplesDuration: t,
      ...overrides.inbound,
    },
    {
      id: 'OUT',
      type: 'outbound-rtp',
      kind: 'audio',
      codecId: 'C0',
      packetsSent: 50 * t,
      bytesSent: 8000 * t,
      targetBitrate: 64000,
      active: true,
      ...overrides.outbound,
    },
    {
      id: 'RIN',
      type: 'remote-inbound-rtp',
      kind: 'audio',
      roundTripTime: 0.045,
      totalRoundTripTime: 0.045 * t,
      roundTripTimeMeasurements: t,
      packetsLost: 0,
      ...overrides.remoteInbound,
    },
    ...(overrides.playout === undefined
      ? []
      : [
          {
            id: 'P0',
            type: 'media-playout',
            kind: 'audio',
            ...overrides.playout,
          } as Stat,
        ])
  );

const snap = (stats: Map<string, Stat>): StatsSnapshot => extractStats(stats);

describe('call_metrics deltas (buildMetrics)', () => {
  it('sends per-interval deltas and omits zero deltas', () => {
    const prev = snap(audioStats(1));
    const cur = snap(audioStats(2));
    const metrics = buildMetrics(prev, cur, 1015);

    expect(metrics.interval_ms).toBe(1015);
    expect(metrics.in_packets).toBe(50);
    expect(metrics.in_bytes).toBe(8000);
    expect(metrics.out_packets).toBe(50);
    expect(metrics.ice_requests).toBe(1);
    // Counters that did not move are omitted, never sent as 0
    expect(metrics).not.toHaveProperty('in_lost');
    expect(metrics).not.toHaveProperty('in_discarded');
    expect(metrics).not.toHaveProperty('in_concealed_samples');
    expect(metrics).not.toHaveProperty('remote_lost');
  });

  it('computes gauges and omits the ones not measured', () => {
    const metrics = buildMetrics(
      snap(audioStats(1)),
      snap(audioStats(2)),
      1000
    );

    expect(metrics.rtt_ms).toBe(46);
    expect(metrics.rtcp_rtt_ms).toBe(45);
    expect(metrics.jitter_ms).toBe(0.9);
    expect(metrics.jitter_buffer_ms).toBe(30);
    expect(metrics.in_level).toBe(0.002);
    // No remote jitter, no media-source, no send delay in these stats
    expect(metrics).not.toHaveProperty('remote_jitter_ms');
    expect(metrics).not.toHaveProperty('out_level');
    expect(metrics).not.toHaveProperty('out_send_delay_ms');
    expect(metrics).not.toHaveProperty('jitter_buffer_target_ms');
    // No media-playout stat: played_samples and synthesized_ms are not measured
    expect(metrics).not.toHaveProperty('played_samples');
    expect(metrics).not.toHaveProperty('synthesized_ms');
  });

  it('omits every gauge before DTLS (empty stats)', () => {
    const metrics = buildMetrics(null, snap(report()), 1000);
    expect(metrics).toEqual({ interval_ms: 1000 });
  });

  it('keeps played_samples and synthesized_ms when they are 0', () => {
    const playout = {
      totalSamplesCount: 8000,
      synthesizedSamplesDuration: 0.5,
    };
    const prev = snap(audioStats(1, { playout }));
    const cur = snap(audioStats(2, { playout }));
    const metrics = buildMetrics(prev, cur, 1000);

    expect(metrics.played_samples).toBe(0);
    expect(metrics.synthesized_ms).toBe(0);
    expect(metrics).not.toHaveProperty('playout_delay_ms');
  });

  it('converts synthesized seconds to whole ms', () => {
    const prev = snap(
      audioStats(1, {
        playout: { totalSamplesCount: 8000, synthesizedSamplesDuration: 0.1 },
      })
    );
    const cur = snap(
      audioStats(2, {
        playout: {
          totalSamplesCount: 16000,
          synthesizedSamplesDuration: 0.1204,
          totalPlayoutDelay: 0.04 * 16000,
        },
      })
    );
    const metrics = buildMetrics(prev, cur, 1000);
    expect(metrics.played_samples).toBe(8000);
    expect(metrics.synthesized_ms).toBe(20);
  });

  it('flags counters_reset and counts from zero after the connection was replaced', () => {
    const metrics = buildMetrics(null, snap(audioStats(1)), 1000, true);
    expect(metrics.counters_reset).toBe(true);
    expect(metrics.in_packets).toBe(50);
  });

  it('never sends a negative delta', () => {
    const prev = snap(audioStats(1, { inbound: { packetsLost: 5 } }));
    const cur = snap(audioStats(2, { inbound: { packetsLost: 3 } }));
    expect(buildMetrics(prev, cur, 1000)).not.toHaveProperty('in_lost');
  });
});

describe('call_ended totals (buildTotals)', () => {
  it('uses the final cumulative counters', () => {
    const totals = buildTotals(snap(audioStats(180)), {}, [46, 63, 40]);
    expect(totals).toEqual(
      expect.objectContaining({
        in_packets: 9000,
        in_bytes: 1440000,
        in_lost: 0,
        in_discarded: 0,
        in_samples: 1440000,
        out_packets: 9000,
        out_bytes: 1440000,
        remote_lost: 0,
        rtt_avg_ms: 46,
        rtt_max_ms: 63,
        rtcp_rtt_avg_ms: 45,
        pair_changes: 1,
      })
    );
  });

  it('adds the counters of a replaced peer connection', () => {
    const totals = buildTotals(snap(audioStats(2)), {
      'in.packetsReceived': 500,
      'out.bytesSent': 1000,
    });
    expect(totals.in_packets).toBe(600);
    expect(totals.out_bytes).toBe(17000);
  });

  it('has the required fields when no stats were ever read', () => {
    expect(buildTotals(null)).toEqual({
      in_packets: 0,
      in_bytes: 0,
      in_lost: 0,
      in_discarded: 0,
      out_packets: 0,
      out_bytes: 0,
      pair_changes: 0,
    });
  });
});

describe('ICE candidate parsing', () => {
  it('parses fields and keeps the ufrag out of the payload fields', () => {
    const parsed = parseCandidateLine(
      'candidate:3412957284 1 udp 41885695 198.51.100.112 57816 typ relay raddr 203.0.113.5 rport 58889 generation 0 ufrag Ab12 network-id 1'
    );
    expect(parsed).toEqual({
      candidate_type: 'relay',
      protocol: 'udp',
      component: 'rtp',
      foundation: '3412957284',
      priority: 41885695,
      address: '198.51.100.112',
      port: 57816,
      ufrag: 'Ab12',
      candidate_generation: 0,
      network_id: 1,
    });
  });

  it('never sends the related address and port (raddr/rport)', () => {
    const parsed = parseCandidateLine(
      'candidate:1126654006 1 udp 1677729535 203.0.113.9 61087 typ srflx raddr 0.0.0.0 rport 0 generation 0'
    );
    expect(parsed.related_address).toBeUndefined();
    expect(parsed.related_port).toBeUndefined();
  });

  it('parses an SDP a=candidate line with tcptype', () => {
    expect(
      parseCandidateLine(
        'a=candidate:1 2 TCP 1518280447 10.0.0.1 9 typ host tcptype active'
      )
    ).toEqual(
      expect.objectContaining({
        protocol: 'tcp',
        component: 'rtcp',
        candidate_type: 'host',
        tcp_type: 'active',
      })
    );
  });

  it('rejects garbage', () => {
    expect(parseCandidateLine('')).toBeNull();
    expect(parseCandidateLine('candidate:1 1 udp')).toBeNull();
  });
});

describe('end reason', () => {
  const base = {
    execute: true,
    recovering: false,
    direction: 'outbound' as const,
  };
  it('maps the hangup initiator', () => {
    expect(
      mapEndReason({ ...base, initiator: 'app:call.hangup', answered: true })
    ).toBe('local_hangup');
    expect(
      mapEndReason({ ...base, initiator: 'app:call.hangup', answered: false })
    ).toBe('cancelled');
    expect(
      mapEndReason({
        ...base,
        direction: 'inbound',
        initiator: 'app:call.hangup',
        answered: false,
      })
    ).toBe('rejected');
    expect(
      mapEndReason({
        ...base,
        initiator: 'remote:telnyx_rtc.bye',
        answered: false,
        cause: 'USER_BUSY',
      })
    ).toBe('busy');
    expect(
      mapEndReason({
        ...base,
        initiator: 'remote:telnyx_rtc.bye',
        answered: true,
      })
    ).toBe('remote_hangup');
    expect(
      mapEndReason({ ...base, initiator: 'sdk:media-error', answered: false })
    ).toBe('failed');
    expect(mapEndReason({ ...base, execute: false, answered: true })).toBe(
      'network_lost'
    );
    expect(
      mapEndReason({
        ...base,
        recovering: true,
        initiator: 'sdk:attach-recovery',
        answered: true,
      })
    ).toBe('network_lost');
  });
});

describe('CallTelemetry', () => {
  const makeSink = () => {
    const events: Array<{ name: string; payload: any; options: any }> = [];
    const sink: CallTelemetrySink & { events: typeof events } = {
      events,
      metricsIntervalMs: 1000,
      emit: jest.fn((name: string, payload: any, options: any) => {
        events.push({ name, payload, options });
        return {} as any;
      }) as any,
      callStarted: jest.fn(),
      callEnded: jest.fn(),
    };
    return sink;
  };

  const makePc = (statsAt: () => Map<string, Stat>) => {
    const listeners: Record<string, Array<(event: any) => void>> = {};
    return {
      connectionState: 'connected',
      signalingState: 'stable',
      iceConnectionState: 'connected',
      iceGatheringState: 'new',
      getStats: jest.fn(() => Promise.resolve(statsAt())),
      addEventListener: (type: string, fn: (event: any) => void) => {
        (listeners[type] = listeners[type] || []).push(fn);
      },
      removeEventListener: jest.fn(),
      fire: (type: string, event: any = {}) =>
        (listeners[type] || []).forEach((fn) => fn(event)),
    };
  };

  const makeCall = () => ({
    id: 'call-1',
    options: {
      destinationNumber: '18004377950',
      callerNumber: '155531234567',
      telnyxLegId: undefined as string | undefined,
      telnyxSessionId: undefined as string | undefined,
      trickleIce: true,
      iceServers: [{ urls: 'stun:stun.telnyx.com:3478' }],
      customHeaders: [
        { name: 'X-Account', value: 'acct-42' },
        { name: 'X-Auth-Token', value: 'do-not-send' },
      ],
    },
    cause: undefined as string | undefined,
    causeCode: undefined as number | undefined,
  });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is null when telemetry is off', () => {
    expect(
      CallTelemetry.create(makeCall() as any, { telemetry: null })
    ).toBeNull();
    expect(CallTelemetry.create(makeCall() as any, {})).toBeNull();
  });

  it('emits call_started with names only, then call_state with the Telnyx IDs once known', () => {
    const sink = makeSink();
    const call = makeCall();
    const session = {
      telemetry: sink,
      region: 'us-central',
      dc: 'da1-prod',
      b2buaRtc: { b2bua_rtc_node: 'b2bua-rtc-da1-07' },
    };
    const telemetry = CallTelemetry.create(call as any, session)!;
    telemetry.start();

    expect(sink.callStarted).toHaveBeenCalledWith('call-1');
    const started = sink.events[0];
    expect(started.name).toBe('call_started');
    expect(started.payload).toEqual(
      expect.objectContaining({
        direction: 'outbound',
        destination_number: '18004377950',
        custom_header_names: ['X-Account', 'X-Auth-Token'],
        custom_ice_servers: true,
        ice_servers_count: 1,
        signaling_region: 'us-central',
        signaling_dc: 'da1-prod',
        b2bua_rtc_node: 'b2bua-rtc-da1-07',
        is_reattach: false,
      })
    );
    // Owner 2026-10-06: every option goes out; only credentials are removed.
    expect(started.payload.raw_call_options.customHeaders).toEqual([
      { name: 'X-Account', value: 'acct-42' },
      { name: 'X-Auth-Token', value: '[REDACTED]' },
    ]);
    expect(started.payload.ice_servers).toEqual([
      { url: 'stun:stun.telnyx.com:3478', has_credential: false },
    ]);
    expect(JSON.stringify(started.payload)).not.toContain('do-not-send');

    telemetry.onState('requesting', 'new');
    expect(sink.events[1].options.ids).toEqual({ call_id: 'call-1' });

    call.options.telnyxLegId = 'leg-1';
    call.options.telnyxSessionId = 'tsess-1';
    telemetry.onState('ringing', 'trying');
    const ringing = sink.events[2];
    expect(ringing.payload).toEqual({
      state: 'ringing',
      previous_state: 'trying',
      since_call_started_ms: expect.any(Number),
      since_previous_state_ms: expect.any(Number),
    });
    expect(ringing.options.ids).toEqual({
      call_id: 'call-1',
      telnyx_leg_id: 'leg-1',
      telnyx_session_id: 'tsess-1',
    });
  });

  it('runs the metrics loop: media snapshot, deltas without Telnyx IDs, then totals in call_ended', async () => {
    const sink = makeSink();
    const call = makeCall();
    call.options.telnyxLegId = 'leg-1';
    const telemetry = CallTelemetry.create(call as any, { telemetry: sink })!;
    telemetry.start();
    telemetry.onState('active', 'trying');

    let t = 1;
    const pc = makePc(() => audioStats(t));
    telemetry.attachPeer(pc as any);

    await telemetry._tick();
    t = 2;
    await telemetry._tick();
    t = 3;
    await telemetry._tick();

    const names = sink.events.map((e) => e.name);
    expect(names.filter((n) => n === 'call_media_changed')).toHaveLength(1);
    expect(names.filter((n) => n === 'call_metrics')).toHaveLength(3);

    const media = sink.events.find((e) => e.name === 'call_media_changed')!;
    expect(media.payload.changed).toEqual(['initial']);
    expect(media.payload.codec_in).toEqual({
      mime_type: 'audio/PCMU',
      clock_rate: 8000,
      channels: 1,
      payload_type: 0,
    });
    expect(media.payload.local_candidate.candidate_type).toBe('srflx');

    const metrics = sink.events.filter((e) => e.name === 'call_metrics');
    expect(metrics[1].payload.in_packets).toBe(50);
    expect(metrics[1].options.ids).toEqual({ call_id: 'call-1' });

    // A pair change is one call_media_changed with the previous pair
    pc.getStats.mockImplementationOnce(() =>
      Promise.resolve(
        audioStats(4, {
          transport: { selectedCandidatePairChanges: 2 },
          pair: { localCandidateId: 'R1' },
        })
      )
    );
    await telemetry._tick();
    const change = sink.events.filter(
      (e) => e.name === 'call_media_changed'
    )[1];
    expect(change.payload.changed).toEqual(['candidate_pair']);
    expect(change.payload.previous_local_candidate.candidate_type).toBe(
      'srflx'
    );
    expect(change.payload.local_candidate.candidate_type).toBe('host');

    t = 5;
    call.cause = 'NORMAL_CLEARING';
    call.causeCode = 16;
    telemetry.noteHangup('app:call.hangup', true, false);
    await telemetry.end();

    const ended = sink.events.find((e) => e.name === 'call_ended')!;
    expect(ended.options.ids.telnyx_leg_id).toBe('leg-1');
    expect(ended.payload).toEqual(
      expect.objectContaining({
        end_reason: 'local_hangup',
        cause: 'NORMAL_CLEARING',
        cause_code: 16,
        last_state: 'active',
        answered: true,
        metrics_samples: 4,
      })
    );
    expect(ended.payload.totals).toEqual(
      expect.objectContaining({
        in_packets: 250,
        out_packets: 250,
        pair_changes: 1,
      })
    );
    // call_timings at call end: DTLS was connected, but it came before; never sent twice
    expect(
      names.filter((n) => n === 'call_timings').length
    ).toBeLessThanOrEqual(1);
    expect(sink.callEnded).toHaveBeenCalledWith('call-1');

    // Nothing runs after the end
    const count = sink.events.length;
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(sink.events.length).toBe(count);
  });

  it('flags counters_reset when the peer connection is replaced', async () => {
    const sink = makeSink();
    const telemetry = CallTelemetry.create(makeCall() as any, {
      telemetry: sink,
    })!;
    telemetry.start();
    telemetry.attachPeer(makePc(() => audioStats(10)) as any);
    await telemetry._tick();
    telemetry.attachPeer(makePc(() => audioStats(1)) as any);
    await telemetry._tick();

    const metrics = sink.events.filter((e) => e.name === 'call_metrics');
    expect(metrics[0].payload).not.toHaveProperty('counters_reset');
    expect(metrics[1].payload.counters_reset).toBe(true);
    expect(metrics[1].payload.in_packets).toBe(50);

    await telemetry.end();
    const ended = sink.events.find((e) => e.name === 'call_ended')!;
    // 500 from the first connection + 50 from the second
    expect(ended.payload.totals.in_packets).toBe(550);
    expect(ended.payload.end_reason).toBe('unknown');
  });

  it('sends call_timings complete:false at the end of a call that never connected', async () => {
    const sink = makeSink();
    const telemetry = CallTelemetry.create(makeCall() as any, {
      telemetry: sink,
    })!;
    telemetry.start();
    telemetry.noteHangup('app:call.hangup', true, false);
    await telemetry.end();
    const names = sink.events.map((e) => e.name);
    expect(names.slice(-2)).toEqual(['call_timings', 'call_ended']);
    expect(sink.events[names.indexOf('call_timings')].payload.complete).toBe(
      false
    );
    expect(sink.events[names.length - 1].payload.end_reason).toBe('cancelled');
  });

  it('emits one ice_candidate per local and remote candidate, never the raw line', () => {
    const sink = makeSink();
    const telemetry = CallTelemetry.create(makeCall() as any, {
      telemetry: sink,
    })!;
    telemetry.start();
    const pc = makePc(() => audioStats(1));
    telemetry.attachPeer(pc as any, () => false);
    pc.fire('icecandidate', {
      candidate: {
        candidate:
          'candidate:1 1 udp 2122260223 192.168.1.5 54321 typ host generation 0 ufrag Ab12',
      },
    });
    pc.fire('icecandidate', { candidate: null });
    telemetry.onRemoteSdp(
      'v=0\r\na=ice-ufrag:zz\r\na=candidate:9 1 udp 2130706431 198.51.100.9 17314 typ host\r\n'
    );
    telemetry.onRemoteCandidate({
      candidate: 'candidate:8 1 udp 2130706431 198.51.100.10 17316 typ host',
    });
    const candidates = sink.events.filter((e) => e.name === 'ice_candidate');
    expect(candidates).toHaveLength(3);
    expect(candidates[0].payload).toEqual(
      expect.objectContaining({
        side: 'local',
        signaled: false,
        ice_generation: 1,
      })
    );
    expect(candidates[1].payload.side).toBe('remote');
    expect(JSON.stringify(candidates)).not.toContain('Ab12');
    expect(JSON.stringify(candidates)).not.toContain('candidate:');
  });

  it('maps warnings to the contract names', () => {
    const sink = makeSink();
    const telemetry = CallTelemetry.create(makeCall() as any, {
      telemetry: sink,
    })!;
    telemetry.onWarning(
      { code: 31001, name: 'HIGH_RTT' },
      { metric: 'rtt_ms', value: 620, threshold: 400 }
    );
    telemetry.onWarning({ code: 31002, name: 'HIGH_JITTER' });
    expect(sink.events[0].payload).toEqual({
      code: 31001,
      name: 'high_network_latency',
      metric: 'rtt_ms',
      value: 620,
      threshold: 400,
      sdk_name: 'HIGH_RTT',
      since_call_started_ms: expect.any(Number),
    });
    expect(sink.events[1].payload).toEqual({
      code: 31002,
      name: 'high_jitter',
      sdk_name: 'HIGH_JITTER',
      since_call_started_ms: expect.any(Number),
    });
  });

  it('never throws when the sink throws', async () => {
    const sink = makeSink();
    (sink.emit as jest.Mock).mockImplementation(() => {
      throw new Error('boom');
    });
    const telemetry = CallTelemetry.create(makeCall() as any, {
      telemetry: sink,
    })!;
    expect(() => telemetry.start()).not.toThrow();
    expect(() => telemetry.onState('active', 'new')).not.toThrow();
    await expect(telemetry.end()).resolves.toBeUndefined();
  });

  it('reads B2BUA-RTC names defensively', () => {
    expect(readB2buaRtc(undefined)).toEqual({});
    expect(
      readB2buaRtc({ b2buaRtc: { b2bua_rtc_dc: 'da1', other: 'x' } })
    ).toEqual({
      b2bua_rtc_dc: 'da1',
    });
  });
});

/** Chromium-only and newer getStats() fields on top of audioStats(t). */
const fullStats = (t: number, extra: Record<string, Stat> = {}) => {
  const stats = audioStats(t, {
    transport: {
      bytesSent: 10000 * t,
      bytesReceived: 12000 * t,
      packetsSent: 60 * t,
      packetsReceived: 61 * t,
      iceRole: 'controlling',
      dtlsRole: 'client',
      dtlsCipher: 'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
      localCertificateId: 'CERT-L',
      remoteCertificateId: 'CERT-R',
    },
    pair: {
      state: 'succeeded',
      nominated: true,
      bytesSent: 9000 * t,
      bytesReceived: 11000 * t,
      packetsSent: 55 * t,
      packetsReceived: 56 * t,
      consentRequestsSent: t,
      availableOutgoingBitrate: 300000,
      timestamp: 1000 * t,
      lastPacketReceivedTimestamp: 1000 * t - 20,
    },
    inbound: {
      ssrc: 1111,
      headerBytesReceived: 600 * t,
      fecBytesReceived: 100 * t,
      nackCount: 0,
      silentConcealedSamples: 10 * t,
      insertedSamplesForDeceleration: 5 * t,
      removedSamplesForAcceleration: 3 * t,
      interruptionCount: t,
      totalInterruptionDuration: 0.25 * t,
      jitterBufferMinimumDelay: 0.02 * 50 * t,
      totalProcessingDelay: 0.04 * 50 * t,
      timestamp: 1000 * t,
      lastPacketReceivedTimestamp: 1000 * t - 15,
    },
    outbound: {
      ssrc: 2222,
      mid: '0',
      headerBytesSent: 600 * t,
      retransmittedBytesSent: 0,
    },
    remoteInbound: { fractionLost: 0.0156, reportsReceived: t },
  });
  stats.set('CERT-L', {
    id: 'CERT-L',
    type: 'certificate',
    fingerprintAlgorithm: 'sha-256',
  });
  stats.set('CERT-R', {
    id: 'CERT-R',
    type: 'certificate',
    fingerprintAlgorithm: 'sha-256',
  });
  stats.set('L1', {
    ...(stats.get('L1') as Stat),
    vpn: false,
    networkAdapterType: 'ethernet',
  });
  for (const [id, stat] of Object.entries(extra)) stats.set(id, stat);
  return stats;
};

describe('added getStats fields (2026-10-06)', () => {
  it('sends deltas for the new counters and computes the new gauges', () => {
    const metrics = buildMetrics(snap(fullStats(1)), snap(fullStats(2)), 1000);
    expect(metrics).toEqual(
      expect.objectContaining({
        in_header_bytes: 600,
        in_fec_bytes: 100,
        in_silent_concealed_samples: 10,
        in_inserted_samples: 5,
        in_removed_samples: 3,
        in_jitter_buffer_emitted: 50,
        in_interruptions: 1,
        in_interruption_ms: 250,
        out_header_bytes: 600,
        pair_bytes_sent: 9000,
        pair_bytes_received: 11000,
        pair_packets_sent: 55,
        pair_packets_received: 56,
        ice_consent_requests: 1,
        transport_bytes_sent: 10000,
        transport_bytes_received: 12000,
        transport_packets_sent: 60,
        transport_packets_received: 61,
        remote_reports: 1,
        rtcp_rtt_measurements: 1,
        jitter_buffer_minimum_ms: 20,
        processing_delay_ms: 40,
        remote_fraction_lost: 0.0156,
        available_outgoing_bitrate_bps: 300000,
        in_last_packet_age_ms: 15,
        pair_last_received_age_ms: 20,
      })
    );
    // Counters that did not move are still omitted
    expect(metrics).not.toHaveProperty('in_nacks_sent');
    expect(metrics).not.toHaveProperty('out_retransmitted_bytes');
    // Not in these stats: not measured, so not sent
    expect(metrics).not.toHaveProperty('remote_rtt_ms');
    expect(metrics).not.toHaveProperty('mic_latency_ms');
  });

  it('reads the static media fields and the Chromium candidate details', () => {
    const snapshot = snap(fullStats(1));
    expect(snapshot).toEqual(
      expect.objectContaining({
        iceRole: 'controlling',
        dtlsRole: 'client',
        dtlsCipher: 'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
        localCertificateAlgorithm: 'sha-256',
        remoteCertificateAlgorithm: 'sha-256',
        pairState: 'succeeded',
        pairNominated: true,
        ssrcIn: 1111,
        ssrcOut: 2222,
        mid: '0',
      })
    );
    expect(snapshot.localCandidate).toEqual(
      expect.objectContaining({ vpn: false, network_adapter_type: 'ethernet' })
    );
  });

  it('totals every counter, ICE traffic over every pair, and whole-call averages', () => {
    const stats = fullStats(10, {
      CP0: {
        id: 'CP0',
        type: 'candidate-pair',
        requestsSent: 4,
        responsesReceived: 2,
        bytesSent: 500,
        bytesReceived: 300,
      },
    });
    const totals = buildTotals(snap(stats), { 'in.headerBytesReceived': 60 });
    expect(totals).toEqual(
      expect.objectContaining({
        in_header_bytes: 6060, // 600 x 10 + 60 from a replaced connection
        in_interruption_ms: 2500,
        in_jitter_buffer_emitted: 500,
        // the selected pair (10) plus the earlier pair (4)
        ice_requests: 14,
        ice_responses: 12,
        pair_bytes_sent: 90500,
        pair_bytes_received: 110300,
        transport_bytes_sent: 100000,
        jitter_buffer_avg_ms: 30,
        jitter_buffer_minimum_avg_ms: 20,
        processing_delay_avg_ms: 40,
        in_level_avg: 0.002,
      })
    );
    // Gauges are never totalled
    expect(totals).not.toHaveProperty('remote_fraction_lost');
  });

  it('adds the microphone track stats where the browser has them', () => {
    const prev = snap(fullStats(1));
    addTrackStats(prev, {
      stats: {
        totalFramesDuration: 1,
        deliveredFramesDuration: 1,
        latency: 0.01,
      },
    } as any);
    const cur = snap(fullStats(2));
    addTrackStats(cur, {
      stats: {
        totalFramesDuration: 2,
        deliveredFramesDuration: 1.95,
        latency: 0.012,
      },
    } as any);
    const metrics = buildMetrics(prev, cur, 1000);
    expect(metrics.mic_dropped_ms).toBe(50);
    expect(metrics.mic_latency_ms).toBe(12);
    // A browser without track.stats: nothing added, nothing thrown
    const none = snap(fullStats(1));
    expect(() => addTrackStats(none, {} as any)).not.toThrow();
    expect(none.n['mic.latency']).toBeUndefined();
  });
});

describe('peer connection details (browserInfo)', () => {
  it('sends the ICE servers of getConfiguration() without any credential', () => {
    const config = readPeerConfiguration({
      getConfiguration: () => ({
        iceServers: [
          {
            urls: ['turn:turn.telnyx.com:3478?transport=udp'],
            username: 'turn-user',
            credential: 'turn-secret',
          },
          { urls: 'stun:stun.telnyx.com:3478' },
        ],
        iceTransportPolicy: 'relay',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 0,
        certificates: [{ expires: Date.UTC(2026, 10, 6) }],
      }),
    });
    expect(config).toEqual({
      ice_servers: [
        {
          url: 'turn:turn.telnyx.com:3478?transport=udp',
          has_credential: true,
        },
        { url: 'stun:stun.telnyx.com:3478', has_credential: false },
      ],
      ice_transport_policy: 'relay',
      bundle_policy: 'max-bundle',
      rtcp_mux_policy: 'require',
      ice_candidate_pool_size: 0,
      certificate_expires: ['2026-11-06T00:00:00.000Z'],
    });
    expect(JSON.stringify(config)).not.toContain('turn-secret');
    expect(readPeerConfiguration(null)).toBeUndefined();
    expect(
      readPeerConfiguration({
        getConfiguration: () => {
          throw new Error('closed');
        },
      })
    ).toBeUndefined();
  });

  it('reads negotiated RTP parameters and peer states defensively', () => {
    expect(
      readRtpParameters({
        getParameters: () => ({
          codecs: [
            {
              mimeType: 'audio/opus',
              clockRate: 48000,
              channels: 2,
              payloadType: 111,
              sdpFmtpLine: 'minptime=10;useinbandfec=1',
            },
            { mimeType: 'audio/PCMU', clockRate: 8000, payloadType: 0 },
          ],
          headerExtensions: [
            { uri: 'urn:ietf:params:rtp-hdrext:ssrc-audio-level', id: 1 },
          ],
          rtcp: { reducedSize: false, cname: 'x' },
          encodings: [{ active: true, maxBitrate: 64000, priority: 'high' }],
        }),
      })
    ).toEqual({
      codecs: [
        {
          mime_type: 'audio/opus',
          clock_rate: 48000,
          channels: 2,
          payload_type: 111,
          sdp_fmtp_line: 'minptime=10;useinbandfec=1',
        },
        { mime_type: 'audio/PCMU', clock_rate: 8000, payload_type: 0 },
      ],
      header_extensions: ['urn:ietf:params:rtp-hdrext:ssrc-audio-level'],
      rtcp_reduced_size: false,
      encodings: [{ active: true, max_bitrate_bps: 64000, priority: 'high' }],
    });
    expect(readRtpParameters(undefined)).toBeUndefined();
    expect(
      readPeerStates({
        signalingState: 'stable',
        iceGatheringState: 'complete',
        iceConnectionState: 'connected',
        connectionState: 'connected',
      })
    ).toEqual({
      signaling_state: 'stable',
      ice_gathering_state: 'complete',
      ice_connection_state: 'connected',
      connection_state: 'connected',
    });
  });
});

describe('CallTelemetry added fields', () => {
  const makeSink = () => {
    const events: Array<{ name: string; payload: any; options: any }> = [];
    const sink: CallTelemetrySink & { events: typeof events } = {
      events,
      metricsIntervalMs: 1000,
      emit: jest.fn((name: string, payload: any, options: any) => {
        events.push({ name, payload, options });
        return {} as any;
      }) as any,
      callStarted: jest.fn(),
      callEnded: jest.fn(),
    };
    return sink;
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('puts peer, transceiver, track and playback details in the media snapshot, and call details in call_ended', async () => {
    const sink = makeSink();
    const element = document.createElement('audio');
    element.id = 'remote-audio';
    document.body.appendChild(element);
    const remoteTrack = {
      kind: 'audio',
      enabled: true,
      muted: true,
      readyState: 'live',
    };
    const call = {
      id: 'call-x',
      options: { remoteElement: 'remote-audio', speakerId: 'spk-1' } as any,
      sipCallId: 'sip-call-1',
    };
    const telemetry = CallTelemetry.create(call as any, { telemetry: sink })!;
    telemetry.start();
    telemetry.onState('active', 'new');
    const pc = {
      connectionState: 'connected',
      signalingState: 'stable',
      iceConnectionState: 'connected',
      iceGatheringState: 'complete',
      getStats: jest.fn(() => Promise.resolve(fullStats(1))),
      getConfiguration: () => ({
        iceServers: [
          {
            urls: 'turns:turn.telnyx.com:443',
            username: 'u',
            credential: 'c-secret',
          },
        ],
      }),
      getTransceivers: () => [
        {
          mid: '0',
          direction: 'sendrecv',
          currentDirection: 'sendrecv',
          receiver: {
            track: remoteTrack,
            getParameters: () => ({
              codecs: [
                { mimeType: 'audio/PCMU', clockRate: 8000, payloadType: 0 },
              ],
            }),
          },
          sender: {
            track: null,
            getParameters: () => ({ encodings: [{ active: true }] }),
          },
        },
      ],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    telemetry.attachPeer(pc as any);
    await telemetry._tick();

    const media = sink.events.find((e) => e.name === 'call_media_changed')!;
    expect(media.payload).toEqual(
      expect.objectContaining({
        peer: expect.objectContaining({ connection_state: 'connected' }),
        peer_configuration: {
          ice_servers: [
            { url: 'turns:turn.telnyx.com:443', has_credential: true },
          ],
        },
        receive_parameters: {
          codecs: [
            { mime_type: 'audio/PCMU', clock_rate: 8000, payload_type: 0 },
          ],
        },
        send_parameters: { encodings: [{ active: true }] },
        transceiver_direction: 'sendrecv',
        transceiver_current_direction: 'sendrecv',
        mid: '0',
        ssrc_in: 1111,
        output_device_id: 'spk-1',
        remote_track: { enabled: true, muted: true, ready_state: 'live' },
        playback: expect.objectContaining({
          paused: true,
          muted: false,
          has_stream: false,
        }),
        dtls_role: 'client',
      })
    );
    expect(JSON.stringify(media.payload)).not.toContain('c-secret');

    // The far end's track unmutes: one call_media_changed for it
    remoteTrack.muted = false;
    await telemetry._tick();
    const changes = sink.events.filter((e) => e.name === 'call_media_changed');
    expect(changes[1].payload.changed).toEqual(['remote_track']);

    telemetry.noteHangup('app:call.hangup', true, false);
    await telemetry.end();
    const ended = sink.events.find((e) => e.name === 'call_ended')!;
    expect(ended.payload).toEqual(
      expect.objectContaining({
        hangup_initiator: 'app:call.hangup',
        sip_call_id: 'sip-call-1',
        peer: expect.objectContaining({ signaling_state: 'stable' }),
        peer_connections: 1,
        ice_restarts: 0,
        stats_failures: 0,
        final_stats: true,
      })
    );
    expect(ended.payload.totals.transport_bytes_sent).toBe(10000);
    element.remove();
  });
});
