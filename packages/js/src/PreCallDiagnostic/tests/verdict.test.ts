/**
 * Tests for the verdict and reason-code report module — T8 (VSDK-305).
 *
 * These tests verify:
 * - Deterministic verdict for all tested combinations
 * - Reason codes are typed, documented, and correctly assigned
 * - Incomplete data returns `inconclusive` instead of false confidence
 * - Worst-wins priority: permission_denied > blocked > degraded > ready
 * - Individual module assessments produce correct verdicts and reasons
 * - Context error produces blocked verdict
 * - Empty report (all modules undefined) produces inconclusive
 */

import { buildVerdict, IceReasonCode, NetworkReasonCode, MediaReasonCode, MicrophoneReasonCode } from '../modules/verdict';
import type { PreCallDiagnosticReport } from '../types';
import type { PreCallDiagnosticContext } from '../context';

// --- Helper to create a minimal context ---

function createContext(
  overrides: Partial<PreCallDiagnosticContext> = {}
): PreCallDiagnosticContext {
  return {
    options: {
      client: {
        newCall: jest.fn().mockReturnValue({
          id: 'test-call',
          hangup: jest.fn(),
        }),
      },
      destinationNumber: '1234',
    },
    statsSamples: [],
    timings: {
      startedAt: Date.now(),
    },
    ...overrides,
  };
}

// --- Tests ---

describe('buildVerdict', () => {
  describe('inconclusive verdict', () => {
    it('returns inconclusive when no module reports are present', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {};

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('inconclusive');
      expect(result.reasons).toEqual([]);
    });

    it('returns inconclusive when all module reports are undefined', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: undefined,
        network: undefined,
        media: undefined,
        microphone: undefined,
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('inconclusive');
      expect(result.reasons).toEqual([]);
    });

    it('returns inconclusive when module reports have no decisive data', () => {
      const context = createContext();
      // network quality is 'unknown' — should not contribute a verdict
      const report: Partial<PreCallDiagnosticReport> = {
        network: { quality: 'unknown' },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('inconclusive');
    });
  });

  describe('ready verdict', () => {
    it('returns ready when all module reports indicate healthy conditions', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
        network: { quality: 'good' },
        media: { audioFlowing: true },
        microphone: { permissionGranted: true, deviceAvailable: true },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('ready');
      expect(result.reasons).toEqual([]);
    });

    it('returns ready when only some modules report healthy and others are absent', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
        media: { audioFlowing: true },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('ready');
    });
  });

  describe('degraded verdict', () => {
    it('returns degraded when ICE has only host candidates', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host'],
          hasSelectedPair: true,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('degraded');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: IceReasonCode.OnlyHostCandidates,
            source: 'ice',
          }),
        ])
      );
    });

    it('returns degraded when ICE has only relay candidates', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['relay'],
          hasSelectedPair: true,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('degraded');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: IceReasonCode.OnlyRelayCandidates,
            source: 'ice',
          }),
        ])
      );
    });

    it('returns degraded when ICE gathering did not complete', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: false,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('degraded');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: IceReasonCode.GatheringTimeout,
            source: 'ice',
          }),
        ])
      );
    });

    it('returns degraded when network quality is fair', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        network: { quality: 'fair' },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('degraded');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: NetworkReasonCode.FairQuality,
            source: 'network',
          }),
        ])
      );
    });
  });

  describe('blocked verdict', () => {
    it('returns blocked when ICE has no candidates', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: [],
          hasSelectedPair: false,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: IceReasonCode.NoCandidates,
            source: 'ice',
          }),
        ])
      );
    });

    it('returns blocked when ICE has no selected pair', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: false,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: IceReasonCode.NoSelectedPair,
            source: 'ice',
          }),
        ])
      );
    });

    it('returns blocked when network quality is poor', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        network: { quality: 'poor' },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: NetworkReasonCode.PoorQuality,
            source: 'network',
          }),
        ])
      );
    });

    it('returns blocked when media is not flowing', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        media: { audioFlowing: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: MediaReasonCode.NoAudioFlow,
            source: 'media',
          }),
        ])
      );
    });

    it('returns blocked when microphone has no device', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        microphone: { permissionGranted: true, deviceAvailable: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: MicrophoneReasonCode.NoDevice,
            source: 'microphone',
          }),
        ])
      );
    });

    it('returns blocked when context has an error', () => {
      const context = createContext({ error: new Error('Call failed') });
      const report: Partial<PreCallDiagnosticReport> = {};

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'diagnostic_run_error',
            source: 'diagnostic',
          }),
        ])
      );
    });
  });

  describe('permission_denied verdict', () => {
    it('returns permission_denied when microphone permission is denied', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        microphone: { permissionGranted: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('permission_denied');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: MicrophoneReasonCode.PermissionDenied,
            source: 'microphone',
          }),
        ])
      );
    });

    it('permission_denied takes priority over blocked', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: [],
          hasSelectedPair: false,
        },
        microphone: { permissionGranted: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('permission_denied');
      // Should have reasons from both modules
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('permission_denied takes priority over degraded', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        network: { quality: 'fair' },
        microphone: { permissionGranted: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('permission_denied');
    });

    it('permission_denied takes priority over ready', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
        microphone: { permissionGranted: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('permission_denied');
    });
  });

  describe('verdict priority (worst wins)', () => {
    it('blocked takes priority over degraded', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        network: { quality: 'fair' },
        media: { audioFlowing: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
    });

    it('blocked takes priority over ready', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
        media: { audioFlowing: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
    });

    it('degraded takes priority over ready', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
        network: { quality: 'fair' },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('degraded');
    });
  });

  describe('reason code properties', () => {
    it('each reason has code, message, and source', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: [],
          hasSelectedPair: false,
        },
        microphone: { permissionGranted: false },
      };

      const result = buildVerdict(report, context);

      for (const reason of result.reasons) {
        expect(reason).toHaveProperty('code');
        expect(reason).toHaveProperty('message');
        expect(reason).toHaveProperty('source');
        expect(typeof reason.code).toBe('string');
        expect(typeof reason.message).toBe('string');
        expect(typeof reason.source).toBe('string');
        expect(reason.code.length).toBeGreaterThan(0);
        expect(reason.message.length).toBeGreaterThan(0);
      }
    });

    it('reason codes follow the module_prefix pattern', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: [],
          hasSelectedPair: false,
        },
      };

      const result = buildVerdict(report, context);

      for (const reason of result.reasons) {
        // Reason codes should start with the module name + underscore
        expect(reason.code).toMatch(/^[a-z_]+_/);
      }
    });
  });

  describe('determinism', () => {
    it('same input always produces same output', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: false,
          candidateTypes: ['host'],
          hasSelectedPair: false,
        },
        network: { quality: 'poor' },
      };

      const result1 = buildVerdict(report, context);
      const result2 = buildVerdict(report, context);

      expect(result1.verdict).toBe(result2.verdict);
      expect(result1.reasons).toEqual(result2.reasons);
    });
  });

  describe('combined module reports', () => {
    it('collects reasons from multiple modules', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: false,
          candidateTypes: ['host'],
          hasSelectedPair: false,
        },
        network: { quality: 'poor' },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
      expect(result.reasons.some((r) => r.source === 'ice')).toBe(true);
      expect(result.reasons.some((r) => r.source === 'network')).toBe(true);
    });

    it('ready modules do not add reasons', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('ready');
      expect(result.reasons).toEqual([]);
    });

    it('mix of ready and degraded produces degraded verdict with reasons', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
        network: { quality: 'fair' },
        media: { audioFlowing: true },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('degraded');
      // Only the network module adds a reason (degraded)
      expect(result.reasons.length).toBe(1);
      expect(result.reasons[0].source).toBe('network');
    });
  });

  describe('edge cases', () => {
    it('microphone permission denied + no device adds both reasons', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        microphone: { permissionGranted: false, deviceAvailable: false },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('permission_denied');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: MicrophoneReasonCode.PermissionDenied,
          }),
          expect.objectContaining({
            code: MicrophoneReasonCode.NoDevice,
          }),
        ])
      );
    });

    it('ICE no candidates + no selected pair adds both reasons', () => {
      const context = createContext();
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: [],
          hasSelectedPair: false,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: IceReasonCode.NoCandidates }),
          expect.objectContaining({ code: IceReasonCode.NoSelectedPair }),
        ])
      );
    });

    it('error in context adds diagnostic_run_error reason', () => {
      const context = createContext({ error: new Error('Something went wrong') });
      const report: Partial<PreCallDiagnosticReport> = {
        ice: {
          gatheringComplete: true,
          candidateTypes: ['host', 'srflx'],
          hasSelectedPair: true,
        },
      };

      const result = buildVerdict(report, context);

      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'diagnostic_run_error',
            source: 'diagnostic',
          }),
        ])
      );
    });
  });
});

describe('Reason code constants', () => {
  it('IceReasonCode has expected codes', () => {
    expect(IceReasonCode.NoCandidates).toBe('ice_no_candidates');
    expect(IceReasonCode.OnlyHostCandidates).toBe('ice_only_host_candidates');
    expect(IceReasonCode.GatheringTimeout).toBe('ice_gathering_timeout');
    expect(IceReasonCode.NoSelectedPair).toBe('ice_no_selected_pair');
    expect(IceReasonCode.OnlyRelayCandidates).toBe('ice_only_relay_candidates');
  });

  it('NetworkReasonCode has expected codes', () => {
    expect(NetworkReasonCode.HighJitter).toBe('network_high_jitter');
    expect(NetworkReasonCode.HighRtt).toBe('network_high_rtt');
    expect(NetworkReasonCode.HighPacketLoss).toBe('network_high_packet_loss');
    expect(NetworkReasonCode.PoorQuality).toBe('network_poor_quality');
    expect(NetworkReasonCode.FairQuality).toBe('network_fair_quality');
  });

  it('MediaReasonCode has expected codes', () => {
    expect(MediaReasonCode.NoAudioFlow).toBe('media_no_audio_flow');
    expect(MediaReasonCode.OneWayAudio).toBe('media_one_way_audio');
  });

  it('MicrophoneReasonCode has expected codes', () => {
    expect(MicrophoneReasonCode.PermissionDenied).toBe('microphone_permission_denied');
    expect(MicrophoneReasonCode.NoDevice).toBe('microphone_no_device');
    expect(MicrophoneReasonCode.SilenceDetected).toBe('microphone_silence_detected');
    expect(MicrophoneReasonCode.CaptureFailed).toBe('microphone_capture_failed');
  });
});
