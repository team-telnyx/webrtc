/**
 * RegistrationTiming
 *
 * Tracks how long one WebSocket registration takes, from the moment the
 * socket is constructed until the gateway reports the client as registered.
 * A new instance is created for every `Connection.connect()`, so the marks of
 * a reconnect never mix with the marks of the registration it replaces.
 *
 * Calls keep a reference to the instance that was current when they were
 * created, which is what ends up in their call report.
 */

/** Registration timing as reported in the call report client summary. */
export interface IRegistrationSummary {
  /** WebSocket constructor -> onopen. */
  socketOpenMs?: number;
  /** Connect start -> login response received. */
  loginMs?: number;
  /** Connect start -> telnyx_rtc.clientReady received. */
  clientReadyMs?: number;
  /** Connect start -> REGED/REGISTER gateway state (SwEvent.Ready). */
  registeredMs?: number;
  /** True when this registration came from a reconnect of the session. */
  reconnect?: boolean;
  /** True only on the first call placed/received on this registration. */
  firstCall?: boolean;
}

function monotonicNow(): number {
  return typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export class RegistrationTiming {
  private readonly _startedAt: number = monotonicNow();
  private _socketOpenMs?: number;
  private _loginMs?: number;
  private _clientReadyMs?: number;
  private _registeredMs?: number;
  private _firstCallId: string | null = null;

  constructor(public readonly reconnect: boolean) {}

  // Each mark is recorded once: a re-login on the same socket (e.g. a token
  // refresh) or a repeated gateway state must not move a mark that describes
  // the initial registration.

  markSocketOpen(): void {
    this._socketOpenMs ??= this._elapsedMs();
  }

  markLogin(): void {
    this._loginMs ??= this._elapsedMs();
  }

  markClientReady(): void {
    this._clientReadyMs ??= this._elapsedMs();
  }

  markRegistered(): void {
    this._registeredMs ??= this._elapsedMs();
  }

  /**
   * Register a call created on this registration. The first one claimed is
   * the registration's first call.
   */
  claimCall(callId: string): void {
    this._firstCallId ??= callId;
  }

  toSummary(callId: string): IRegistrationSummary {
    return {
      ...(this._socketOpenMs !== undefined
        ? { socketOpenMs: this._socketOpenMs }
        : {}),
      ...(this._loginMs !== undefined ? { loginMs: this._loginMs } : {}),
      ...(this._clientReadyMs !== undefined
        ? { clientReadyMs: this._clientReadyMs }
        : {}),
      ...(this._registeredMs !== undefined
        ? { registeredMs: this._registeredMs }
        : {}),
      reconnect: this.reconnect,
      firstCall: this._firstCallId === callId,
    };
  }

  private _elapsedMs(): number {
    return Math.max(0, Math.round(monotonicNow() - this._startedAt));
  }
}
