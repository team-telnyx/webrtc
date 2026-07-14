import Call from '../Modules/Verto/webrtc/Call';
import { createDiagnosticContext } from './context';
import type { PreCallDiagnosticContext } from './context';
import { buildPreCallIceReport } from './modules/ice';
import { buildPreCallMicrophoneReport } from './modules/microphone';
import { buildPreCallNetworkReport } from './modules/network';
import {
  createTimingsCollector,
  type TimingsCollector,
} from './modules/timings';
import { buildVerdict } from './modules/verdict';
import type {
  PreCallDiagnosticOptions,
  PreCallDiagnosticReport,
  PreCallDiagnosticRunner,
} from './types';

const DEFAULT_CALL_SETUP_TIMEOUT_MS = 30000;
const DEFAULT_STATS_SAMPLE_INTERVAL_MS = 1000;
const DEFAULT_DURATION_MS = 5000;

export class PreCallDiagnostic implements PreCallDiagnosticRunner {
  constructor(private readonly options: PreCallDiagnosticOptions) {}

  async run(): Promise<PreCallDiagnosticReport> {
    const context = createDiagnosticContext(this.options);
    const timings = createTimingsCollector();

    switch (this.options.mode) {
      case 'network-only':
        return this.runNetworkOnly(context, timings);
      case 'microphone-only':
        return this.runMicrophoneOnly(context, timings);
      default:
        return this.runFull(context, timings);
    }
  }

  private async runFull(
    context: PreCallDiagnosticContext,
    timings: TimingsCollector
  ): Promise<PreCallDiagnosticReport> {
    let call: Call | undefined;
    let result: PreCallDiagnosticReport | undefined;

    try {
      call = this.createDiagnosticCall();
      context.call = call;

      if (!(await this.waitForCallEstablishment(call))) {
        timings.markCompleted();
        result = {
          version: 1,
          verdict: 'inconclusive',
          reasons: [
            {
              code: 'call_setup_timeout',
              message:
                'The diagnostic call did not reach the established state',
              source: 'diagnostic',
            },
          ],
          callId: call.id,
          timings: timings.build({ call, callId: call.id }),
        };
        return result;
      }

      timings.markStatsSamplingStarted();
      await this.collectSamples(call, context);
      timings.markStatsSamplingCompleted();

      const [ice, microphone] = await Promise.all([
        this.options.ice ? buildPreCallIceReport(context) : undefined,
        this.options.microphone
          ? buildPreCallMicrophoneReport(context)
          : undefined,
      ]);
      const network = this.options.network
        ? buildPreCallNetworkReport(context)
        : undefined;

      timings.markCompleted();
      const report: Partial<PreCallDiagnosticReport> = {
        ice,
        network,
        microphone,
        timings: timings.build({ call, callId: call.id }),
        callId: call.id,
        raw: {
          samples: context.statsSamples.length
            ? context.statsSamples
            : undefined,
        },
      };
      result = createReport(report, context.error);
      return result;
    } catch (error) {
      context.error = toError(error);
      timings.markCompleted();
      result = createReport(
        {
          callId: call?.id,
          timings: timings.build({ call, callId: call?.id }),
        },
        context.error
      );
      return result;
    } finally {
      timings.markCleanupStarted();
      if (call && this.options.autoHangup !== false) {
        await this.cleanupCall(call);
      }
      timings.markCleanupCompleted();
      timings.finalizeTimings(result?.timings);
    }
  }

  private async runNetworkOnly(
    context: PreCallDiagnosticContext,
    timings: TimingsCollector
  ): Promise<PreCallDiagnosticReport> {
    const iceServers = (
      this.options.client as unknown as { iceServers?: RTCIceServer[] }
    ).iceServers;
    const rtcConfig = this.options.rtcConfig ?? { iceServers };
    const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
    let peerConnection: RTCPeerConnection | undefined;
    let result: PreCallDiagnosticReport | undefined;

    try {
      peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnection.createDataChannel('precall-diagnostic');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      timings.markStatsSamplingStarted();
      await this.waitForIceGathering(peerConnection, durationMs);
      const stats = await peerConnection.getStats();
      context.statsSamples.push(stats);
      timings.markStatsSamplingCompleted();

      context.call = {
        peer: { instance: peerConnection },
      } as unknown as Call;
      const ice = this.options.ice
        ? await buildPreCallIceReport(context)
        : undefined;

      timings.markCompleted();
      result = createReport({ ice, timings: timings.build({}) }, context.error);
      return result;
    } catch (error) {
      context.error = toError(error);
      timings.markCompleted();
      result = createReport({ timings: timings.build({}) }, context.error);
      return result;
    } finally {
      timings.markCleanupStarted();
      try {
        peerConnection?.close();
      } catch {
        // The report should survive cleanup failures.
      }
      timings.markCleanupCompleted();
      timings.finalizeTimings(result?.timings);
    }
  }

  private async runMicrophoneOnly(
    context: PreCallDiagnosticContext,
    timings: TimingsCollector
  ): Promise<PreCallDiagnosticReport> {
    let result: PreCallDiagnosticReport | undefined;

    try {
      const microphone = this.options.microphone
        ? await buildPreCallMicrophoneReport(context)
        : undefined;
      timings.markCompleted();
      result = createReport(
        { microphone, timings: timings.build({}) },
        context.error
      );
      return result;
    } catch (error) {
      context.error = toError(error);
      timings.markCompleted();
      result = createReport({ timings: timings.build({}) }, context.error);
      return result;
    } finally {
      timings.markCleanupStarted();
      timings.markCleanupCompleted();
      timings.finalizeTimings(result?.timings);
    }
  }

  private async waitForCallEstablishment(call: Call): Promise<boolean> {
    const deadline =
      Date.now() +
      (this.options.callSetupTimeoutMs ?? DEFAULT_CALL_SETUP_TIMEOUT_MS);

    while (Date.now() < deadline) {
      if (call.state === 'active') return true;
      if (['done', 'hangup', 'destroy'].includes(call.state)) return false;
      await delay(500);
    }

    return call.state === 'active';
  }

  private async waitForIceGathering(
    peerConnection: RTCPeerConnection,
    maxWaitMs: number
  ): Promise<void> {
    const deadline = Date.now() + maxWaitMs;
    while (
      peerConnection.iceGatheringState !== 'complete' &&
      Date.now() < deadline
    ) {
      await delay(100);
    }
  }

  private createDiagnosticCall(): Call {
    const {
      client,
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug,
      rtcConfig,
    } = this.options;

    return client.newCall({
      destinationNumber,
      callerName,
      callerNumber,
      audio,
      debug: debug === true,
      iceServers: rtcConfig?.iceServers,
    });
  }

  private async collectSamples(
    call: Call,
    context: PreCallDiagnosticContext
  ): Promise<void> {
    const durationMs = this.options.durationMs ?? DEFAULT_DURATION_MS;
    const intervalMs =
      this.options.statsSampleIntervalMs ?? DEFAULT_STATS_SAMPLE_INTERVAL_MS;
    const deadline = Date.now() + durationMs;

    while (Date.now() < deadline) {
      const stats = await call.peer.instance?.getStats();
      if (stats) context.statsSamples.push(stats);
      await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
    }
  }

  private async cleanupCall(call: Call): Promise<void> {
    try {
      await call.hangup();
    } catch {
      // The report should survive cleanup failures.
    }
  }
}

function createReport(
  report: Partial<PreCallDiagnosticReport>,
  error?: Error
): PreCallDiagnosticReport {
  const { verdict, reasons, warnings } = buildVerdict(report, error);
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

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
