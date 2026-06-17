import logger, {
  clearStoredSdkLogs,
  drainStoredSdkLogs,
  getStoredSdkLogs,
} from '../util/logger';

describe('SDK stored logs', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(jest.fn());
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(jest.fn());
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    logger.setLevel('debug', false);
    clearStoredSdkLogs();
  });

  afterEach(() => {
    clearStoredSdkLogs();
    logger.disableAll();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('stores all SDK log levels in browser storage for deferred reports', () => {
    logger.debug('debug setup log', { socketGeneration: 1 });
    logger.info('info setup log');
    logger.warn('warn setup log');
    logger.error('error setup log', { error: 'network changed' });

    expect(getStoredSdkLogs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'debug',
          message: 'debug setup log',
          context: { socketGeneration: 1 },
        }),
        expect.objectContaining({ level: 'info', message: 'info setup log' }),
        expect.objectContaining({ level: 'warn', message: 'warn setup log' }),
        expect.objectContaining({
          level: 'error',
          message: 'error setup log',
          context: { error: 'network changed' },
        }),
      ])
    );
  });

  it('drains stored SDK logs after they are copied into a deferred report', () => {
    logger.debug('debug setup log');

    expect(drainStoredSdkLogs()).toEqual([
      expect.objectContaining({ level: 'debug', message: 'debug setup log' }),
    ]);
    expect(getStoredSdkLogs()).toEqual([]);
  });
});
