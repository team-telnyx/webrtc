/**
 * Verdict and reason-code report module.
 *
 * Placeholder for T8 (VSDK-305) — verdict and reason-code diagnostics.
 *
 * This module evaluates the results from other modules (ICE, network,
 * media, microphone) and produces the overall verdict and reasons
 * for the PreCallDiagnosticReport.
 */

import type {
  PreCallDiagnosticReport,
  PreCallDiagnosticReason,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

/**
 * Build the verdict and reasons for the diagnostic report.
 *
 * Currently returns a default 'inconclusive' verdict with no reasons.
 * Future tickets will implement the actual verdict logic based on
 * module reports.
 */
export function buildVerdict(
  report: Partial<PreCallDiagnosticReport>,
  context: PreCallDiagnosticContext
): { verdict: PreCallDiagnosticReport['verdict']; reasons: PreCallDiagnosticReason[] } {
  // Placeholder — to be implemented in T8 (VSDK-305)
  void report; // Reserved for future use
  void context; // Reserved for future use
  return {
    verdict: 'inconclusive',
    reasons: [],
  };
}
