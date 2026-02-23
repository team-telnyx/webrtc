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
      let context: Record<string, unknown> | undefined;
      if (restArgs.length > 0) {
        if (
          restArgs.length === 1 &&
          typeof restArgs[0] === 'object' &&
          restArgs[0] !== null
        ) {
          context = restArgs[0] as Record<string, unknown>;
        } else {
          // Multiple extra args, wrap them
          context = { args: restArgs };
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
