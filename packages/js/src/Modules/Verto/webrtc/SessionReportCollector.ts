/**
 * SessionReportCollector
 *
 * Collects SDK session-level data (logs, events, errors) and posts them to
 * voice-sdk-proxy when no call was successfully created during the session.
 *
 * This captures broken sessions, "destination out of order" errors, and other
 * session-level issues that occur before or without call creation.
 *
 * Key differences from CallReportCollector:
 * - No peer connection (no WebRTC stats)
 * - Tracks session lifecycle events (login, clientReady, errors)
 * - Posts to same /call_report endpoint with x-session-report: true header
 * - No call_id since no call was made
 */

import pkg from '../../../../package.json';
import logger from '../../../Modules/Verto/util/logger';
import {
  LogCollector,
  ILogEntry,
  createLogCollector,
} from '../../../Modules/Verto/util/LogCollector';

/**
 * Session event types tracked for reporting
 */
export type SessionEventType =
  | 'login'
  | 'login_success'
  | 'login_failed'
  | 'client_ready'
  | 'socket_open'
  | 'socket_close'
  | 'socket_error'
  | 'error'
  | 'disconnect'
  | 'reconnect'
  | 'ping'
  | 'pong';

/**
 * Session event entry
 */
export interface ISessionEvent {
  timestamp: string;
  type: SessionEventType;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Session error entry
 */
export interface ISessionError {
  timestamp: string;
  code?: number;
  message: string;
  type?: string;
  details?: Record<string, unknown>;
}

/**
 * Options for SessionReportCollector
 */
export interface ISessionReportOptions {
  /** Enable session reporting */
  enabled: boolean;
  /** Maximum session duration before forcing a report (in minutes) */
  maxSessionDurationMinutes: number;
  /** Log collector options */
  logCollector: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    maxEntries: number;
  };
}

/**
 * Session summary for the report payload
 */
export interface ISessionSummary {
  /** SDK session ID from Verto */
  sessionId: string;
  /** User ID (login/username) */
  userId?: string;
  /** Voice SDK ID (reconnect token) */
  voiceSdkId?: string;
  /** SDK version */
  sdkVersion: string;
  /** Call report id issued by voice-sdk-proxy during registration */
  callReportId?: string;
  /** Session start timestamp */
  startTimestamp: string;
  /** Session end timestamp */
  endTimestamp: string;
  /** Session duration in seconds */
  durationSeconds: number;
  /** Session state indicator */
  state: 'session_only';
  /** Whether the session had any errors */
  hadErrors: boolean;
  /** Number of events collected */
  eventCount: number;
  /** Number of errors collected */
  errorCount: number;
  /** Client IP info if available */
  clientIp?: string;
  /** Region/datacenter if available */
  region?: string;
  /** Datacenter code if available */
  dc?: string;
}

/**
 * Session report payload sent to voice-sdk-proxy
 */
export interface ISessionReportPayload {
  /** Marker used by voice-sdk-proxy and downstream tooling */
  session_report: true;
  /** Call report id issued by voice-sdk-proxy during registration */
  call_report_id: string;
  /** SDK session id, duplicated at top level for routing/storage */
  session_id: string;
  /** Optional voice SDK id for correlation */
  voice_sdk_id?: string;
  summary: ISessionSummary;
  /** Session events (login, clientReady, etc.) */
  events: ISessionEvent[];
  /** Collected logs */
  logs: ILogEntry[];
  /** Session-level errors */
  errors: ISessionError[];
  /** No call stats */
  stats: never[];
}

/**
 * Default options for session reporting
 */
const DEFAULT_OPTIONS: ISessionReportOptions = {
  enabled: true,
  maxSessionDurationMinutes: 10,
  logCollector: {
    enabled: true,
    level: 'debug',
    maxEntries: 500,
  },
};

/**
 * SDK version - imported from package.json at build time
 */

export class SessionReportCollector {
  private options: ISessionReportOptions;
  private logCollector: LogCollector | null = null;
  private events: ISessionEvent[] = [];
  private errors: ISessionError[] = [];
  private sessionStartTime: Date;
  private sessionEndTime: Date | null = null;
  private _hasMadeCall: boolean = false;
  private _reportPosted: boolean = false;
  private _maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

  // Retry configuration
  private static readonly RETRY_DELAY_MS = 500;
  private static readonly MAX_RETRY_ATTEMPTS = 2;

  /**
   * Callback invoked when session report is successfully posted
   */
  public onReportPosted: (() => void) | null = null;

  /**
   * Callback invoked when session report fails to post
   */
  public onReportFailed: ((error: Error) => void) | null = null;

  /**
   * Callback invoked when the max session duration timer fires.
   * BaseSession owns the connection/correlation context needed to post.
   */
  public onMaxDurationReached: (() => void) | null = null;

  constructor(options: Partial<ISessionReportOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      logCollector: {
        ...DEFAULT_OPTIONS.logCollector,
        ...options.logCollector,
      },
    };
    this.sessionStartTime = new Date();

    // Initialize log collector if enabled
    if (this.options.logCollector.enabled) {
      this.logCollector = createLogCollector(this.options.logCollector);
      this.logCollector.start();
      // Don't set global - call collector takes precedence during calls
    }

    // Start max duration timer
    this._startMaxDurationTimer();

    logger.info('SessionReportCollector: Initialized', {
      maxDurationMinutes: this.options.maxSessionDurationMinutes,
      logCollectorEnabled: this.options.logCollector.enabled,
    });
  }

  /**
   * Start the max duration timer to force report after threshold
   */
  private _startMaxDurationTimer(): void {
    if (!this.options.enabled || this.options.maxSessionDurationMinutes <= 0) {
      return;
    }

    const delayMs = this.options.maxSessionDurationMinutes * 60 * 1000;
    this._maxDurationTimer = setTimeout(() => {
      logger.info(
        'SessionReportCollector: Max duration reached, requesting report'
      );
      this.onMaxDurationReached?.();
    }, delayMs);
  }

  /**
   * Mark that a call has been made in this session.
   * This prevents session reporting since the call will report itself.
   */
  public markCallMade(): void {
    this._hasMadeCall = true;
    this._clearMaxDurationTimer();
    logger.debug(
      'SessionReportCollector: Call marked as made, disabling session reporting'
    );
  }

  /**
   * Check if a call has been made in this session
   */
  public get hasMadeCall(): boolean {
    return this._hasMadeCall;
  }

  /**
   * Check if a report has already been posted
   */
  public get reportPosted(): boolean {
    return this._reportPosted;
  }

  /**
   * Record a session event
   */
  public recordEvent(
    type: SessionEventType,
    message?: string,
    details?: Record<string, unknown>
  ): void {
    if (!this.options.enabled || this._hasMadeCall || this._reportPosted) {
      return;
    }

    const event: ISessionEvent = {
      timestamp: new Date().toISOString(),
      type,
      ...(message && { message }),
      ...(details && Object.keys(details).length > 0 && { details }),
    };

    this.events.push(event);
    logger.debug(`SessionReportCollector: Event recorded [${type}]`, {
      message,
      details,
    });
  }

  /**
   * Record a session error
   */
  public recordError(
    message: string,
    code?: number,
    type?: string,
    details?: Record<string, unknown>
  ): void {
    if (!this.options.enabled || this._hasMadeCall || this._reportPosted) {
      return;
    }

    const error: ISessionError = {
      timestamp: new Date().toISOString(),
      message,
      ...(code !== undefined && { code }),
      ...(type && { type }),
      ...(details && Object.keys(details).length > 0 && { details }),
    };

    this.errors.push(error);
    logger.debug(`SessionReportCollector: Error recorded [${code || 'N/A'}]`, {
      message,
      type,
      details,
    });
  }

  /**
   * Get session duration in milliseconds
   */
  public get sessionDurationMs(): number {
    return Date.now() - this.sessionStartTime.getTime();
  }

  /**
   * Post the session report to voice-sdk-proxy.
   *
   * @param reason - Why the report is being posted (for logging)
   * @param host - The WebSocket host URL
   * @param sessionId - The Verto session ID
   * @param callReportId - The call_report_id issued by voice-sdk-proxy
   * @param userId - The user ID/login
   * @param voiceSdkId - The voice SDK ID (reconnect token)
   * @param region - Optional region info
   * @param dc - Optional datacenter info
   * @returns true if report was posted, false if skipped
   */
  public async postSessionReport(
    reason: string,
    host: string,
    sessionId: string,
    callReportId?: string,
    userId?: string,
    voiceSdkId?: string,
    region?: string,
    dc?: string
  ): Promise<boolean> {
    if (!this.options.enabled) {
      logger.debug('SessionReportCollector: Skipping report - disabled');
      return false;
    }

    if (this._hasMadeCall) {
      logger.debug('SessionReportCollector: Skipping report - call was made');
      return false;
    }

    if (this._reportPosted) {
      logger.debug('SessionReportCollector: Skipping report - already posted');
      return false;
    }

    if (!host) {
      logger.debug(
        'SessionReportCollector: Skipping report - no host available'
      );
      return false;
    }

    if (!callReportId) {
      logger.debug(
        'SessionReportCollector: Skipping report - call_report_id not available'
      );
      return false;
    }

    this._reportPosted = true;
    this._clearMaxDurationTimer();
    this.sessionEndTime = new Date();

    logger.info(`SessionReportCollector: Posting session report (${reason})`, {
      sessionId,
      durationMs: this.sessionDurationMs,
      eventCount: this.events.length,
      errorCount: this.errors.length,
    });

    try {
      await this._sendReport(
        host,
        sessionId,
        callReportId,
        userId,
        voiceSdkId,
        region,
        dc
      );
      this.onReportPosted?.();
      return true;
    } catch (error) {
      logger.error('SessionReportCollector: Failed to post session report', {
        error,
      });
      this.onReportFailed?.(
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Send the session report to voice-sdk-proxy
   */
  private async _sendReport(
    host: string,
    sessionId: string,
    callReportId: string,
    userId?: string,
    voiceSdkId?: string,
    region?: string,
    dc?: string
  ): Promise<void> {
    const wsUrl = new URL(host);
    const endpoint = `${wsUrl.protocol.replace(/^ws/, 'http')}//${wsUrl.host}/call_report`;

    const payload: ISessionReportPayload = {
      session_report: true,
      call_report_id: callReportId,
      session_id: sessionId,
      ...(voiceSdkId && { voice_sdk_id: voiceSdkId }),
      summary: {
        sessionId,
        callReportId,
        ...(userId && { userId }),
        ...(voiceSdkId && { voiceSdkId }),
        sdkVersion: pkg.version,
        startTimestamp: this.sessionStartTime.toISOString(),
        endTimestamp: this.sessionEndTime!.toISOString(),
        durationSeconds: this.sessionDurationMs / 1000,
        state: 'session_only',
        hadErrors: this.errors.length > 0,
        eventCount: this.events.length,
        errorCount: this.errors.length,
        ...(region && { region }),
        ...(dc && { dc }),
      },
      events: this.events,
      logs: this.logCollector?.getLogs() ?? [],
      errors: this.errors,
      stats: [],
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-session-report': 'true',
      'x-call-report-id': callReportId,
    };

    if (voiceSdkId) {
      headers['x-voice-sdk-id'] = voiceSdkId;
    }

    const body = JSON.stringify(payload);

    logger.debug('SessionReportCollector: Sending report', {
      endpoint,
      eventCount: payload.events.length,
      logCount: payload.logs.length,
      errorCount: payload.errors.length,
    });

    // Attempt to send with retries
    let lastError: Error | null = null;
    for (
      let attempt = 1;
      attempt <= SessionReportCollector.MAX_RETRY_ATTEMPTS;
      attempt++
    ) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        logger.info(
          'SessionReportCollector: Successfully posted session report',
          {
            attempt,
            sessionId,
          }
        );
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `SessionReportCollector: Report attempt ${attempt} failed`,
          {
            error: lastError.message,
          }
        );

        if (attempt < SessionReportCollector.MAX_RETRY_ATTEMPTS) {
          await new Promise((r) =>
            setTimeout(r, SessionReportCollector.RETRY_DELAY_MS)
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Clear the max duration timer
   */
  private _clearMaxDurationTimer(): void {
    if (this._maxDurationTimer) {
      clearTimeout(this._maxDurationTimer);
      this._maxDurationTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this._clearMaxDurationTimer();
    if (this.logCollector) {
      this.logCollector.stop();
      this.logCollector.clear();
      this.logCollector = null;
    }
    this.events = [];
    this.errors = [];
  }

  /**
   * Get collected events (for debugging)
   */
  public getEvents(): ISessionEvent[] {
    return [...this.events];
  }

  /**
   * Get collected errors (for debugging)
   */
  public getErrors(): ISessionError[] {
    return [...this.errors];
  }

  /**
   * Get collected logs (for debugging)
   */
  public getLogs(): ILogEntry[] {
    return this.logCollector?.getLogs() ?? [];
  }
}

/**
 * Create a new session report collector
 */
export function createSessionReportCollector(
  options?: Partial<ISessionReportOptions>
): SessionReportCollector {
  return new SessionReportCollector(options);
}
