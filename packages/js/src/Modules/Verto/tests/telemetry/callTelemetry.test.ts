/* eslint-disable @typescript-eslint/no-explicit-any */
import CallTelemetry, {
  buildMetrics,
  buildTotals,
  extractStats,
  mapEndReason,
  parseCandidateLine,
  readB2buaRtc,
  type CallTelemetrySink,
  type StatsSnapshot,
} from '../../telemetry/CallTelemetry';

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
      related_address: '203.0.113.5',
      related_port: 58889,
      ufrag: 'Ab12',
    });
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
      customHeaders: [{ name: 'X-secret', value: 'do-not-send' }],
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
        custom_header_names: ['X-secret'],
        custom_ice_servers: true,
        ice_servers_count: 1,
        signaling_region: 'us-central',
        signaling_dc: 'da1-prod',
        b2bua_rtc_node: 'b2bua-rtc-da1-07',
        is_reattach: false,
      })
    );
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
    });
    expect(sink.events[1].payload).toEqual({
      code: 31002,
      name: 'high_jitter',
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
