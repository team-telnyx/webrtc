/**
 * Tests for the microphone permission and device availability module (T6/VSDK-303).
 *
 * These tests verify:
 * - Permission state checking via the Permissions API
 * - Fallback to 'unsupported' when Permissions API is unavailable
 * - Device availability checking via enumerateDevices
 * - No device labels leaked in the report output
 * - Reason codes for denied/no-device states
 * - Option gating: checkPermission and checkDeviceAvailability can be disabled
 * - Unsupported APIs return 'unknown'/'unsupported' instead of throwing
 *
 * Browser APIs are mocked via the `env` parameter injection rather than
 * overriding `navigator` globals, which is incompatible with the existing
 * test setup (browsers.ts defines `navigator.mediaDevices` as non-configurable).
 */

import { buildPreCallMicrophoneReport, BrowserEnv } from '../modules/microphone';
import type {
  PreCallDiagnosticContext,
} from '../context';
import type {
  PreCallDiagnosticOptions,
} from '../types';

// --- Mock helpers ---

/**
 * Create a diagnostic context with the given options.
 * Uses minimal required options for testing.
 */
function createContext(
  overrides: Partial<PreCallDiagnosticOptions> = {}
): PreCallDiagnosticContext {
  const options: PreCallDiagnosticOptions = {
    client: {
      newCall: jest.fn().mockReturnValue({
        id: 'test-call-id',
        hangup: jest.fn(),
      }),
    },
    destinationNumber: '1234',
    ...overrides,
  };
  return {
    options,
    statsSamples: [],
    timings: { startedAt: Date.now() },
  };
}

// --- Browser environment mocks ---

function createEnv(overrides: Partial<BrowserEnv> = {}): BrowserEnv {
  return overrides;
}

function envWithPermission(state: PermissionState, extra: Partial<BrowserEnv> = {}): BrowserEnv {
  return createEnv({
    permissions: {
      query: jest.fn().mockResolvedValue({ state }),
    },
    ...extra,
  });
}

function envWithPermissionError(extra: Partial<BrowserEnv> = {}): BrowserEnv {
  return createEnv({
    permissions: {
      query: jest.fn().mockRejectedValue(new TypeError('Not supported')),
    },
    ...extra,
  });
}

function envWithoutPermissions(extra: Partial<BrowserEnv> = {}): BrowserEnv {
  return createEnv({
    permissions: undefined,
    ...extra,
  });
}

function envWithDevices(devices: MediaDeviceInfo[], extra: Partial<BrowserEnv> = {}): BrowserEnv {
  return createEnv({
    mediaDevices: {
      enumerateDevices: jest.fn().mockResolvedValue(devices),
    },
    ...extra,
  });
}

function envWithDevicesError(extra: Partial<BrowserEnv> = {}): BrowserEnv {
  return createEnv({
    mediaDevices: {
      enumerateDevices: jest.fn().mockRejectedValue(new Error('Not available')),
    },
    ...extra,
  });
}

function envWithoutDevices(extra: Partial<BrowserEnv> = {}): BrowserEnv {
  return createEnv({
    mediaDevices: undefined,
    ...extra,
  });
}

// --- Device factory helpers ---

function createAudioInputDevice(
  overrides: Partial<MediaDeviceInfo> = {}
): MediaDeviceInfo {
  return {
    deviceId: overrides.deviceId ?? 'default-mic',
    kind: 'audioinput',
    label: overrides.label ?? 'Default Microphone',
    groupId: overrides.groupId ?? 'default-group',
    toJSON: jest.fn(),
    ...overrides,
  };
}

function createAudioOutputDevice(
  overrides: Partial<MediaDeviceInfo> = {}
): MediaDeviceInfo {
  return {
    deviceId: overrides.deviceId ?? 'default-speaker',
    kind: 'audiooutput',
    label: overrides.label ?? 'Default Speaker',
    groupId: overrides.groupId ?? 'default-group',
    toJSON: jest.fn(),
    ...overrides,
  };
}

function createVideoInputDevice(
  overrides: Partial<MediaDeviceInfo> = {}
): MediaDeviceInfo {
  return {
    deviceId: overrides.deviceId ?? 'default-cam',
    kind: 'videoinput',
    label: overrides.label ?? 'Default Camera',
    groupId: overrides.groupId ?? 'default-group',
    toJSON: jest.fn(),
    ...overrides,
  };
}

// --- Tests ---

describe('buildPreCallMicrophoneReport', () => {
  describe('permission checking', () => {
    it('returns "granted" when Permissions API reports granted', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('granted');
      expect(report?.permissionGranted).toBe(true);
    });

    it('returns "denied" when Permissions API reports denied', async () => {
      const env = envWithPermission('denied', envWithDevices([]));
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('denied');
      expect(report?.permissionGranted).toBe(false);
    });

    it('returns "prompt" when Permissions API reports prompt', async () => {
      const env = envWithPermission(
        'prompt',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('prompt');
      expect(report?.permissionGranted).toBe(false);
    });

    it('returns "unsupported" when Permissions API is not available', async () => {
      const env = envWithoutPermissions(
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('unsupported');
      expect(report?.permissionGranted).toBe(false);
    });

    it('returns "unsupported" when Permissions API throws', async () => {
      const env = envWithPermissionError(
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('unsupported');
    });

    it('returns "unknown" for unrecognized permission state', async () => {
      const env: BrowserEnv = {
        permissions: {
          query: jest.fn().mockResolvedValue({ state: 'custom-state' }),
        },
        mediaDevices: {
          enumerateDevices: jest
            .fn()
            .mockResolvedValue([createAudioInputDevice()]),
        },
      };
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('unknown');
    });
  });

  describe('device availability', () => {
    it('reports deviceAvailable=true when audio input devices exist', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioInputDevice(), createAudioOutputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.deviceAvailable).toBe(true);
      expect(report?.deviceCount).toBe(1);
    });

    it('reports deviceAvailable=false when no audio input devices exist', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioOutputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.deviceAvailable).toBe(false);
      expect(report?.deviceCount).toBe(0);
    });

    it('reports deviceAvailable=false when device list is empty', async () => {
      const env = envWithPermission('granted', envWithDevices([]));
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.deviceAvailable).toBe(false);
      expect(report?.deviceCount).toBe(0);
    });

    it('counts only audio input devices, not video or audio output', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([
          createAudioInputDevice({ deviceId: 'mic1' }),
          createAudioInputDevice({ deviceId: 'mic2' }),
          createAudioOutputDevice(),
          createVideoInputDevice(),
        ])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.deviceCount).toBe(2);
      expect(report?.deviceAvailable).toBe(true);
    });

    it('returns undefined device fields when enumerateDevices is not available', async () => {
      const env = envWithPermission('granted', envWithoutDevices());
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('granted');
      expect(report?.deviceAvailable).toBeUndefined();
      expect(report?.deviceCount).toBeUndefined();
      expect(report?.labelsAccessible).toBeUndefined();
    });

    it('returns undefined device fields when enumerateDevices throws', async () => {
      const env = envWithPermission('granted', envWithDevicesError());
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.deviceAvailable).toBeUndefined();
    });
  });

  describe('device labels', () => {
    it('reports labelsAccessible=true when device has a non-empty label', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([
          createAudioInputDevice({ label: 'Built-in Microphone' }),
        ])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.labelsAccessible).toBe(true);
    });

    it('reports labelsAccessible=false when device labels are empty', async () => {
      const env = envWithPermission(
        'prompt',
        envWithDevices([createAudioInputDevice({ label: '' })])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.labelsAccessible).toBe(false);
    });

    it('does not leak device labels in the report', async () => {
      const env = envWithPermission(
        'prompt',
        envWithDevices([
          createAudioInputDevice({ label: 'Sensitive Microphone Name' }),
        ])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      // The report should NOT contain any label strings
      const reportStr = JSON.stringify(report);
      expect(reportStr).not.toContain('Sensitive Microphone Name');
    });
  });

  describe('reason codes', () => {
    it('produces microphone_permission_denied reason when permission is denied', async () => {
      const env = envWithPermission('denied', envWithDevices([]));
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report?.reasons).toBeDefined();
      expect(report?.reasons?.length).toBeGreaterThanOrEqual(1);
      expect(
        report?.reasons?.some(
          (r) => r.code === 'microphone_permission_denied'
        )
      ).toBe(true);
    });

    it('produces microphone_no_device reason when no audio input devices', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioOutputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report?.reasons).toBeDefined();
      expect(
        report?.reasons?.some((r) => r.code === 'microphone_no_device')
      ).toBe(true);
    });

    it('produces both reasons when permission denied AND no device', async () => {
      const env = envWithPermission('denied', envWithDevices([]));
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report?.reasons).toBeDefined();
      expect(report?.reasons?.length).toBe(2);
      expect(
        report?.reasons?.some(
          (r) => r.code === 'microphone_permission_denied'
        )
      ).toBe(true);
      expect(
        report?.reasons?.some((r) => r.code === 'microphone_no_device')
      ).toBe(true);
    });

    it('does not produce reasons when everything is fine', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report?.reasons).toBeUndefined();
    });

    it('reason codes have source: "microphone"', async () => {
      const env = envWithPermission('denied', envWithDevices([]));
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      report?.reasons?.forEach((r) => {
        expect(r.source).toBe('microphone');
        expect(r.code).toMatch(/^microphone_/);
        expect(r.message).toBeTruthy();
      });
    });

    it('does not produce reason for prompt state', async () => {
      const env = envWithPermission(
        'prompt',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report?.reasons).toBeUndefined();
    });
  });

  describe('option gating', () => {
    it('skips permission check when checkPermission is false', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext({
        microphone: { checkPermission: false, checkDeviceAvailability: true },
      });
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBeUndefined();
      expect(report?.permissionGranted).toBeUndefined();
      expect(report?.deviceAvailable).toBe(true);
    });

    it('skips device availability check when checkDeviceAvailability is false', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext({
        microphone: { checkPermission: true, checkDeviceAvailability: false },
      });
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('granted');
      expect(report?.deviceAvailable).toBeUndefined();
      expect(report?.deviceCount).toBeUndefined();
    });

    it('runs both checks when microphone is true', async () => {
      const env = envWithPermission(
        'granted',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext({ microphone: true });
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('granted');
      expect(report?.deviceAvailable).toBe(true);
    });

    it('runs both checks when microphone is undefined (default)', async () => {
      const env = envWithPermission(
        'prompt',
        envWithDevices([createAudioInputDevice()])
      );
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('prompt');
      expect(report?.deviceAvailable).toBe(true);
    });
  });

  describe('unsupported / unknown APIs', () => {
    it('returns report with permissionState=unsupported when both APIs are unavailable', async () => {
      // Empty env — no permissions API, no mediaDevices
      const env: BrowserEnv = {};
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      // Permission check runs and returns 'unsupported' (a valid finding)
      // Device check is skipped because mediaDevices is unavailable
      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('unsupported');
      expect(report?.deviceAvailable).toBeUndefined();
    });

    it('returns report with permissionState=unsupported when only Permissions API is unavailable', async () => {
      const env: BrowserEnv = {
        mediaDevices: {
          enumerateDevices: jest
            .fn()
            .mockResolvedValue([createAudioInputDevice()]),
        },
      };
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('unsupported');
      expect(report?.deviceAvailable).toBe(true);
    });

    it('returns report without device fields when only enumerateDevices is unavailable', async () => {
      const env: BrowserEnv = {
        permissions: {
          query: jest.fn().mockResolvedValue({ state: 'prompt' }),
        },
      };
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report).toBeDefined();
      expect(report?.permissionState).toBe('prompt');
      expect(report?.deviceAvailable).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles enumerateDevices returning an empty array for audio inputs', async () => {
      // No audio input devices but has video devices
      const env: BrowserEnv = {
        permissions: {
          query: jest.fn().mockResolvedValue({ state: 'granted' }),
        },
        mediaDevices: {
          enumerateDevices: jest
            .fn()
            .mockResolvedValue([createVideoInputDevice()]),
        },
      };
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report?.deviceAvailable).toBe(false);
      expect(report?.deviceCount).toBe(0);
      expect(
        report?.reasons?.some((r) => r.code === 'microphone_no_device')
      ).toBe(true);
    });

    it('handles permissions.query returning null (defensive)', async () => {
      const env: BrowserEnv = {
        permissions: {
          query: jest.fn().mockResolvedValue(null),
        },
        mediaDevices: {
          enumerateDevices: jest
            .fn()
            .mockResolvedValue([createAudioInputDevice()]),
        },
      };
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      // Should gracefully handle the null return
      expect(report).toBeDefined();
    });

    it('produces no device reason when deviceAvailable is undefined (unknown)', async () => {
      const env: BrowserEnv = {
        permissions: {
          query: jest.fn().mockResolvedValue({ state: 'denied' }),
        },
        // No mediaDevices — deviceAvailable will be undefined
      };
      const context = createContext();
      const report = await buildPreCallMicrophoneReport(context, env);

      expect(report?.reasons).toBeDefined();
      expect(report?.reasons?.length).toBe(1);
      expect(report?.reasons?.[0].code).toBe('microphone_permission_denied');
    });
  });
});
