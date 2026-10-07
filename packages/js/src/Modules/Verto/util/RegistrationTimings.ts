import { GatewayStateType, VertoMethod } from '../webrtc/constants';
import type { ILogEntry } from './LogCollector';
import logger, { isConsoleLogEnabled } from './logger';

export const REGISTRATION_TIMING_MESSAGE = 'Registration timing';

type RegistrationMethod =
  | 'login'
  | 'anonymous_login'
  | VertoMethod.GatewayState;
type TimingStep =
  | 'new TelnyxRTC()'
  | 'TelnyxRTC constructor complete'
  | 'client.connect() called'
  | 'create WebSocket'
  | 'WebSocket construction failed'
  | 'WebSocket open'
  | 'WebSocket closed'
  | 'WebSocket error'
  | 'prepare login request'
  | 'prepare anonymous_login request'
  | 'login failed'
  | 'login response processing started'
  | 'login response processing complete'
  | 'receive server clientReady'
  | 'receive gateway state'
  | 'schedule WebSocket reconnect'
  | 'WebSocket reconnect timer fired'
  | 'schedule gateway state retry'
  | 'gateway state retry timer fired'
  | 'schedule gateway reconnect'
  | 'gateway reconnect timer fired'
  | 'emit telnyx.ready (vertoClientReady) to app'
  | `send ${RegistrationMethod}`
  | `receive ${RegistrationMethod}${'' | ' error'}`;

interface TimingDetails {
  requestId?: string;
  requestMs?: number;
  state?: GatewayStateType;
  generation?: number;
  code?: number;
  attempt?: number;
  delayMs?: number;
}

interface TimingEntry {
  timestamp: string;
  step: TimingStep;
  deltaMs: number;
  elapsedMs: number;
  details?: TimingDetails;
}

interface RegistrationTimingSummary {
  event: 'registration_timing';
  schemaVersion: 1;
  scope: 'initial_registration';
  clientId: string;
  sessionId: string;
  sdkVersion: string;
  startedAt: string;
  timestamp: string;
  clock: 'performance' | 'date';
  clockAdjusted: boolean;
  totalMs: number;
  constructorMs?: number;
  appWaitBeforeConnectMs?: number;
  connectToReadyMs?: number;
  socketAttempts: number;
  droppedSteps: number;
  droppedRequests: number;
  longestInterval: { from: TimingStep; to: TimingStep; durationMs: number };
  steps: TimingEntry[];
}

const roundMs = (value: number): number => Number(value.toFixed(2));
const formatDetails = (details: TimingDetails = {}): string =>
  Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}${key.endsWith('Ms') ? ' ms' : ''}`)
    .join(', ');
const isRegistrationMethod = (method: unknown): method is RegistrationMethod =>
  method === 'login' ||
  method === 'anonymous_login' ||
  method === VertoMethod.GatewayState;

/**
 * Bounded, per-client timing from construction to the first app ready event.
 * Milestones log at info level; completion publishing is deferred until after ready.
 * This class never sends signaling messages or controls connection recovery.
 */
export default class RegistrationTimings {
  public clientId = '';
  private static readonly MAX_STEPS = 128;
  private static readonly MAX_REQUESTS = 32;
  private readonly startedAt: number;
  private readonly startedAtUtc = new Date().toISOString();
  private readonly readClock: () => number;
  private readonly clock: 'performance' | 'date';
  private previousAt: number;
  private previousStep: TimingStep = 'new TelnyxRTC()';
  private clockAdjusted = false;
  private finished = false;
  private constructorFinishedAt?: number;
  private connectStartedAt?: number;
  private socketAttempts = 0;
  private droppedSteps = 0;
  private droppedRequests = 0;
  private longestInterval: RegistrationTimingSummary['longestInterval'];
  private summary?: RegistrationTimingSummary;
  private completedAtUtc?: string;
  private entries: TimingEntry[] = [
    {
      timestamp: this.startedAtUtc,
      step: 'new TelnyxRTC()',
      deltaMs: 0,
      elapsedMs: 0,
    },
  ];
  private readonly requests = new Map<
    string,
    { method: RegistrationMethod; startedAt: number }
  >();

  constructor(private readonly sdkVersion: string) {
    // Choose one clock for the entire trace; never mix epoch and performance time.
    try {
      const read = performance.now.bind(performance);
      const start = read();
      if (!Number.isFinite(start)) throw new Error('Clock unavailable');
      this.readClock = read;
      this.startedAt = start;
      this.clock = 'performance';
    } catch {
      this.readClock = Date.now;
      this.startedAt = this.readClock();
      this.clock = 'date';
    }
    this.previousAt = this.startedAt;
  }

  private now(): number {
    try {
      const value = this.readClock();
      if (Number.isFinite(value) && value >= this.previousAt) return value;
    } catch {
      // Diagnostics must not interrupt signaling if the host clock fails.
    }
    this.clockAdjusted = true;
    return this.previousAt;
  }

  private record(
    step: TimingStep,
    details?: TimingDetails,
    at = this.now(),
    log = true
  ): TimingEntry {
    const deltaMs = roundMs(at - this.previousAt);
    if (!this.longestInterval || deltaMs > this.longestInterval.durationMs) {
      this.longestInterval = {
        from: this.previousStep,
        to: step,
        durationMs: deltaMs,
      };
    }
    this.previousAt = at;
    this.previousStep = step;
    const entry = {
      timestamp: new Date().toISOString(),
      step,
      deltaMs,
      elapsedMs: roundMs(at - this.startedAt),
      ...(details ? { details } : {}),
    };
    if (this.entries.length === RegistrationTimings.MAX_STEPS) {
      this.entries.shift();
      this.droppedSteps += 1;
    }
    this.entries.push(entry);

    if (log) this.logStep(entry);
    return entry;
  }

  private logStep(entry: TimingEntry): void {
    try {
      const details = formatDetails(entry.details);
      logger.info(
        `[TelnyxRTC registration ${this.clientId}] ${entry.timestamp} ` +
          `+${entry.deltaMs} ms / ${entry.elapsedMs} ms total: ${entry.step}` +
          (details ? ` (${details})` : '')
      );
    } catch {
      // An application-supplied logging sink must not break registration.
    }
  }

  mark(step: TimingStep, details?: TimingDetails): void {
    if (this.finished) return;
    const at = this.now();
    if (step === 'TelnyxRTC constructor complete')
      this.constructorFinishedAt = at;
    if (
      step === 'client.connect() called' &&
      this.connectStartedAt === undefined
    ) {
      this.connectStartedAt = at;
    }
    if (step === 'create WebSocket') {
      this.socketAttempts += 1;
      this.requests.clear();
    }
    if (step === 'WebSocket closed' || step === 'WebSocket error') {
      this.requests.clear();
    }
    this.record(step, details, at);
  }

  requestSent(id: unknown, method: unknown): void {
    if (
      this.finished ||
      !isRegistrationMethod(method) ||
      typeof id !== 'string' ||
      id.length > 128
    )
      return;

    const at = this.now();
    if (
      !this.requests.has(id) &&
      this.requests.size === RegistrationTimings.MAX_REQUESTS
    ) {
      this.requests.delete(this.requests.keys().next().value);
      this.droppedRequests += 1;
    }
    this.requests.set(id, { method, startedAt: at });
    this.record(`send ${method}`, { requestId: id }, at);
  }

  responseReceived(
    msg: {
      id?: unknown;
      method?: unknown;
      params?: { state?: unknown };
      result?: { params?: { state?: unknown } };
      error?: unknown;
    } | null
  ): void {
    if (this.finished || !msg) return;
    const at = this.now();
    const id = typeof msg.id === 'string' ? msg.id : undefined;
    const request = this.requests.get(id);
    const details: TimingDetails = {};
    if (request) {
      details.requestId = id;
      details.requestMs = roundMs(at - request.startedAt);
      this.requests.delete(id);
    }
    const state = msg.result?.params?.state || msg.params?.state;
    // Keep an allowlist: do not copy arbitrary server fields or error payloads.
    if (Object.values(GatewayStateType).includes(state as GatewayStateType)) {
      details.state = state as GatewayStateType;
    }
    if (msg.method === VertoMethod.ClientReady) {
      this.record('receive server clientReady', details, at);
    } else if (request) {
      this.record(
        `receive ${request.method}${msg.error ? ' error' : ''}`,
        details,
        at
      );
    } else if (details.state) {
      this.record('receive gateway state', details, at);
    }
  }

  finish(sessionId: string): void {
    if (this.finished) return;
    const at = this.now();
    // Defer logging the final milestone until after app ready dispatch.
    const readyEntry = this.record(
      'emit telnyx.ready (vertoClientReady) to app',
      undefined,
      at,
      false
    );
    this.finished = true;
    this.requests.clear();
    this.completedAtUtc = readyEntry.timestamp;
    this.summary = {
      event: 'registration_timing',
      schemaVersion: 1,
      scope: 'initial_registration',
      clientId: this.clientId,
      sessionId,
      sdkVersion: this.sdkVersion,
      startedAt: this.startedAtUtc,
      timestamp: this.completedAtUtc,
      clock: this.clock,
      clockAdjusted: this.clockAdjusted,
      totalMs: roundMs(at - this.startedAt),
      ...(this.constructorFinishedAt !== undefined
        ? {
            constructorMs: roundMs(this.constructorFinishedAt - this.startedAt),
          }
        : {}),
      ...(this.connectStartedAt !== undefined
        ? {
            connectToReadyMs: roundMs(at - this.connectStartedAt),
            ...(this.constructorFinishedAt !== undefined
              ? {
                  appWaitBeforeConnectMs: roundMs(
                    this.connectStartedAt - this.constructorFinishedAt
                  ),
                }
              : {}),
          }
        : {}),
      socketAttempts: this.socketAttempts,
      droppedSteps: this.droppedSteps,
      droppedRequests: this.droppedRequests,
      longestInterval: this.longestInterval,
      steps: this.entries,
    };
    this.entries = [];
    // Capture before dispatch but publish afterwards. A thrown logger must not
    // turn into an unhandled promise rejection or change ready-event delivery.
    void Promise.resolve().then(() => {
      this.logStep(readyEntry);
      try {
        const summary = this.summary;
        const durations = [`${summary.totalMs} ms total`];
        if (summary.constructorMs !== undefined) {
          durations.push(`constructor=${summary.constructorMs} ms`);
        }
        if (summary.appWaitBeforeConnectMs !== undefined) {
          durations.push(`app wait=${summary.appWaitBeforeConnectMs} ms`);
        }
        if (summary.connectToReadyMs !== undefined) {
          durations.push(`connect-to-ready=${summary.connectToReadyMs} ms`);
        }
        const longest = summary.longestInterval;
        logger.info(
          `[TelnyxRTC registration ${this.clientId}] ${summary.timestamp} COMPLETE: ` +
            `${durations.join('; ')}; longest interval: ${longest.from} → ${longest.to} ` +
            `(${longest.durationMs} ms); socket attempts=${summary.socketAttempts}; ` +
            `dropped steps=${summary.droppedSteps}`
        );
      } catch {
        // Best-effort diagnostic output only.
      }
      try {
        if (
          isConsoleLogEnabled('info') &&
          typeof console !== 'undefined' &&
          typeof console.table === 'function'
        ) {
          console.table(
            this.summary.steps.map((entry) => ({
              ...entry,
              details: formatDetails(entry.details),
            }))
          );
        }
      } catch {
        // An unavailable or throwing console table must not affect signaling.
      }
    });
  }

  /** A copy for the owning session's call report, retaining the completion time. */
  getLogEntry(): ILogEntry | undefined {
    if (!this.summary) return undefined;
    return {
      timestamp: this.completedAtUtc,
      level: 'info',
      message: REGISTRATION_TIMING_MESSAGE,
      context: JSON.parse(JSON.stringify(this.summary)),
    };
  }
}
