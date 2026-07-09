/**
 * Unit tests for the verdict module (buildVerdict) — VSDK-412.
 *
 * Covers the reason-vs-warning split introduced for the Gap 4 `warnings[]`
 * acceptance criterion: degraded-but-functional signals route to `warnings[]`
 * without flipping the verdict, while blocking/poor conditions route to
 * `reasons[]` and drive the verdict.
 *
 * These tests protect the report shape against future drift and are
 * consistent with how the rest of the SDK ships unit tests for pure builders.
 */
import { buildVerdict } from './verdict';
import type { PreCallDiagnosticReport } from '../types';
import type { PreCallDiagnosticContext } from '../context';
import { createDiagnosticContext } from '../context';

function makeContext(
  overrides: Partial<PreCallDiagnosticContext> = {}
): PreCallDiagnosticContext {
  return { ...createDiagnosticContext({} as never), ...overrides };
}

describe('buildVerdict — reason vs warning split (VSDK-412)', () => {
  it('returns inconclusive when no module data is available', () => {
    const result = buildVerdict({}, makeContext());
    expect(result.verdict).toBe('inconclusive');
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('returns inconclusive (not blocked) when ICE gathered no candidates', () => {
    // Zero candidates means the diagnostic could not gather any ICE data
    // (e.g. an empty/synthetic environment). We cannot make a definitive
    // "blocked" (connectivity failure) claim with no data.
    const report: Partial<PreCallDiagnosticReport> = {
      ice: {
        candidateTypes: [],
        candidateCounts: {
          total: 0,
          host: 0,
          srflx: 0,
          prflx: 0,
          relay: 0,
          unknown: 0,
        },
        candidates: [],
        hasRelayCandidate: false,
        onlyHostCandidates: false,
        hasSelectedPair: false,
      },
    };
    const result = buildVerdict(report, makeContext());
    expect(result.verdict).toBe('inconclusive');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ice_no_candidates' }),
      ])
    );
    expect(result.warnings).toEqual([]);
  });

  it('blocks when candidates were gathered but no pair was selected', () => {
    // Candidates exist (gathering worked) but no pair connected — a
    // definitive connectivity failure, so the verdict is blocked.
    const report: Partial<PreCallDiagnosticReport> = {
      ice: {
        candidateTypes: ['host', 'srflx'],
        candidateCounts: {
          total: 2,
          host: 1,
          srflx: 1,
          prflx: 0,
          relay: 0,
          unknown: 0,
        },
        candidates: [],
        hasRelayCandidate: false,
        onlyHostCandidates: false,
        hasSelectedPair: false,
      },
    };
    const result = buildVerdict(report, makeContext());
    expect(result.verdict).toBe('blocked');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ice_no_selected_pair' }),
      ])
    );
    expect(result.warnings).toEqual([]);
  });

  it('emits only-host-candidates as a WARNING (not a reason) when connectivity succeeded', () => {
    const report: Partial<PreCallDiagnosticReport> = {
      ice: {
        candidateTypes: ['host'],
        candidateCounts: {
          total: 2,
          host: 2,
          srflx: 0,
          prflx: 0,
          relay: 0,
          unknown: 0,
        },
        candidates: [],
        hasRelayCandidate: false,
        onlyHostCandidates: true,
        hasSelectedPair: true,
        gatheringComplete: true,
      },
    };
    const result = buildVerdict(report, makeContext());
    // Verdict stays 'ready' — the warning does not degrade it.
    expect(result.verdict).toBe('ready');
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ice_only_host_candidates' }),
      ])
    );
  });

  it('emits only-host-candidates as a REASON (degraded) when connectivity did NOT succeed', () => {
    const report: Partial<PreCallDiagnosticReport> = {
      ice: {
        candidateTypes: ['host'],
        candidateCounts: {
          total: 2,
          host: 2,
          srflx: 0,
          prflx: 0,
          relay: 0,
          unknown: 0,
        },
        candidates: [],
        hasRelayCandidate: false,
        onlyHostCandidates: true,
        hasSelectedPair: false,
      },
    };
    const result = buildVerdict(report, makeContext());
    expect(result.verdict).toBe('blocked');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ice_no_selected_pair' }),
      ])
    );
    expect(result.warnings).toEqual([]);
  });

  it('routes fair network quality to warnings (not reasons) without degrading verdict', () => {
    const report: Partial<PreCallDiagnosticReport> = {
      ice: {
        candidateTypes: ['host', 'srflx'],
        candidateCounts: {
          total: 2,
          host: 1,
          srflx: 1,
          prflx: 0,
          relay: 0,
          unknown: 0,
        },
        candidates: [],
        hasRelayCandidate: false,
        onlyHostCandidates: false,
        hasSelectedPair: true,
        gatheringComplete: true,
      },
      network: {
        quality: 'fair',
      },
    };
    const result = buildVerdict(report, makeContext());
    // ICE is ready; fair network is a warning, so verdict stays ready.
    expect(result.verdict).toBe('ready');
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'network_fair_quality' }),
      ])
    );
  });

  it('blocks when network quality is poor', () => {
    const report: Partial<PreCallDiagnosticReport> = {
      network: {
        quality: 'poor',
      },
    };
    const result = buildVerdict(report, makeContext());
    expect(result.verdict).toBe('blocked');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'network_poor_quality' }),
      ])
    );
    expect(result.warnings).toEqual([]);
  });

  it('returns permission_denied when microphone permission is denied', () => {
    const report: Partial<PreCallDiagnosticReport> = {
      microphone: {
        permissionGranted: false,
      },
    };
    const result = buildVerdict(report, makeContext());
    expect(result.verdict).toBe('permission_denied');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'microphone_permission_denied' }),
      ])
    );
  });

  it('treats a diagnostic run error as a blocking condition', () => {
    const ctx = makeContext({ error: new Error('boom') });
    const result = buildVerdict({}, ctx);
    expect(result.verdict).toBe('blocked');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'diagnostic_run_error' }),
      ])
    );
  });
});
