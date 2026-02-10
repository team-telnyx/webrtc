/**
 * LogCollector
 *
 * Captures debug-level logs during a call for inclusion in call reports.
 * Works alongside the existing logger by adding a buffer handler that
 * collects log entries without affecting console output.
 *
 * Features:
 * - Configurable log level filtering
 * - Maximum buffer size to prevent memory issues
 * - Timestamp and context capture for each entry
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface ILogCollectorOptions {
  enabled: boolean;
  level: LogLevel;
  maxEntries: number;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class LogCollector {
  private options: ILogCollectorOptions;
  private buffer: ILogEntry[] = [];
  private isCapturing: boolean = false;

  constructor(options: Partial<ILogCollectorOptions> = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      level: options.level ?? 'debug',
      maxEntries: options.maxEntries ?? 1000,
    };
  }

  /**
   * Start capturing logs
   */
  public start(): void {
    if (!this.options.enabled) {
      return;
    }
    this.isCapturing = true;
    this.buffer = [];
  }

  /**
   * Stop capturing logs
   */
  public stop(): void {
    this.isCapturing = false;
  }

  /**
   * Add a log entry if capturing is active and level passes filter
   */
  public addEntry(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.isCapturing || !this.options.enabled) {
      return;
    }

    // Check if level passes the filter
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.options.level]) {
      return;
    }

    const entry: ILogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    this.buffer.push(entry);

    // Enforce max buffer size (remove oldest entries)
    if (this.buffer.length > this.options.maxEntries) {
      this.buffer.shift();
    }
  }

  /**
   * Get all collected logs
   */
  public getLogs(): ILogEntry[] {
    return [...this.buffer];
  }

  /**
   * Get the number of collected logs
   */
  public getLogCount(): number {
    return this.buffer.length;
  }

  /**
   * Drain the buffer — returns all collected logs and clears the internal buffer.
   * Used for intermediate flushes when approaching payload size limits.
   */
  public drain(): ILogEntry[] {
    const logs = this.buffer;
    this.buffer = [];
    return logs;
  }

  /**
   * Estimate the serialized JSON byte size of the current log buffer.
   * Uses sampling to avoid expensive full serialization on every check.
   */
  public estimateByteSize(): number {
    if (this.buffer.length === 0) return 0;

    // Sample up to 3 entries for a representative average
    const indices = [
      0,
      Math.floor(this.buffer.length / 2),
      this.buffer.length - 1,
    ];
    const unique = [...new Set(indices)];
    const sampleEntries = unique.map((i) => this.buffer[i]);

    let sampleTotal = 0;
    for (const entry of sampleEntries) {
      // Base JSON overhead: {"timestamp":"","level":"","message":""}
      let size = 60;
      size += entry.timestamp?.length ?? 24;
      size += entry.level?.length ?? 5;
      size += entry.message?.length ?? 0;
      if (entry.context) {
        try {
          size += JSON.stringify(entry.context).length;
        } catch {
          size += 100;
        }
      }
      sampleTotal += size;
    }

    const avgEntrySize = sampleTotal / sampleEntries.length;
    // Array overhead: brackets + commas between entries
    return Math.ceil(avgEntrySize * this.buffer.length) + 2 + Math.max(0, this.buffer.length - 1);
  }

  /**
   * Clear the buffer
   */
  public clear(): void {
    this.buffer = [];
  }

  /**
   * Check if collector is currently capturing
   */
  public isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Check if collector is enabled
   */
  public isEnabled(): boolean {
    return this.options.enabled;
  }
}

// Singleton instance for the global log collector
let globalLogCollector: LogCollector | null = null;

/**
 * Get or create the global log collector instance
 */
export function getGlobalLogCollector(): LogCollector | null {
  return globalLogCollector;
}

/**
 * Set the global log collector instance
 */
export function setGlobalLogCollector(collector: LogCollector | null): void {
  globalLogCollector = collector;
}

/**
 * Create a new log collector with options
 */
export function createLogCollector(options: Partial<ILogCollectorOptions>): LogCollector {
  return new LogCollector(options);
}
