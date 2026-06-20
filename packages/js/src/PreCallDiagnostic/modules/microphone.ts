/**
 * Microphone permission and device availability report module.
 *
 * T6 (VSDK-303) — Checks microphone permission state and device availability
 * without calling getUserMedia.
 *
 * T7 (VSDK-304) will add active microphone capture and audio-level checks
 * on top of this module's outputs.
 *
 * This module:
 * 1. Checks microphone permission state via the browser Permissions API
 *    when available (Chrome, Edge). Falls back to 'unsupported' when unavailable.
 * 2. Checks whether audio input devices are available via enumerateDevices.
 * 3. Avoids leaking device labels unless already permitted and needed by
 *    existing SDK conventions.
 * 4. Returns structured permission/device state with reason codes for the
 *    verdict module to consume.
 */

import type {
  PreCallMicrophoneReport,
  PreCallMicrophoneOptions,
  PreCallDiagnosticReason,
  MicrophonePermissionState,
} from '../types';
import type {
  PreCallDiagnosticContext,
} from '../context';

/**
 * Browser environment abstraction for testing.
 *
 * Provides access to the browser APIs this module needs without
 * directly importing `navigator`, so tests can inject mocks.
 */
export interface BrowserEnv {
  permissions?: {
    query?(descriptor: PermissionDescriptor): Promise<PermissionStatus>;
  };
  mediaDevices?: {
    enumerateDevices?(): Promise<MediaDeviceInfo[]>;
  };
}

/**
 * Get the browser environment from the global navigator object.
 * Returns a safe subset that may have undefined fields if APIs are unavailable.
 */
function getBrowserEnv(): BrowserEnv {
  if (typeof navigator === 'undefined') {
    return {};
  }
  return {
    permissions: navigator.permissions ?? undefined,
    mediaDevices: navigator.mediaDevices ?? undefined,
  };
}

/**
 * Check the microphone permission state using the Permissions API.
 *
 * Returns:
 * - 'granted' if the user has already granted microphone permission.
 * - 'denied' if the user has permanently denied microphone permission.
 * - 'prompt' if the user has not yet been asked (permission will be requested on getUserMedia).
 * - 'unknown' if the Permissions API query fails or returns an unexpected state.
 * - 'unsupported' if the Permissions API is not available (Firefox, Safari).
 */
async function checkMicrophonePermission(
  env: BrowserEnv
): Promise<MicrophonePermissionState> {
  if (
    !env.permissions ||
    typeof env.permissions.query !== 'function'
  ) {
    return 'unsupported';
  }

  try {
    const result = await env.permissions.query({
      name: 'microphone' as PermissionName,
    });

    switch (result.state) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'prompt':
        return 'prompt';
      default:
        // Unknown state — could be a browser-specific extension
        return 'unknown';
    }
  } catch {
    // The Permissions API may throw if 'microphone' is not a recognized
    // permission name (e.g., Firefox does not support it).
    return 'unsupported';
  }
}

/**
 * Check audio input device availability via enumerateDevices.
 *
 * Returns information about the number of audio input devices and
 * whether their labels are accessible (which implies permission was granted).
 *
 * Returns undefined if enumerateDevices is not available.
 */
async function checkDeviceAvailability(
  env: BrowserEnv
): Promise<{
  deviceCount: number;
  deviceAvailable: boolean;
  labelsAccessible: boolean;
} | undefined> {
  if (
    !env.mediaDevices ||
    typeof env.mediaDevices.enumerateDevices !== 'function'
  ) {
    return undefined;
  }

  try {
    const devices = await env.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(
      (device) => device.kind === 'audioinput'
    );

    // If at least one device has a non-empty label, permission was granted.
    // Without permission, labels are empty strings.
    const labelsAccessible = audioInputs.some(
      (device) => device.label && device.label.length > 0
    );

    return {
      deviceCount: audioInputs.length,
      deviceAvailable: audioInputs.length > 0,
      labelsAccessible,
    };
  } catch {
    // enumerateDevices can fail in some environments
    return undefined;
  }
}

/**
 * Build reason entries from the microphone check results.
 *
 * Only produces reasons for problematic states (denied, no device).
 * Normal states (granted, prompt) do not produce reasons.
 */
function buildReasons(
  permissionState: MicrophonePermissionState | undefined,
  deviceAvailable: boolean | undefined
): PreCallDiagnosticReason[] {
  const reasons: PreCallDiagnosticReason[] = [];

  if (permissionState === 'denied') {
    reasons.push({
      code: 'microphone_permission_denied',
      message: 'Microphone permission has been denied by the user.',
      source: 'microphone',
    });
  }

  if (deviceAvailable === false) {
    reasons.push({
      code: 'microphone_no_device',
      message: 'No audio input device is available.',
      source: 'microphone',
    });
  }

  return reasons;
}

/**
 * Resolve the effective microphone options from the diagnostic context.
 *
 * Handles the `boolean | PreCallMicrophoneOptions` union type:
 * - `true` or `undefined` → enable with defaults
 * - `false` → disabled (should not reach this function)
 * - `PreCallMicrophoneOptions` → use individual option flags
 */
function resolveMicrophoneOptions(
  options: boolean | PreCallMicrophoneOptions | undefined
): { checkPermission: boolean; checkDeviceAvailability: boolean } {
  if (options === false) {
    // Should not happen — caller should have already skipped
    return { checkPermission: false, checkDeviceAvailability: false };
  }

  if (options === true || options === undefined) {
    return { checkPermission: true, checkDeviceAvailability: true };
  }

  return {
    checkPermission: options.checkPermission !== false,
    checkDeviceAvailability: options.checkDeviceAvailability !== false,
  };
}

/**
 * Build the microphone report section from the diagnostic context.
 *
 * This function is called by PreCallDiagnostic.getMicrophoneReport()
 * when the microphone module is enabled (options.microphone !== false).
 *
 * It checks:
 * 1. Microphone permission state (via Permissions API when available)
 * 2. Audio input device availability (via enumerateDevices)
 * 3. Whether device labels are accessible (implies permission granted)
 *
 * It does NOT call getUserMedia — that is reserved for T7 (VSDK-304)
 * active capture checks.
 *
 * @param context - The diagnostic context with options and call state
 * @param env - Optional browser environment override for testing.
 *              When not provided, the real browser environment is used.
 */
export async function buildPreCallMicrophoneReport(
  context: PreCallDiagnosticContext,
  env?: BrowserEnv
): Promise<PreCallMicrophoneReport | undefined> {
  const browserEnv = env ?? getBrowserEnv();
  const { options } = context;
  const micOptions = resolveMicrophoneOptions(options.microphone);

  const report: PreCallMicrophoneReport = {};

  // 1. Check microphone permission state
  if (micOptions.checkPermission) {
    const permissionState = await checkMicrophonePermission(browserEnv);
    report.permissionState = permissionState;
    report.permissionGranted = permissionState === 'granted';
  }

  // 2. Check device availability
  if (micOptions.checkDeviceAvailability) {
    const deviceInfo = await checkDeviceAvailability(browserEnv);
    if (deviceInfo !== undefined) {
      report.deviceAvailable = deviceInfo.deviceAvailable;
      report.deviceCount = deviceInfo.deviceCount;
      report.labelsAccessible = deviceInfo.labelsAccessible;
    }
  }

  // 3. Build reasons for problematic states
  const reasons = buildReasons(
    report.permissionState,
    report.deviceAvailable
  );
  if (reasons.length > 0) {
    report.reasons = reasons;
  }

  // If we couldn't determine anything, return undefined to avoid
  // producing an empty report with no useful information
  if (
    report.permissionState === undefined &&
    report.deviceAvailable === undefined
  ) {
    return undefined;
  }

  return report;
}
