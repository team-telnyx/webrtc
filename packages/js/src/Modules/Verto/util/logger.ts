import log from 'loglevel';
import { getGlobalLogCollector, LogLevel } from './LogCollector';

const datetime = () =>
  new Date().toISOString().replace('T', ' ').replace('Z', '');
const logger = log.getLogger('telnyx');

// ── Console output (unchanged from main) ────────────────────────
// methodFactory adds datetime prefix; loglevel controls which levels
// reach the console via setLevel (respects options.debug).
const originalFactory = logger.methodFactory;
logger.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  // tslint:disable-next-line
  return function () {
    const messages = [datetime(), '-'];
    for (let i = 0; i < arguments.length; i++) {
      messages.push(arguments[i]);
    }
    rawMethod.apply(undefined, messages);
  };
};
logger.setLevel('info');

// ── LogCollector integration ────────────────────────────────────
// Captures ALL log levels to memory for call reports, regardless of
// the current loglevel setting. This works by wrapping the logger
// methods after each setLevel call so that even noop'd methods
// (e.g. debug when level is info) still forward to the collector.

const LOG_METHODS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function forwardToLogCollector(level: LogLevel, ...args: unknown[]): void {
  const collector = getGlobalLogCollector();
  if (!collector?.isActive()) return;

  const [firstArg, ...restArgs] = args;
  const message =
    typeof firstArg === 'string' ? firstArg : JSON.stringify(firstArg);

  let context: Record<string, unknown> | undefined;
  if (restArgs.length > 0) {
    if (
      restArgs.length === 1 &&
      typeof restArgs[0] === 'object' &&
      restArgs[0] !== null
    ) {
      context = restArgs[0] as Record<string, unknown>;
    } else {
      context = { args: restArgs };
    }
  }

  collector.addEntry(level, message, context);
}

/**
 * Wrap each logger method so it forwards to the LogCollector before
 * calling whatever loglevel assigned (real method or noop).
 */
function wrapLoggerMethods(): void {
  for (const level of LOG_METHODS) {
    const currentMethod = logger[level].bind(logger);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logger as any)[level] = (...args: unknown[]) => {
      forwardToLogCollector(level, ...args);
      currentMethod(...args);
    };
  }
}

// Apply wrappers after the initial setLevel
wrapLoggerMethods();

// Re-apply wrappers whenever setLevel is called, because loglevel
// replaces methods with noops for filtered-out levels.
const originalSetLevel = logger.setLevel.bind(logger);
logger.setLevel = ((level: log.LogLevelDesc, persist?: boolean) => {
  originalSetLevel(level, persist);
  wrapLoggerMethods();
}) as typeof logger.setLevel;

export default logger;
