import log from 'loglevel';
import { getGlobalLogCollector, LogLevel } from './LogCollector';

const datetime = () =>
  new Date().toISOString().replace('T', ' ').replace('Z', '');
const logger = log.getLogger('telnyx');

// Console output threshold — only info and above go to console
const CONSOLE_LEVEL_PRIORITY: Record<string, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};
const CONSOLE_MIN_LEVEL = CONSOLE_LEVEL_PRIORITY['info'];

const originalFactory = logger.methodFactory;
logger.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return function (...logArgs: unknown[]) {
    // Only write to console for info and above (preserves original behavior)
    if (CONSOLE_LEVEL_PRIORITY[methodName] >= CONSOLE_MIN_LEVEL) {
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

// Set to debug so all levels flow through methodFactory (collector captures everything)
// Console output is filtered to info+ inside the factory above
logger.setLevel('debug');

export default logger;
