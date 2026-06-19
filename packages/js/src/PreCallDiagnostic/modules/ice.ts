/**
 * ICE candidate gathering report module.
 *
 * Placeholder for T2 (VSDK-299) — ICE candidate gathering diagnostics.
 * T3 (VSDK-300) will add ICE connectivity and selected pair diagnostics.
 *
 * This module inspects the ICE candidates gathered during the diagnostic
 * call and produces a PreCallIceReport section.
 */

import type {
  PreCallIceReport,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

/**
 * Build the ICE report section from the diagnostic context.
 *
 * Currently returns undefined (placeholder). Future tickets will implement
 * the actual ICE candidate gathering and connectivity analysis.
 */
export async function buildPreCallIceReport(
  context: PreCallDiagnosticContext
): Promise<PreCallIceReport | undefined> {
  // Placeholder — to be implemented in T2 (VSDK-299) and T3 (VSDK-300)
  void context; // Reserved for future use
  return undefined;
}
