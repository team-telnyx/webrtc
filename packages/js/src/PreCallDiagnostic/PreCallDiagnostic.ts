import Call from '../Modules/Verto/webrtc/Call';
import type { ITelnyxErrorEvent } from '../Modules/Verto/util/errors';
import { createDiagnosticContext } from './context';
import type { PreCallDiagnosticContext } from './context';
import {
  buildPreCallIceReport,
  flattenIceServersByUrl,
  isTurnIceServer,
} from './modules/ice';
import { buildPreCallMicrophoneReport } from './modules/microphone';
import { buildPreCallNetworkReport } from './modules/network';
import { createTimingsCollector } from './modules/timings';
import { buildVerdict } from './modules/verdict';
import type {
  PreCallDiagnosticOptions,
  PreCallDiagnosticReport,
  PreCallDiagnosticRunner,
  PreCallIceReport,
  PreCallMicrophoneReport,
  PreCallNetworkReport,
  PreCallServerTestReport,
  PreCallTimingsReport,
} from './types';

const DEFAULT_CALL_SETUP_TIMEOUT_MS = 30000;
const DEFAULT_STATS_SAMPLE_INTERVAL_MS = 1000;
const DEFAULT_DURATION_MS = 5000;
const NETWORK_ONLY_CALL_DURATION_MS = 3000;
const NETWORK_ONLY_STATS_SAMPLE_INTERVAL_MS = 500;

interface RunTestOptions {
  diagnosticOptions: PreCallDiagnosticOptions;
  iceServers?: RTCIceServer[];
  forceRelayCandidate?: boolean;
  modules: {
    ice: boolean;
    network: boolean;
    microphone: boolean;
  };
  autoHangup: boolean;
}

interface RunTestResult {
  established: boolean;
  setupFailed: boolean;
  callId?: string;
  ice?: PreCallIceReport;
  network?: PreCallNetworkReport;
  microphone?: PreCallMicrophoneReport;
  timings: PreCallTimingsReport;
  raw?: PreCallDiagnosticReport['raw'];
  error?: Error;
}

export class PreCallDiagnostic implements PreCallDiagnosticRunner {
  constructor(private readonly options: PreCallDiagnosticOptions) {}

  async run(): Promise<PreCallDiagnosticReport> {
    switch (this.options.mode) {
      case 'network-only':
        return this.runNetworkOnly();
      case 'microphone-only':
        return this.runMicrophoneOnly(createDiagnosticContext(this.options));
      default:
        return this.runFull();
    }
  }

  private async runFull(): Promise<PreCallDiagnosticReport> {
    const test = await this.runTest({
      diagnosticOptions: this.options,
      modules: {
        ice: !!this.options.ice,
        network: !!this.options.network,
        microphone: !!this.options.microphone,
      },
      autoHangup: this.options.autoHangup !== false,
    });

    if (test.setupFailed) {
      if (test.error) {
        return createReport(
          { callId: test.callId, timings: test.timings },
          test.error
        );
      }
      return {
        version: 1,
        verdict: 'inconclusive',
        reasons: [
          {
            code: 'call_setup_timeout',
            message: 'The diagnostic call did not reach the established state',
            source: 'diagnostic',
          },
        ],
        callId: test.callId,
        timings: test.timings,
      };
    }

    return createReport(
      {
        ice: test.ice,
        network: test.network,
        microphone: test.microphone,
        timings: test.timings,
        callId: test.callId,
        raw: test.raw,
      },
      test.error
    );
  }

  private async runNetworkOnly(): Promise<PreCallDiagnosticReport> {
    const iceServers = (
      this.options.client as unknown as { iceServers?: RTCIceServer[] }
    ).iceServers;
    const configuredIceServers =
      this.options.rtcConfig?.iceServers ?? iceServers ?? [];
    const servers = flattenIceServersByUrl(configuredIceServers);
    let serverTests: PreCallServerTestReport[] = [];
    const timings = createTimingsCollector();
    let result: PreCallDiagnosticReport | undefined;

    try {
      serverTests = await Promise.all(
        servers.map(async (server): Promise<PreCallServerTestReport> => {
          const test = await this.runTest({
            diagnosticOptions: {
              ...this.options,
              durationMs: NETWORK_ONLY_CALL_DURATION_MS,
              statsSampleIntervalMs: NETWORK_ONLY_STATS_SAMPLE_INTERVAL_MS,
              rtcConfig: {
                ...this.options.rtcConfig,
                iceServers: [server],
              },
            },
            iceServers: [server],
            forceRelayCandidate: isTurnIceServer(server),
            modules: {
              ice: true,
              network: !!this.options.network,
              microphone: false,
            },
            autoHangup: true,
          });
          const error = getServerTestError(test);

          return {
            server,
            established: error === undefined,
            callId: test.callId,
            ice: test.ice,
            network: test.network,
            timings: test.timings,
            error,
          };
        })
      );
      result = createReport(
        { serverTests, timings: timings.build() },
        undefined,
        { networkOnly: true }
      );
      return result;
    } catch (error) {
      result = createReport({ timings: timings.build() }, toError(error), {
        networkOnly: true,
      });
      return result;
    } finally {
      if (result?.timings) {
        timings.complete(result.timings);
      }
    }
  }

  private async runTest(options: RunTestOptions): Promise<RunTestResult> {
    const context = createDiagnosticContext(options.diagnosticOptions);
    const timings = createTimingsCollector();
    let call: Call | undefined;
    let callError: Error | undefined;
    let established = false;
    let result: RunTestResult | undefined;
    const onCallError = (event: ITelnyxErrorEvent) => {
      if (event.callId === call?.id) {
        callError = toError(event.error);
      }
    };

    options.diagnosticOptions.client.on('telnyx.error', onCallError);

    try {
      call = this.createDiagnosticCall(
        options.diagnosticOptions,
        options.iceServers,
        options.forceRelayCandidate
      );
      context.call = call;

      established = await this.waitForCallEstablishment(call);
      if (!established) {
        result = {
          established: false,
          setupFailed: true,
          callId: call.id,
          timings: timings.build({ call }),
          error: callError,
        };
        return result;
      }

      await this.collectSamples(call, context);

      const ice = options.modules.ice
        ? buildPreCallIceReport(context)
        : undefined;
      const network = options.modules.network
        ? buildPreCallNetworkReport(context)
        : undefined;
      const microphone = options.modules.microphone
        ? await buildPreCallMicrophoneReport(context)
        : undefined;

      result = {
        established: true,
        setupFailed: false,
        callId: call.id,
        ice,
        network,
        microphone,
        timings: timings.build({ call }),
        raw: {
          samples: context.statsSamples.length
            ? context.statsSamples
            : undefined,
        },
      };
      return result;
    } catch (error) {
      context.error = toError(error);
      result = {
        established,
        setupFailed: false,
        callId: call?.id,
        timings: timings.build({ call }),
        error: context.error,
      };
      return result;
    } finally {
      options.diagnosticOptions.client.off('telnyx.error', onCallError);
      if (call && options.autoHangup) {
        try {
          await call.hangup();
        } catch {
          // The report should survive cleanup failures.
        }
      }
      if (result?.timings) {
        timings.complete(result.timings);
      }
    }
  }

  private async runMicrophoneOnly(
    context: PreCallDiagnosticContext
  ): Promise<PreCallDiagnosticReport> {
    const timings = createTimingsCollector();
    let result: PreCallDiagnosticReport | undefined;

    try {
      const microphone = this.options.microphone
        ? await buildPreCallMicrophoneReport(context)
        : undefined;
      result = createReport(
        { microphone, timings: timings.build() },
        context.error
      );
      return result;
    } catch (error) {
      context.error = toError(error);
      result = createReport({ timings: timings.build() }, context.error);
      return result;
    } finally {
      if (result?.timings) {
        timings.complete(result.timings);
      }
    }
  }

  private async waitForCallEstablishment(call: Call): Promise<boolean> {
    const deadline = Date.now() + DEFAULT_CALL_SETUP_TIMEOUT_MS;
    const isCallConnected = () =>
      call.state === 'active' &&
      call.peer?.instance?.connectionState === 'connected';

    while (Date.now() < deadline) {
      if (isCallConnected()) return true;
      if (['done', 'hangup', 'destroy'].includes(call.state)) return false;
      await delay(500);
    }

    return isCallConnected();
  }

  private createDiagnosticCall(
    diagnosticOptions: PreCallDiagnosticOptions,
    iceServersOverride?: RTCIceServer[],
    forceRelayCandidate = false
  ): Call {
    const {
      client,
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug,
      rtcConfig,
    } = diagnosticOptions;

    return client.newCall({
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug: debug === true,
      iceServers: iceServersOverride ?? rtcConfig?.iceServers,
      forceRelayCandidate,
    });
  }

  private async collectSamples(
    call: Call,
    context: PreCallDiagnosticContext
  ): Promise<void> {
    const durationMs = context.options.durationMs ?? DEFAULT_DURATION_MS;
    const intervalMs =
      context.options.statsSampleIntervalMs ?? DEFAULT_STATS_SAMPLE_INTERVAL_MS;
    const deadline = Date.now() + durationMs;

    while (Date.now() < deadline) {
      try {
        const stats = await call.peer.instance?.getStats();
        if (stats) context.statsSamples.push(stats);
      } catch {
        // A transient stats read must not abort the diagnostic. Continue
        // sampling until the configured duration expires.
      }
      await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
    }
  }
}

function createReport(
  report: Partial<PreCallDiagnosticReport>,
  error?: Error,
  verdictOptions?: Parameters<typeof buildVerdict>[2]
): PreCallDiagnosticReport {
  const { verdict, reasons, warnings } = buildVerdict(
    report,
    error,
    verdictOptions
  );
  return {
    ...report,
    version: 1,
    verdict: verdict ?? 'inconclusive',
    reasons: reasons.length ? reasons : undefined,
    warnings: warnings.length ? warnings : undefined,
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function getServerTestError(test: RunTestResult): string | undefined {
  if (test.error) return test.error.message;
  if (test.setupFailed) {
    return 'The diagnostic call did not reach the established state';
  }
  if (!test.ice) return 'No ICE report was produced';
  if (test.ice.candidates.length === 0) {
    return 'No ICE candidates were gathered';
  }
  if (!test.ice.hasSelectedPair) {
    return 'No ICE candidate pair was selected';
  }
  return undefined;
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
