/** Combine the current diagnostic module reports into a single verdict. */

import type {
  PreCallDiagnosticReason,
  PreCallDiagnosticReport,
  PreCallDiagnosticWarning,
  PreCallIceReport,
  PreCallMicrophoneReport,
  PreCallNetworkReport,
  PreCallServerTestReport,
} from '../types';

/** ICE-related reason codes. */
export const IceReasonCode = {
  NoCandidates: 'ice_no_candidates',
  OnlyHostCandidates: 'ice_only_host_candidates',
  GatheringTimeout: 'ice_gathering_timeout',
  NoSelectedPair: 'ice_no_selected_pair',
  TurnRequired: 'ice_turn_required',
  /** @deprecated Use TurnRequired. */
  OnlyRelayCandidates: 'ice_only_relay_candidates',
  ServerNoCandidates: 'ice_server_no_candidates',
  StrictNetwork: 'ice_strict_network',
  MultipleInterfaces: 'ice_multiple_interfaces',
  VpnDetected: 'ice_vpn_detected',
} as const;

export type IceReasonCodeValue =
  (typeof IceReasonCode)[keyof typeof IceReasonCode];

/** Network-related reason codes. */
export const NetworkReasonCode = {
  HighJitter: 'network_high_jitter',
  HighRtt: 'network_high_rtt',
  PacketLoss: 'network_packet_loss',
  LowBitrate: 'network_low_bitrate',
  /** @deprecated Use PacketLoss. */
  HighPacketLoss: 'network_high_packet_loss',
  PoorQuality: 'network_poor_quality',
  FairQuality: 'network_fair_quality',
  NoAudioFlow: 'network_no_audio_flow',
  OneWayAudio: 'network_one_way_audio',
} as const;

export type NetworkReasonCodeValue =
  (typeof NetworkReasonCode)[keyof typeof NetworkReasonCode];

/** Microphone-related reason codes. */
export const MicrophoneReasonCode = {
  PermissionDenied: 'microphone_permission_denied',
  NoDevice: 'microphone_no_device',
  CapturePermissionDenied: 'microphone_capture_permission_denied',
  CaptureNoDevice: 'microphone_capture_no_device',
  CaptureNotSupported: 'microphone_capture_not_supported',
  CaptureFailed: 'microphone_capture_failed',
  Silent: 'microphone_silent',
  /** @deprecated Use Silent. */
  SilenceDetected: 'microphone_silence_detected',
} as const;

export type MicrophoneReasonCodeValue =
  (typeof MicrophoneReasonCode)[keyof typeof MicrophoneReasonCode];

type Verdict = NonNullable<PreCallDiagnosticReport['verdict']>;

/**
 * Only diagnostic findings affect a verdict. Timings and raw samples are
 * deliberately excluded: they describe a run but do not indicate whether a
 * call can be made.
 */
type VerdictInput = Pick<
  PreCallDiagnosticReport,
  'ice' | 'network' | 'microphone' | 'serverTests'
>;

interface Assessment {
  verdict?: Verdict;
  reasons: PreCallDiagnosticReason[];
  warnings: PreCallDiagnosticWarning[];
}

const emptyAssessment = (): Assessment => ({ reasons: [], warnings: [] });

/** Higher values take precedence when module assessments are combined. */
const VERDICT_PRIORITY: Record<Verdict, number> = {
  inconclusive: 0,
  ready: 1,
  degraded: 2,
  blocked: 3,
  permission_denied: 4,
};

function worseVerdict(a: Verdict | undefined, b: Verdict | undefined) {
  if (!a) return b;
  if (!b) return a;
  return VERDICT_PRIORITY[a] >= VERDICT_PRIORITY[b] ? a : b;
}

function reason(
  code: string,
  message: string,
  source: string
): PreCallDiagnosticReason {
  return { code, message, source };
}

function warning(
  code: string,
  message: string,
  source: string
): PreCallDiagnosticWarning {
  return { code, message, source };
}

function assessIce(ice: PreCallIceReport | undefined): Assessment {
  if (!ice) return emptyAssessment();

  const assessment = emptyAssessment();
  const { reasons, warnings } = assessment;
  const hasCandidates = ice.candidates.length > 0;

  if (!hasCandidates) {
    reasons.push(
      reason(
        IceReasonCode.NoCandidates,
        'No ICE candidates were gathered.',
        'ice'
      )
    );
    assessment.verdict = 'inconclusive';
  }

  // The current ICE report exposes this directly. Guard with hasCandidates
  // because an empty candidate count also satisfies the module's flag.
  if (hasCandidates && ice.onlyHostCandidates) {
    if (ice.hasSelectedPair) {
      warnings.push(
        warning(
          IceReasonCode.OnlyHostCandidates,
          'Only host ICE candidates were found. Connectivity succeeded, but NAT traversal may not be possible.',
          'ice'
        )
      );
    } else {
      reasons.push(
        reason(
          IceReasonCode.OnlyHostCandidates,
          'Only host ICE candidates were found. NAT traversal may not be possible.',
          'ice'
        )
      );
      assessment.verdict = worseVerdict(assessment.verdict, 'degraded');
    }
  }

  // isTurnRequired describes the selected pair, not the complete candidate
  // set.
  if (ice.isTurnRequired) {
    reasons.push(
      reason(
        IceReasonCode.TurnRequired,
        'The selected ICE candidate pair requires a TURN relay.',
        'ice'
      )
    );
    assessment.verdict = worseVerdict(assessment.verdict, 'degraded');
  }

  const connectionAttempted =
    ice.iceConnectionState !== undefined && ice.iceConnectionState !== 'new';
  if (hasCandidates && !ice.hasSelectedPair && connectionAttempted) {
    reasons.push(
      reason(
        IceReasonCode.NoSelectedPair,
        'No ICE candidate pair was selected. Connectivity failed.',
        'ice'
      )
    );
    assessment.verdict = worseVerdict(assessment.verdict, 'blocked');
  }

  if (ice.candidateGatheringCompleted === false) {
    reasons.push(
      reason(
        IceReasonCode.GatheringTimeout,
        'ICE gathering did not complete within the timeout.',
        'ice'
      )
    );
    assessment.verdict = worseVerdict(assessment.verdict, 'degraded');
  }

  // serverCandidateComparison is now the entries array itself.
  const unavailableServers = (ice.serverCandidateComparison ?? []).filter(
    ({ hasCandidates }) => !hasCandidates
  );
  if (unavailableServers.length > 0) {
    warnings.push(
      warning(
        IceReasonCode.ServerNoCandidates,
        `${unavailableServers.length} configured ICE server${unavailableServers.length === 1 ? '' : 's'} produced no candidates.`,
        'ice'
      )
    );
  }

  if (ice.hasMultipleNetworkInterfaces) {
    warnings.push(
      warning(
        IceReasonCode.MultipleInterfaces,
        'Multiple network interfaces were detected on the host.',
        'ice'
      )
    );
  }

  if (ice.vpnDetected) {
    warnings.push(
      warning(
        IceReasonCode.VpnDetected,
        'A VPN appears to be active and may affect media routing.',
        'ice'
      )
    );
  }

  if (!assessment.verdict && hasCandidates) assessment.verdict = 'ready';
  return assessment;
}

function assessServerTestStatus(test: PreCallServerTestReport): Assessment {
  if (test.established && !test.error) return emptyAssessment();

  const urls = Array.isArray(test.server.urls)
    ? test.server.urls.join(', ')
    : test.server.urls;
  return {
    verdict: 'degraded',
    reasons: [
      reason(
        'ice_server_failed',
        test.error
          ? `ICE server [${urls}] failed: ${test.error}`
          : `ICE server [${urls}] did not establish a diagnostic call.`,
        'ice'
      ),
    ],
    warnings: [],
  };
}

function assessNetwork(network: PreCallNetworkReport | undefined): Assessment {
  if (!network) return emptyAssessment();

  const assessment = emptyAssessment();
  const { reasons, warnings } = assessment;

  // Metric classification and messages belong to the network module. Carry
  // them through instead of reproducing its thresholds here.
  if (network.reasons?.length) {
    reasons.push(...network.reasons);
    assessment.verdict = 'degraded';
  }

  switch (network.quality) {
    case 'poor':
      reasons.push(
        reason(
          NetworkReasonCode.PoorQuality,
          'Network quality is poor.',
          'network'
        )
      );
      assessment.verdict = worseVerdict(assessment.verdict, 'blocked');
      break;
    case 'fair':
      warnings.push(
        warning(
          NetworkReasonCode.FairQuality,
          'Network quality is fair.',
          'network'
        )
      );
      assessment.verdict = worseVerdict(assessment.verdict, 'degraded');
      break;
    case 'good':
      assessment.verdict = worseVerdict(assessment.verdict, 'ready');
      break;
  }

  const directions = [network.inbound, network.outbound];
  const availableDirections = directions.filter(
    (direction): direction is NonNullable<typeof direction> => !!direction
  );

  // No direction objects means there was no RTP evidence to assess. It is not
  // equivalent to two explicitly non-flowing directions.
  if (availableDirections.length > 0) {
    const flowingDirections = availableDirections.filter(
      ({ flowing }) => flowing
    ).length;

    if (availableDirections.length === 2 && flowingDirections === 2) {
      assessment.verdict = worseVerdict(assessment.verdict, 'ready');
    } else if (flowingDirections > 0) {
      reasons.push(
        reason(
          NetworkReasonCode.OneWayAudio,
          'Audio RTP is flowing in only one direction.',
          'network'
        )
      );
      assessment.verdict = worseVerdict(assessment.verdict, 'blocked');
    } else {
      reasons.push(
        reason(
          NetworkReasonCode.NoAudioFlow,
          'No inbound or outbound audio RTP is flowing.',
          'network'
        )
      );
      assessment.verdict = worseVerdict(assessment.verdict, 'blocked');
    }
  }

  return assessment;
}

function assessMicrophone(
  microphone: PreCallMicrophoneReport | undefined
): Assessment {
  if (!microphone) return emptyAssessment();

  const assessment = emptyAssessment();
  if (microphone.reasons?.length) {
    // Permission/device/capture/silence reasons are already normalized by the
    // microphone module. Reusing them avoids duplicate and conflicting codes.
    assessment.reasons.push(...microphone.reasons);
  }

  const permissionDenied =
    microphone.permissionState === 'denied' ||
    microphone.permissionGranted === false ||
    microphone.captureError === 'permission_denied';
  const blocked =
    microphone.deviceAvailable === false ||
    microphone.captureError !== undefined;
  const silent =
    microphone.activeCapturePerformed === true &&
    microphone.audioDetected === false;

  if (permissionDenied) {
    assessment.verdict = 'permission_denied';
  } else if (blocked) {
    assessment.verdict = 'blocked';
  } else if (silent) {
    assessment.verdict = 'degraded';
  } else if (
    (microphone.activeCapturePerformed === true &&
      microphone.audioDetected === true) ||
    (microphone.activeCapturePerformed !== true &&
      microphone.permissionGranted === true &&
      microphone.deviceAvailable !== false)
  ) {
    assessment.verdict = 'ready';
  }

  return assessment;
}

/**
 * Build the overall verdict from current module reports.
 *
 * Module reports own their detailed findings; this function only adds the few
 * cross-module/aggregate findings and applies the worst-verdict-wins policy.
 */
export function buildVerdict(
  report: VerdictInput,
  error?: Error
): {
  verdict: Verdict;
  reasons: PreCallDiagnosticReason[];
  warnings: PreCallDiagnosticWarning[];
} {
  const assessments = [
    assessIce(report.ice),
    assessNetwork(report.network),
    assessMicrophone(report.microphone),
    ...(report.serverTests ?? []).flatMap((test) => [
      assessIce(test.ice),
      assessNetwork(test.network),
      assessServerTestStatus(test),
    ]),
  ];
  const reasons = assessments.flatMap((assessment) => assessment.reasons);
  const warnings = assessments.flatMap((assessment) => assessment.warnings);
  let verdict = assessments.reduce<Verdict | undefined>(
    (combined, assessment) => worseVerdict(combined, assessment.verdict),
    undefined
  );

  if (error) {
    reasons.push(
      reason(
        'diagnostic_run_error',
        `Diagnostic run encountered an error: ${error.message}`,
        'diagnostic'
      )
    );
    verdict = worseVerdict(verdict, 'blocked');
  }

  return { verdict: verdict ?? 'inconclusive', reasons, warnings };
}
