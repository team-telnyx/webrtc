/**
 * Verdict and reason-code report module.
 *
 * T8 (VSDK-305) — Evaluates the results from other modules (ICE, network,
 * media, microphone) and produces the overall verdict and reasons for
 * the PreCallDiagnosticReport.
 *
 * Verdict policy (conservative and deterministic):
 * - `permission_denied` — microphone permission explicitly denied
 * - `blocked` — a module reports a blocking condition (no ICE, no media, etc.)
 * - `degraded` — a module reports degraded but functional conditions
 * - `ready` — all available module reports indicate healthy conditions
 * - `inconclusive` — insufficient data to determine a verdict (default)
 *
 * Priority: permission_denied > blocked > degraded > ready > inconclusive
 *
 * When no module data is available (all modules disabled or returning
 * undefined placeholders), the verdict is `inconclusive` — never false
 * confidence.
 */

import type {
  PreCallDiagnosticReport,
  PreCallDiagnosticReason,
  PreCallDiagnosticWarning,
} from '../types';
import type { PreCallDiagnosticContext } from '../context';

// ---------------------------------------------------------------------------
// Reason codes — typed constants per module domain
// ---------------------------------------------------------------------------

/**
 * ICE-related reason codes.
 *
 * These codes identify specific ICE conditions that affect the verdict.
 */
export const IceReasonCode = {
  /** No ICE candidates were gathered at all. */
  NoCandidates: 'ice_no_candidates',
  /** Only host candidates were gathered (no srflx or relay). */
  OnlyHostCandidates: 'ice_only_host_candidates',
  /** ICE gathering did not complete within the timeout. */
  GatheringTimeout: 'ice_gathering_timeout',
  /** No ICE candidate pair was selected (connectivity failure). */
  NoSelectedPair: 'ice_no_selected_pair',
  /** Only relay candidates available (no direct path). */
  OnlyRelayCandidates: 'ice_only_relay_candidates',
  /**
   * A configured ICE server returned no candidates (warning).
   * The server may be unreachable, blocked, or misconfigured.
   */
  ServerNoCandidates: 'ice_server_no_candidates',
  /**
   * The network appears to restrict UDP — configured STUN/TURN UDP
   * servers but only TURN TCP candidates gathered (warning).
   */
  StrictNetwork: 'ice_strict_network',
  /**
   * Multiple network interfaces detected on the host (warning).
   * Not a problem by itself but may indicate VPN or complex NAT.
   */
  MultipleInterfaces: 'ice_multiple_interfaces',
  /**
   * A VPN appears to be active on the host (warning).
   * May affect media routing but is not a blocking condition.
   */
  VpnDetected: 'ice_vpn_detected',
} as const;

export type IceReasonCodeValue =
  (typeof IceReasonCode)[keyof typeof IceReasonCode];

/**
 * Network-related reason codes.
 */
export const NetworkReasonCode = {
  /** High jitter detected. */
  HighJitter: 'network_high_jitter',
  /** High round-trip time detected. */
  HighRtt: 'network_high_rtt',
  /** High packet loss detected. */
  HighPacketLoss: 'network_high_packet_loss',
  /** Network quality assessed as poor. */
  PoorQuality: 'network_poor_quality',
  /** Network quality assessed as fair (degraded). */
  FairQuality: 'network_fair_quality',
} as const;

export type NetworkReasonCodeValue =
  (typeof NetworkReasonCode)[keyof typeof NetworkReasonCode];

/**
 * Media-related reason codes.
 */
export const MediaReasonCode = {
  /** No audio media is flowing. */
  NoAudioFlow: 'media_no_audio_flow',
  /** Audio is flowing in only one direction. */
  OneWayAudio: 'media_one_way_audio',
} as const;

export type MediaReasonCodeValue =
  (typeof MediaReasonCode)[keyof typeof MediaReasonCode];

/**
 * Microphone-related reason codes.
 */
export const MicrophoneReasonCode = {
  /** Microphone permission was denied by the user. */
  PermissionDenied: 'microphone_permission_denied',
  /** No microphone device is available. */
  NoDevice: 'microphone_no_device',
  /** Microphone capture produced silence (no audio level detected). */
  SilenceDetected: 'microphone_silence_detected',
  /** Microphone capture failed with an unknown error. */
  CaptureFailed: 'microphone_capture_failed',
} as const;

export type MicrophoneReasonCodeValue =
  (typeof MicrophoneReasonCode)[keyof typeof MicrophoneReasonCode];

// ---------------------------------------------------------------------------
// Verdict determination helpers
// ---------------------------------------------------------------------------

/**
 * Assess the ICE module report and return verdict + reasons + warnings.
 *
 * Blocking conditions (→ reasons, block the verdict):
 * - No candidates gathered
 * - No selected pair (connectivity failure)
 *
 * Degraded conditions (→ reasons, degrade the verdict):
 * - Only relay candidates (no direct path) — still functional but suboptimal
 * - Gathering timeout (partial data)
 *
 * Warning conditions (→ warnings, do NOT flip the verdict) — only emitted
 * when connectivity succeeded (hasSelectedPair === true):
 * - Only host candidates (NAT traversal may not be possible, but the call
 *   connected, so this is advisory rather than blocking)
 */
function assessIce(ice: PreCallDiagnosticReport['ice']): {
  verdict: PreCallDiagnosticReport['verdict'];
  reasons: PreCallDiagnosticReason[];
  warnings: PreCallDiagnosticWarning[];
} {
  if (!ice) {
    return { verdict: undefined, reasons: [], warnings: [] };
  }

  const reasons: PreCallDiagnosticReason[] = [];
  const warnings: PreCallDiagnosticWarning[] = [];
  let worstVerdict: PreCallDiagnosticReport['verdict'] = undefined;

  // No candidates at all — inconclusive. Zero candidates means the
  // diagnostic could not gather any ICE data (e.g. an empty/synthetic
  // environment, or gathering never started), so we cannot make a
  // definitive "blocked" (connectivity failure) claim. A blocked verdict
  // requires that candidates were gathered but no pair connected.
  if (ice.candidateTypes && ice.candidateTypes.length === 0) {
    reasons.push({
      code: IceReasonCode.NoCandidates,
      message: 'No ICE candidates were gathered.',
      source: 'ice',
    });
    worstVerdict = 'inconclusive';
  }

  // Only host candidates — when connectivity succeeded, this is a WARNING
  // (the call works without NAT traversal, e.g. on a flat network); when it
  // did NOT succeed, it remains a degraded reason.
  const onlyHost =
    ice.candidateTypes &&
    ice.candidateTypes.length > 0 &&
    ice.candidateTypes.every((t) => t === 'host');

  if (onlyHost && ice.hasSelectedPair === true) {
    warnings.push({
      code: IceReasonCode.OnlyHostCandidates,
      message:
        'Only host ICE candidates found. NAT traversal may not be possible, but connectivity succeeded.',
      source: 'ice',
    });
  } else if (onlyHost) {
    reasons.push({
      code: IceReasonCode.OnlyHostCandidates,
      message:
        'Only host ICE candidates found. NAT traversal may not be possible.',
      source: 'ice',
    });
    if (worstVerdict !== 'blocked') {
      worstVerdict = 'degraded';
    }
  }

  // Only relay candidates — degraded (no direct media path)
  if (
    ice.candidateTypes &&
    ice.candidateTypes.length > 0 &&
    ice.candidateTypes.every((t) => t === 'relay')
  ) {
    reasons.push({
      code: IceReasonCode.OnlyRelayCandidates,
      message:
        'Only relay ICE candidates found. No direct media path available.',
      source: 'ice',
    });
    if (worstVerdict !== 'blocked') {
      worstVerdict = 'degraded';
    }
  }

  // No selected pair — blocked (connectivity failure), but ONLY when
  // candidates were actually gathered. With zero candidates the verdict is
  // already inconclusive (above); a missing selected pair there is a
  // consequence of having no data, not a connectivity failure.
  const hasCandidates = ice.candidateTypes && ice.candidateTypes.length > 0;
  if (hasCandidates && ice.hasSelectedPair === false) {
    reasons.push({
      code: IceReasonCode.NoSelectedPair,
      message: 'No ICE candidate pair was selected. Connectivity failure.',
      source: 'ice',
    });
    worstVerdict = 'blocked';
  }

  // Gathering did not complete — degraded
  if (ice.gatheringComplete === false) {
    reasons.push({
      code: IceReasonCode.GatheringTimeout,
      message: 'ICE gathering did not complete within the timeout.',
      source: 'ice',
    });
    if (worstVerdict !== 'blocked') {
      worstVerdict = 'degraded';
    }
  }

  // --- ICE server comparison warnings (non-fatal, advisory) ---

  // Configured ICE server returned no candidates — warning
  if (ice.serverCandidateComparison?.hasServerWithNoCandidates) {
    warnings.push({
      code: IceReasonCode.ServerNoCandidates,
      message:
        'One or more configured ICE servers returned no candidates. The server(s) may be unreachable, blocked, or misconfigured.',
      source: 'ice',
    });
  }

  // Strict network — configured STUN/TURN UDP but only TURN TCP candidates
  if (ice.serverCandidateComparison?.appearsStrictNetwork) {
    warnings.push({
      code: IceReasonCode.StrictNetwork,
      message:
        'Network appears to restrict UDP — only TURN TCP candidates gathered despite STUN/TURN UDP servers configured. UDP may be blocked by a firewall.',
      source: 'ice',
    });
  }

  // Multiple network interfaces — warning (not a problem, but advisory)
  if (ice.hasMultipleNetworkInterfaces === true) {
    warnings.push({
      code: IceReasonCode.MultipleInterfaces,
      message:
        'Multiple network interfaces detected on the host. This is not a problem by itself but may indicate a complex network setup.',
      source: 'ice',
    });
  }

  // VPN detected — warning (not a problem, but advisory)
  if (ice.vpnDetected === true) {
    warnings.push({
      code: IceReasonCode.VpnDetected,
      message:
        'A VPN appears to be active on the host. This may affect media routing but is not a blocking condition.',
      source: 'ice',
    });
  }

  // All conditions look good
  if (!worstVerdict) {
    worstVerdict = 'ready';
  }

  return { verdict: worstVerdict, reasons, warnings };
}

/**
 * Assess the network module report and return verdict + reasons + warnings.
 *
 * Blocking conditions (→ reasons, block the verdict):
 * - Poor network quality
 *
 * Warning conditions (→ warnings, do NOT flip the verdict):
 * - Fair network quality (degraded but functional)
 */
function assessNetwork(network: PreCallDiagnosticReport['network']): {
  verdict: PreCallDiagnosticReport['verdict'];
  reasons: PreCallDiagnosticReason[];
  warnings: PreCallDiagnosticWarning[];
} {
  if (!network) {
    return { verdict: undefined, reasons: [], warnings: [] };
  }

  const reasons: PreCallDiagnosticReason[] = [];
  const warnings: PreCallDiagnosticWarning[] = [];
  let worstVerdict: PreCallDiagnosticReport['verdict'] = undefined;

  switch (network.quality) {
    case 'poor':
      reasons.push({
        code: NetworkReasonCode.PoorQuality,
        message: 'Network quality is poor.',
        source: 'network',
      });
      worstVerdict = 'blocked';
      break;
    case 'fair':
      // Fair quality is degraded-but-functional → warning, not a reason.
      warnings.push({
        code: NetworkReasonCode.FairQuality,
        message: 'Network quality is fair (degraded).',
        source: 'network',
      });
      break;
    case 'good':
      worstVerdict = 'ready';
      break;
    case 'unknown':
    default:
      // Unknown quality — no verdict contribution
      break;
  }

  return { verdict: worstVerdict, reasons, warnings };
}

/**
 * Assess the media module report and return verdict + reasons + warnings.
 *
 * Blocking conditions (→ reasons, block the verdict):
 * - No audio flowing
 */
function assessMedia(media: PreCallDiagnosticReport['media']): {
  verdict: PreCallDiagnosticReport['verdict'];
  reasons: PreCallDiagnosticReason[];
  warnings: PreCallDiagnosticWarning[];
} {
  if (!media) {
    return { verdict: undefined, reasons: [], warnings: [] };
  }

  const reasons: PreCallDiagnosticReason[] = [];
  const warnings: PreCallDiagnosticWarning[] = [];
  let worstVerdict: PreCallDiagnosticReport['verdict'] = undefined;

  if (media.audioFlowing === false) {
    reasons.push({
      code: MediaReasonCode.NoAudioFlow,
      message: 'No audio media is flowing.',
      source: 'media',
    });
    worstVerdict = 'blocked';
  } else if (media.audioFlowing === true) {
    worstVerdict = 'ready';
  }

  // Note: one-way audio detection would require additional fields in
  // PreCallMediaReport. For now, we check audioFlowing as a boolean.
  // Future tickets can extend PreCallMediaReport with direction info.

  return { verdict: worstVerdict, reasons, warnings };
}

/**
 * Assess the microphone module report and return verdict + reasons + warnings.
 *
 * Blocking conditions (→ reasons, block the verdict):
 * - Permission denied
 * - No device available
 */
function assessMicrophone(microphone: PreCallDiagnosticReport['microphone']): {
  verdict: PreCallDiagnosticReport['verdict'];
  reasons: PreCallDiagnosticReason[];
  warnings: PreCallDiagnosticWarning[];
} {
  if (!microphone) {
    return { verdict: undefined, reasons: [], warnings: [] };
  }

  const reasons: PreCallDiagnosticReason[] = [];
  const warnings: PreCallDiagnosticWarning[] = [];
  let worstVerdict: PreCallDiagnosticReport['verdict'] = undefined;

  if (microphone.permissionGranted === false) {
    reasons.push({
      code: MicrophoneReasonCode.PermissionDenied,
      message: 'Microphone permission was denied by the user.',
      source: 'microphone',
    });
    // Permission denied is a special verdict — takes highest priority
    worstVerdict = 'permission_denied';
  }

  if (microphone.deviceAvailable === false) {
    reasons.push({
      code: MicrophoneReasonCode.NoDevice,
      message: 'No microphone device is available.',
      source: 'microphone',
    });
    // No device is a blocking condition (but not permission_denied)
    if (worstVerdict !== 'permission_denied') {
      worstVerdict = 'blocked';
    }
  }

  // If permission granted and device available, that's ready
  if (
    microphone.permissionGranted === true &&
    microphone.deviceAvailable !== false
  ) {
    if (!worstVerdict) {
      worstVerdict = 'ready';
    }
  }

  return { verdict: worstVerdict, reasons, warnings };
}

// ---------------------------------------------------------------------------
// Verdict priority resolution
// ---------------------------------------------------------------------------

/**
 * Priority order for verdicts — higher index = worse verdict.
 *
 * When multiple modules contribute different verdicts, the worst one wins.
 * This ensures conservative behavior: any blocking condition blocks the
 * overall verdict, any degradation degrades it, etc.
 *
 * Special case: `permission_denied` is worse than `blocked` because it
 * indicates user action is required (grant permission) rather than a
 * technical failure that might be transient.
 */
const VERDICT_PRIORITY: PreCallDiagnosticReport['verdict'][] = [
  'ready',
  'degraded',
  'blocked',
  'permission_denied',
  'inconclusive',
];

/**
 * Compare two verdicts and return the worse one.
 * `undefined` verdicts are ignored (no opinion).
 */
function worseVerdict(
  a: PreCallDiagnosticReport['verdict'],
  b: PreCallDiagnosticReport['verdict']
): PreCallDiagnosticReport['verdict'] {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const ai = VERDICT_PRIORITY.indexOf(a);
  const bi = VERDICT_PRIORITY.indexOf(b);
  return ai >= bi ? a : b;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build the verdict, reasons, and warnings for the diagnostic report.
 *
 * Evaluates each available module report and combines their verdicts
 * using a worst-wins policy. If no module data is available, returns
 * `inconclusive` (no false confidence).
 *
 * Warnings (degraded-but-functional signals) are collected separately from
 * reasons and do NOT influence the verdict. Callers can surface warnings as
 * advisory information without the verdict degrading.
 *
 * @param report - The partial diagnostic report with module results
 * @param context - The diagnostic context (reserved for future use)
 * @returns The overall verdict, list of reasons, and list of warnings
 */
export function buildVerdict(
  report: Partial<PreCallDiagnosticReport>,
  context: PreCallDiagnosticContext
): {
  verdict: PreCallDiagnosticReport['verdict'];
  reasons: PreCallDiagnosticReason[];
  warnings: PreCallDiagnosticWarning[];
} {
  const allReasons: PreCallDiagnosticReason[] = [];
  const allWarnings: PreCallDiagnosticWarning[] = [];
  let combinedVerdict: PreCallDiagnosticReport['verdict'] = undefined;

  // Assess each module that has data
  const iceResult = assessIce(report.ice);
  allReasons.push(...iceResult.reasons);
  allWarnings.push(...iceResult.warnings);
  combinedVerdict = worseVerdict(combinedVerdict, iceResult.verdict);

  const networkResult = assessNetwork(report.network);
  allReasons.push(...networkResult.reasons);
  allWarnings.push(...networkResult.warnings);
  combinedVerdict = worseVerdict(combinedVerdict, networkResult.verdict);

  const mediaResult = assessMedia(report.media);
  allReasons.push(...mediaResult.reasons);
  allWarnings.push(...mediaResult.warnings);
  combinedVerdict = worseVerdict(combinedVerdict, mediaResult.verdict);

  const micResult = assessMicrophone(report.microphone);
  allReasons.push(...micResult.reasons);
  allWarnings.push(...micResult.warnings);
  combinedVerdict = worseVerdict(combinedVerdict, micResult.verdict);

  // If an error occurred during the diagnostic run, that's a blocking condition
  if (context.error) {
    allReasons.push({
      code: 'diagnostic_run_error',
      message: `Diagnostic run encountered an error: ${context.error.message}`,
      source: 'diagnostic',
    });
    combinedVerdict = worseVerdict(combinedVerdict, 'blocked');
  }

  // If no module contributed a verdict, return inconclusive
  // (conservative: never claim ready without evidence)
  if (combinedVerdict === undefined) {
    return {
      verdict: 'inconclusive',
      reasons: allReasons,
      warnings: allWarnings,
    };
  }

  return {
    verdict: combinedVerdict,
    reasons: allReasons,
    warnings: allWarnings,
  };
}
