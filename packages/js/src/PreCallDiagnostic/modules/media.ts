/**
 * RTP/media flow report module.
 *
 * Placeholder for T5 (VSDK-302) — RTP and media flow diagnostics.
 *
 * This module checks whether audio/media is flowing in both directions
 * during the diagnostic call and produces a PreCallMediaReport section.
 */

import type {
  PreCallMediaReport,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

/**
 * Build the media report section from the diagnostic context.
 *
 * Currently returns undefined (placeholder). Future tickets will implement
 * the actual media flow analysis.
 */
export async function buildPreCallMediaReport(
  context: PreCallDiagnosticContext
): Promise<PreCallMediaReport | undefined> {
  // Placeholder — to be implemented in T5 (VSDK-302)
  void context; // Reserved for future use
  return undefined;
}
