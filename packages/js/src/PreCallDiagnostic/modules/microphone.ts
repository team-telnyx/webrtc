/**
 * Microphone permission and device availability report module.
 *
 * Placeholder for T6 (VSDK-303) — microphone permission and device availability.
 * T7 (VSDK-304) will add active microphone capture and audio-level checks.
 *
 * This module checks microphone permissions and device availability
 * and produces a PreCallMicrophoneReport section.
 */

import type {
  PreCallMicrophoneReport,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

/**
 * Build the microphone report section from the diagnostic context.
 *
 * Currently returns undefined (placeholder). Future tickets will implement
 * the actual microphone permission and device availability checks.
 */
export async function buildPreCallMicrophoneReport(
  context: PreCallDiagnosticContext
): Promise<PreCallMicrophoneReport | undefined> {
  // Placeholder — to be implemented in T6 (VSDK-303) and T7 (VSDK-304)
  void context; // Reserved for future use
  return undefined;
}
