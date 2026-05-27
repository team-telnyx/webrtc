import log from 'loglevel';
import { getGlobalLogCollector, LogLevel } from './LogCollector';

const datetime = () =>
  new Date().toISOString().replace('T', ' ').replace('Z', '');
const logger = log.getLogger('telnyx');

// Console output threshold — controls which levels print to console.
// Mutable so BaseSession can raise/lower it via setConsoleLoggerMinLevel()
// without touching loglevel's internal level (which must stay at 'debug'
// so ALL calls flow through methodFactory and reach the LogCollector).
const CONSOLE_LEVEL_PRIORITY: Record<string, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};
let consoleMinLevel = CONSOLE_LEVEL_PRIORITY['info'];

/**
 * Set the minimum log level that prints to the browser console.
 * This does NOT affect the LogCollector — it always captures all levels.
 */
export function setConsoleLoggerMinLevel(level: string): void {
  consoleMinLevel =
    CONSOLE_LEVEL_PRIORITY[level] ?? CONSOLE_LEVEL_PRIORITY['info'];
}

/**
 * Serialize a value to a JSON-safe representation.
 *
 * DOM objects like Events have useful properties (type, errorCode, etc.)
 * defined as prototype getters which JSON.stringify / Object.keys ignore.
 * This function uses `for...in` to capture those inherited enumerable
 * properties so they appear in call report logs.
 */
function toSerializable(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  // Fast path: try JSON round-trip for plain objects
  try {
    const json = JSON.stringify(value);
    const parsed = JSON.parse(json);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Object.keys(parsed).length > 1
    ) {
      return parsed;
    }
  } catch {
    // Fall through to manual extraction
  }

  // Slow path: extract all enumerable properties including prototype getters
  // (handles DOM Events, RTCPeerConnectionIceErrorEvent, etc.)
  const result: Record<string, unknown> = {};
  for (const key in value) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = (value as any)[key];
      if (typeof v === 'function') continue;
      if (typeof v === 'object' && v !== null) {
        // Avoid circular refs from DOM nodes — try JSON, fall back to toString
        try {
          result[key] = JSON.parse(JSON.stringify(v));
        } catch {
          result[key] = String(v);
        }
      } else {
        result[key] = v;
      }
    } catch {
      // Skip inaccessible properties
    }
  }

  if (Object.keys(result).length > 0) return result;

  // Last resort: stringify
  return { value: String(value) };
}

const originalFactory = logger.methodFactory;
logger.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return function (...logArgs: unknown[]) {
    // Only write to console if level passes the console threshold
    if (CONSOLE_LEVEL_PRIORITY[methodName] >= consoleMinLevel) {
      const messages: unknown[] = [datetime(), '-'];
      for (const arg of logArgs) {
        messages.push(arg);
      }
      rawMethod(...messages);
    }

    // Forward ALL levels to log collector if active
    const collector = getGlobalLogCollector();
    if (collector?.isActive()) {
      // Extract message and context from arguments
      const [firstArg, ...restArgs] = logArgs;
      const message =
        typeof firstArg === 'string' ? firstArg : JSON.stringify(firstArg);

      // If there's a second argument and it's an object, use it as context
      // Serialize to plain objects so DOM Events and similar host objects
      // retain their properties when the call report is JSON.stringified.
      let context: Record<string, unknown> | undefined;
      if (restArgs.length > 0) {
        if (
          restArgs.length === 1 &&
          typeof restArgs[0] === 'object' &&
          restArgs[0] !== null
        ) {
          context = toSerializable(restArgs[0]) as Record<string, unknown>;
        } else {
          // Multiple extra args, wrap them
          context = { args: restArgs.map(toSerializable) };
        }
      }

      collector.addEntry(methodName as LogLevel, message, context);
    }
  };
};

// Keep loglevel at 'debug' so ALL calls flow through methodFactory — this
// ensures the LogCollector captures debug logs even when the customer hasn't
// enabled debug mode.  Console output is separately gated by consoleMinLevel.
// persist: false avoids polluting localStorage.
logger.setLevel('debug', false);

export default logger;
