/* eslint-disable @typescript-eslint/no-explicit-any */
import CallTelemetry, { mapEndReason, parseCandidateLine } from '../call';
import {
  addTrackStats,
  buildMetrics,
  buildTotals,
  extractStats,
  ROWS,
} from '../stats';
import { readPeerConfiguration, readRtpParameters } from '../browser';
import { config, connectedSession } from './fakes';

type Stat = Record<string, unknown> & { id: string; type: string };
const report = (...stats: Stat[]) => new Map(stats.map((s) => [s.id, s]));

/** A healthy audio call's cumulative stats after `t` seconds. */
const stats = (
  t: number,
  over: Record<string, Record<string, unknown>> = {},
  pair = 'CP1'
) =>
  report(
    {
      id: 'T0',
      type: 'transport',
      selectedCandidatePairId: pair,
      iceState: 'connected',
      dtlsState: 'connected',
      srtpCipher: 'SRTP_AES128_CM_HMAC_SHA1_80',
      tlsVersion: 'FEFD',
      selectedCandidatePairChanges: pair === 'CP1' ? 1 : 2,
      bytesSent: 10000 * t,
      dtlsRole: 'client',
      ...over.transport,
    },
    {
      id: pair,
      type: 'candidate-pair',
      localCandidateId: 'L1',
      remoteCandidateId: 'R1',
      currentRoundTripTime: 0.046,
      totalRoundTripTime: 0.046 * t,
      requestsSent: t,
      responsesReceived: t,
      timestamp: 1000 * t,
      lastPacketReceivedTimestamp: 1000 * t - 20,
      ...over.pair,
    },
    {
      id: 'L1',
      type: 'local-candidate',
      candidateType: 'srflx',
      protocol: 'udp',
      address: '203.0.113.7',
      port: 58889,
      networkType: 'ethernet',
      vpn: false,
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
      ssrc: 1111,
      packetsReceived: 50 * t,
      bytesReceived: 8000 * t,
      packetsLost: 0,
      packetsDiscarded: 0,
      jitter: 0.0009,
      jitterBufferDelay: 0.03 * 50 * t,
      jitterBufferEmittedCount: 50 * t,
      totalAudioEnergy: 0.000004 * t,
      totalSamplesDuration: t,
      headerBytesReceived: 600 * t,
      totalInterruptionDuration: 0.25 * t,
      ...over.inbound,
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
      ...over.outbound,
    },
    {
      id: 'RIN',
      type: 'remote-inbound-rtp',
      kind: 'audio',
      roundTripTime: 0.045,
      totalRoundTripTime: 0.045 * t,
      roundTripTimeMeasurements: t,
      packetsLost: 0,
      ...over.remoteInbound,
    },
    ...(over.playout
      ? [
          {
            id: 'P0',
            type: 'media-playout',
            kind: 'audio',
            ...over.playout,
          } as Stat,
        ]
      : [])
  );

const snap = (t: number, over: Record<string, Record<string, unknown>> = {}) =>
  extractStats(stats(t, over));

describe('call_metrics (table-driven)', () => {
  const first = buildMetrics(null, snap(1), 1000.4);
  const second = buildMetrics(
    snap(1),
    snap(2, { inbound: { packetsLost: 3 } }),
    1003
  );

  it.each([
    // [field, first interval, second interval]: deltas (0 omitted), gauges, ratios
    ['interval_ms', 1000, 1003],
    ['in_packets', 50, 50],
    ['in_bytes', 8000, 8000],
    ['in_lost', undefined, 3],
    ['in_discarded', undefined, undefined],
    ['out_packets', 50, 50],
    ['ice_requests', 1, 1],
    ['rtt_ms', 46, 46],
    ['rtcp_rtt_ms', 45, 45],
    ['jitter_ms', 0.9, 0.9],
    ['jitter_buffer_ms', 30, 30],
    ['in_level', 0.002, 0.002],
    ['played_samples', undefined, undefined],
  ])('%s', (field, one, two) => {
    expect((first as any)[field]).toBe(one);
    expect((second as any)[field]).toBe(two);
  });

  it('puts the JS-only fields under extra', () => {
    expect(first.extra).toEqual(
      expect.objectContaining({
        in_header_bytes: 600,
        in_interruption_ms: 250,
        in_jitter_buffer_emitted: 50,
        transport_bytes_sent: 10000,
        pair_last_received_age_ms: 20,
      })
    );
    expect(
      Object.keys(first)
        .filter((k) => k !== 'extra')
        .every((k) => !(k in first.extra))
    ).toBe(true);
  });

  it('sends played_samples and synthesized_ms even when 0, whenever measurable', () => {
    const playout = (count: number, synthesized: number) => ({
      playout: {
        totalSamplesCount: count,
        synthesizedSamplesDuration: synthesized,
      },
    });
    const metrics = buildMetrics(
      snap(1, playout(8000, 0.0204)),
      snap(2, playout(8000, 0.0408)),
      1000
    );
    expect([metrics.played_samples, metrics.synthesized_ms]).toEqual([0, 20]);
  });

  it('omits every gauge before DTLS, counts from 0 after a reset, never goes negative', () => {
    expect(buildMetrics(null, extractStats(new Map()), 1000)).toEqual({
      interval_ms: 1000,
    });
    expect(buildMetrics(null, snap(3), 1000, true)).toEqual(
      expect.objectContaining({ in_packets: 150, counters_reset: true })
    );
    expect(buildMetrics(snap(2), snap(1), 1000).in_packets).toBeUndefined();
  });

  it('every row reads a getStats field the extractor keeps', () => {
    const keys = new Set(Object.keys(snap(1).n));
    for (const key of [
      'in.packetsReceived',
      'pair.requestsSent',
      'pairs.requestsSent',
      'tr.bytesSent',
      'pair.lastReceivedAge',
    ]) {
      expect(keys.has(key)).toBe(true);
    }
    expect(new Set(ROWS.map((row) => row.name)).size).toBe(ROWS.length);
  });
});

describe('call_ended totals', () => {
  it('takes the final counters, adds a replaced connection, splits contract fields from extras', () => {
    const [totals, extra] = buildTotals(
      snap(10),
      { 'in.packetsReceived': 100, 'pairs.requestsSent': 4 },
      [40, 52],
      1
    );
    expect(totals).toEqual({
      in_packets: 600,
      in_bytes: 80000,
      in_lost: 0,
      in_discarded: 0,
      out_packets: 500,
      out_bytes: 80000,
      remote_lost: 0,
      rtt_avg_ms: 46,
      rtt_max_ms: 52,
      rtcp_rtt_avg_ms: 45,
      pair_changes: 1,
    });
    expect(extra).toEqual(
      expect.objectContaining({
        ice_requests: 14,
        jitter_buffer_avg_ms: 30,
        in_level_avg: 0.002,
        transport_bytes_sent: 100000,
      })
    );
  });

  it('has the required fields when no stats were ever read', () => {
    expect(buildTotals(null, {}, [], 0)).toEqual([
      {
        in_packets: 0,
        in_bytes: 0,
        in_lost: 0,
        in_discarded: 0,
        out_packets: 0,
        out_bytes: 0,
        pair_changes: 0,
      },
      undefined,
    ]);
  });

  it('adds the microphone track stats where the browser has them', () => {
    const snapshot = snap(1);
    addTrackStats(snapshot, {
      stats: {
        totalFramesDuration: 2.5,
        deliveredFramesDuration: 2.49,
        latency: 0.0123,
      },
    });
    expect(snapshot.n['mic.dropped']).toBeCloseTo(0.01);
    expect(buildMetrics(null, snapshot, 1000).extra).toEqual(
      expect.objectContaining({ mic_dropped_ms: 10, mic_latency_ms: 12.3 })
    );
  });
});

describe('ICE candidates and end reasons', () => {
  it('parses a candidate line without raddr/rport, keeping the ufrag for generations only', () => {
    expect(
      parseCandidateLine(
        'a=candidate:842163049 1 udp 1677729535 203.0.113.7 61087 typ srflx raddr 10.0.0.2 rport 5 generation 0 ufrag ab network-cost 10'
      )
    ).toEqual({
      candidate: {
        candidate_type: 'srflx',
        protocol: 'udp',
        component: 'rtp',
        foundation: '842163049',
        priority: 1677729535,
        address: '203.0.113.7',
        port: 61087,
      },
      extra: { candidate_generation: 0, network_cost: 10 },
      ufrag: 'ab',
    });
    expect(
      parseCandidateLine(
        'candidate:1 2 TCP 1 10.0.0.1 9 typ host tcptype active'
      )?.candidate
    ).toEqual(
      expect.objectContaining({
        protocol: 'tcp',
        component: 'rtcp',
        tcp_type: 'active',
      })
    );
    expect(parseCandidateLine('garbage')).toBeNull();
  });

  const base = {
    execute: true,
    recovering: false,
    answered: false,
    direction: 'outbound' as const,
  };
  it.each([
    [{ recovering: true }, 'network_lost'],
    [{ initiator: undefined }, 'unknown'],
    [{ initiator: undefined, execute: false }, 'network_lost'],
    [{ initiator: 'remote:bye', answered: true }, 'remote_hangup'],
    [{ initiator: 'remote:bye', cause: 'USER_BUSY' }, 'busy'],
    [{ initiator: 'remote:bye', sipCode: 480 }, 'no_answer'],
    [{ initiator: 'sdk:server-disconnect' }, 'network_lost'],
    [{ initiator: 'app:call.hangup', answered: true }, 'local_hangup'],
    [{ initiator: 'app:call.hangup', direction: 'inbound' }, 'rejected'],
    [{ initiator: 'app:call.hangup' }, 'cancelled'],
    [{ initiator: 'sdk:media-error' }, 'failed'],
    [{ initiator: 'other' }, 'unknown'],
  ])('maps %j to %s', (input: any, reason) => {
    expect(mapEndReason({ ...base, ...input })).toBe(reason);
  });
});

describe('CallTelemetry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const makePc = (statsAt: () => Map<string, Stat>) => {
    const listeners: Record<string, Array<(event: any) => void>> = {};
    return {
      connectionState: 'new',
      signalingState: 'stable',
      iceConnectionState: 'connected',
      iceGatheringState: 'new',
      getStats: jest.fn(() => Promise.resolve(statsAt())),
      getConfiguration: () => ({
        iceServers: [
          {
            urls: 'turns:turn.telnyx.com:443',
            username: 'u',
            credential: 'c-secret',
          },
        ],
      }),
      addEventListener: (type: string, fn: (event: any) => void) =>
        (listeners[type] = listeners[type] || []).push(fn),
      removeEventListener: jest.fn(),
      fire: (type: string, event: any = {}) =>
        (listeners[type] || []).forEach((fn) => fn(event)),
    };
  };

  const setup = (options: Record<string, unknown> = {}) => {
    const { events, ws, session } = connectedSession();
    events.socketConnectStarted(new URL('wss://rtc.telnyx.com'));
    events.loginSucceeded({
      signaling_region: 'us-central',
      b2bua_rtc_node: 'b2b-1',
    });
    const call: any = {
      id: 'call-1',
      options: {
        destinationNumber: '18004377950',
        callerNumber: '155531234567',
        iceServers: [{ urls: 'stun:stun.telnyx.com:3478' }],
        customHeaders: [
          { name: 'X-Account', value: 'acct-42' },
          { name: 'X-Auth-Token', value: 'do-not-send' },
        ],
        ...options,
      },
    };
    const telemetry = CallTelemetry.create(call, events)!;
    return {
      telemetry,
      ws,
      call,
      events,
      session,
      ofCall: () => ws.events().filter((e) => e.ids.call_id === 'call-1'),
    };
  };

  it('is null when telemetry is off', () => {
    expect(
      CallTelemetry.create({ id: 'x', options: {} }, undefined)
    ).toBeNull();
  });

  it('call_started: provided flags, no VSP names; credentials out of the raw options', () => {
    const { telemetry, ws } = setup();
    telemetry.start();
    const started = ws.payload('call_started');
    expect(started).toEqual(
      expect.objectContaining({
        direction: 'outbound',
        destination_number: '18004377950',
        custom_ice_servers: true,
        ice_servers_count: 1,
        custom_header_names: ['X-Account', 'X-Auth-Token'],
      })
    );
    // Option B′: the signaling VSP reports its and the B2BUA-RTC's names itself.
    expect(started.signaling_region).toBeUndefined();
    expect(started.b2bua_rtc_node).toBeUndefined();
    expect(started.raw_call_options.customHeaders[1].value).toBe('[REDACTED]');
    expect(started.raw_call_options.destinationNumber).toBe('18004377950');
    expect(started.extra.raw_call_options).toBeUndefined();
    expect(JSON.stringify(ws.events())).not.toContain('do-not-send');
  });

  it('call_state: previous state always, Telnyx IDs once known, no B2BUA names', () => {
    const { telemetry, ws, call } = setup();
    telemetry.start();
    telemetry.onState('new', '');
    call.options.telnyxLegId = 'leg-1';
    telemetry.onState('ringing', 'new');
    telemetry.onState('ringing', '');
    const states = ws.events().filter((e) => e.name === 'call_state');
    expect(
      states.map((e) => [
        e.payload.state,
        e.payload.previous_state,
        e.ids.telnyx_leg_id,
      ])
    ).toEqual([
      ['new', undefined, undefined],
      ['ringing', 'new', 'leg-1'],
      ['ringing', 'ringing', 'leg-1'],
    ]);
    expect(states.some((e) => e.payload.b2bua_rtc_node)).toBe(false);
  });

  it('runs the metrics loop: media snapshot, metrics without Telnyx IDs, totals and the record count in call_ended', async () => {
    let t = 1;
    const pc = makePc(() => stats(t, {}, t > 2 ? 'CP2' : 'CP1'));
    const { telemetry, ws, call, ofCall } = setup({
      telnyxLegId: 'leg-1',
      telnyxSessionId: 'ts-1',
    });
    telemetry.start();
    telemetry.onState('active', 'new');
    telemetry.attachPeer(pc as any);
    await telemetry._tick();
    t = 2;
    await telemetry._tick();
    t = 3;
    await telemetry._tick(); // the pair changed
    telemetry.noteHangup('app:call.hangup', true, false);
    call.cause = 'NORMAL_CLEARING';
    await telemetry.end();

    const media = ws
      .events()
      .filter((e) => e.name === 'call_media_changed')
      .map((e) => e.payload);
    expect(media.map((m) => m.changed)).toEqual([
      ['initial'],
      ['candidate_pair'],
    ]);
    expect(media[0]).toEqual(
      expect.objectContaining({
        codec_in: {
          mime_type: 'audio/PCMU',
          clock_rate: 8000,
          channels: 1,
          payload_type: 0,
        },
        ice_state: 'connected',
        dtls_state: 'connected',
        local_candidate: expect.objectContaining({
          candidate_type: 'srflx',
          network_type: 'ethernet',
        }),
      })
    );
    expect(media[0].extra).toEqual(
      expect.objectContaining({
        local_candidate: { vpn: false },
        dtls_role: 'client',
        ssrc_in: 1111,
      })
    );
    expect(media[1].previous_local_candidate).toEqual(media[0].local_candidate);
    expect(JSON.stringify(media)).not.toContain('c-secret');

    const metrics = ws.events().filter((e) => e.name === 'call_metrics');
    expect(metrics).toHaveLength(3);
    expect(metrics.every((e) => !e.ids.telnyx_leg_id)).toBe(true);

    const ended = ofCall().pop();
    expect(ended.name).toBe('call_ended');
    expect(ended.ids.telnyx_leg_id).toBe('leg-1');
    expect('call_sequence' in ended).toBe(false);
    expect(ended.payload).toEqual(
      expect.objectContaining({
        end_reason: 'local_hangup',
        cause: 'NORMAL_CLEARING',
        last_state: 'active',
        answered: true,
        metrics_samples: 3,
        totals: expect.objectContaining({ in_packets: 150, pair_changes: 2 }),
        extra: expect.objectContaining({
          hangup_initiator: 'app:call.hangup',
          peer_connections: 1,
          final_stats: true,
        }),
      })
    );
    // After call_ended nothing carries the call's ID.
    expect(ws.events().slice(-1)[0].name).toBe('call_ended');
  });

  it('flags counters_reset and carries the counters when the peer connection is replaced', async () => {
    const { telemetry, ws } = setup();
    telemetry.start();
    telemetry.attachPeer(makePc(() => stats(4)) as any);
    await telemetry._tick();
    telemetry.attachPeer(makePc(() => stats(1)) as any);
    await telemetry._tick();
    await telemetry.end();
    const metrics = ws
      .events()
      .filter((e) => e.name === 'call_metrics')
      .map((e) => e.payload);
    expect(metrics[1]).toEqual(
      expect.objectContaining({ counters_reset: true, in_packets: 50 })
    );
    expect(ws.payload('call_ended').totals.in_packets).toBe(250);
    expect(ws.payload('call_ended').extra.peer_connections).toBe(2);
  });

  it('call_timings: once active and DTLS-connected, or complete: false at the end', async () => {
    config.readCallMarks.mockReturnValueOnce({ 'new-peer': 1e12 });
    const done = setup();
    done.telemetry.start();
    const pc = makePc(() => stats(1));
    done.telemetry.attachPeer(pc as any);
    done.telemetry.onState('active', 'new');
    done.telemetry.afterState('active');
    expect(done.ws.find('call_timings')).toBeUndefined();
    pc.connectionState = 'connected';
    pc.fire('connectionstatechange');
    expect(done.ws.payload('call_timings')).toEqual(
      expect.objectContaining({
        complete: true,
        peer_created_ms: expect.any(Number),
      })
    );
    await done.telemetry.end();

    const never = setup();
    never.telemetry.start();
    await never.telemetry.end();
    expect(
      never.ws
        .events()
        .filter((e) => e.name === 'call_timings')
        .pop().payload
    ).toEqual({ complete: false });
  });

  it('ice_candidate: every local and remote candidate, never the raw line or raddr', () => {
    const { telemetry, ws } = setup();
    telemetry.start();
    const pc = makePc(() => stats(1));
    telemetry.attachPeer(pc as any, () => false);
    pc.fire('icecandidate', {
      candidate: {
        candidate:
          'candidate:1 1 udp 2113937151 192.168.1.5 54400 typ host ufrag ab',
        sdpMid: '0',
        relayProtocol: 'tls',
      },
    });
    pc.fire('icecandidate', {
      candidate: {
        candidate:
          'candidate:1 1 udp 2113937151 192.168.1.5 54401 typ host ufrag cd',
      },
    });
    telemetry.onRemoteSdp(
      'v=0\r\na=candidate:2 1 udp 1 198.51.100.9 17314 typ relay raddr 1.2.3.4 rport 9\r\n'
    );
    telemetry.onRemoteCandidate({
      candidate: 'candidate:3 1 udp 1 198.51.100.10 17315 typ srflx',
      sdpMLineIndex: 0,
    });
    const candidates = ws
      .events()
      .filter((e) => e.name === 'ice_candidate')
      .map((e) => e.payload);
    expect(
      candidates.map((c) => [
        c.side,
        c.ice_generation,
        c.signaled,
        c.since_gathering_started_ms,
      ])
    ).toEqual([
      ['local', 1, false, undefined],
      ['local', 2, false, undefined],
      ['remote', 2, undefined, 0],
      ['remote', 2, undefined, expect.any(Number)],
    ]);
    expect(candidates[0]).toEqual(
      expect.objectContaining({
        relay_protocol: 'tls',
        extra: { sdp_mid: '0', ice_gathering_state: 'new' },
      })
    );
    expect(JSON.stringify(candidates)).not.toMatch(
      /raddr|1\.2\.3\.4|candidate:/
    );
  });

  it('call_warning: contract names, the SDK name and message under extra', () => {
    const { telemetry, ws } = setup();
    telemetry.start();
    telemetry.onWarning(
      { code: 31001, name: 'HIGH_RTT', message: 'High RTT' },
      { metric: 'rtt_ms', value: 620.123456, threshold: 400 }
    );
    telemetry.onWarning({ code: 39999, name: 'Custom Thing' });
    const [known, other] = ws
      .events()
      .filter((e) => e.name === 'call_warning')
      .map((e) => e.payload);
    expect(known).toEqual(
      expect.objectContaining({
        code: 31001,
        name: 'high_network_latency',
        metric: 'rtt_ms',
        value: 620.1235,
        threshold: 400,
      })
    );
    expect(known.extra).toEqual(
      expect.objectContaining({ sdk_name: 'HIGH_RTT', message: 'High RTT' })
    );
    expect(other.name).toBe('custom thing');
  });

  it('errors: media for 420xx codes, call otherwise, with the call state', () => {
    const { telemetry, ws } = setup();
    telemetry.start();
    telemetry.onState('active', 'new');
    telemetry.onError(
      Object.assign(new Error('denied'), { code: 42001, fatal: true })
    );
    telemetry.onError({ code: -32002, message: 'CALL DOES NOT EXIST' }, 44003, {
      action: 'hold',
    });
    const [media, call] = ws
      .events()
      .filter((e) => e.name === 'error')
      .map((e) => e.payload);
    expect([media.stage, media.is_fatal, media.error.code]).toEqual([
      'media',
      true,
      '42001',
    ]);
    expect([
      call.stage,
      call.error.code,
      call.error.server_code,
      call.details,
    ]).toEqual(['call', '44003', '-32002', { action: 'hold' }]);
    expect(call.extra.call_state).toBe('active');
  });

  it('never throws into the SDK, even when sending throws', async () => {
    const { telemetry, events } = setup();
    (events.client as any).emit = () => {
      throw new Error('boom');
    };
    expect(() => {
      telemetry.start();
      telemetry.onState('active', 'new');
      telemetry.attachPeer(makePc(() => stats(1)) as any);
      telemetry.onWarning({ code: 31001 });
      telemetry.onError(new Error('x'));
    }).not.toThrow();
    await expect(telemetry._tick()).resolves.toBeUndefined();
    await expect(telemetry.end()).resolves.toBeUndefined();
  });
});

describe('peer connection readers', () => {
  it('read getConfiguration() and RTP parameters without credentials, defensively', () => {
    expect(
      readPeerConfiguration({
        getConfiguration: () => ({
          iceServers: [{ urls: 'turn:u:p@t.example', credential: 'x' }],
          bundlePolicy: 'max-bundle',
        }),
      })
    ).toEqual({
      ice_servers: [{ url: 'turn:u:p@t.example', has_credential: true }],
      bundle_policy: 'max-bundle',
    });
    expect(
      readPeerConfiguration({
        getConfiguration: () => {
          throw new Error('closed');
        },
      })
    ).toBeUndefined();
    expect(
      readRtpParameters({
        getParameters: () => ({
          codecs: [{ mimeType: 'audio/opus', clockRate: 48000 }],
          encodings: [{ active: true }],
        }),
      })
    ).toEqual({
      codecs: [{ mime_type: 'audio/opus', clock_rate: 48000 }],
      encodings: [{ active: true }],
    });
    expect(readRtpParameters({})).toBeUndefined();
  });
});
