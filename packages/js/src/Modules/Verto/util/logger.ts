import log from 'loglevel';
import { getGlobalLogCollector, LogLevel } from './LogCollector';

const datetime = () =>
  new Date().toISOString().replace('T', ' ').replace('Z', '');
const logger = log.getLogger('telnyx');

const originalFactory = logger.methodFactory;
logger.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return function (...logArgs: unknown[]) {
    const messages: unknown[] = [datetime(), '-'];
    for (const arg of logArgs) {
      messages.push(arg);
    }
    rawMethod(...messages);

    // Forward to log collector if active
    const collector = getGlobalLogCollector();
    if (collector?.isActive()) {
      // Extract message and context from arguments
      const [firstArg, ...restArgs] = logArgs;
      const message = typeof firstArg === 'string' ? firstArg : JSON.stringify(firstArg);
      
      // If there's a second argument and it's an object, use it as context
      let context: Record<string, unknown> | undefined;
      if (restArgs.length > 0) {
        if (restArgs.length === 1 && typeof restArgs[0] === 'object' && restArgs[0] !== null) {
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
logger.setLevel('info');

export default logger;
