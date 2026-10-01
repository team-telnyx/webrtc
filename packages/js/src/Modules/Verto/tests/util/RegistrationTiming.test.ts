/**
 * Tests for RegistrationTiming.
 *
 * Other test files replace `global.performance` with stubs whose `now()` is a
 * constant, and Jest runs them in the same worker. We install a controllable
 * clock so the elapsed times are deterministic.
 */
import { RegistrationTiming } from '../../util/RegistrationTiming';

let _now = 0;
const originalPerformance = global.performance;

beforeAll(() => {
  Object.defineProperty(global, 'performance', {
    writable: true,
    value: { now: () => _now },
  });
});

afterAll(() => {
  Object.defineProperty(global, 'performance', {
    writable: true,
    value: originalPerformance,
  });
});

describe('RegistrationTiming', () => {
  beforeEach(() => {
    _now = 1000;
  });

  it('reports each mark as integer milliseconds since construction', () => {
    const timing = new RegistrationTiming(false);
    timing.claimCall('call-1');

    _now = 1120.4;
    timing.markSocketOpen();
    _now = 1480.6;
    timing.markLogin();
    _now = 1700;
    timing.markClientReady();
    _now = 1950;
    timing.markRegistered();

    expect(timing.toSummary('call-1')).toEqual({
      socketOpenMs: 120,
      loginMs: 481,
      clientReadyMs: 700,
      registeredMs: 950,
      reconnect: false,
      firstCall: true,
    });
  });

  it('omits marks that were never reached', () => {
    const timing = new RegistrationTiming(true);

    _now = 1100;
    timing.markSocketOpen();

    expect(timing.toSummary('call-1')).toEqual({
      socketOpenMs: 100,
      reconnect: true,
      firstCall: false,
    });
  });

  it('keeps the first value when a mark is repeated', () => {
    const timing = new RegistrationTiming(false);

    _now = 1300;
    timing.markLogin();
    timing.markRegistered();
    _now = 9000;
    timing.markLogin();
    timing.markRegistered();

    expect(timing.toSummary('call-1')).toEqual(
      expect.objectContaining({ loginMs: 300, registeredMs: 300 })
    );
  });

  it('flags only the first claimed call as the first call', () => {
    const timing = new RegistrationTiming(false);
    timing.claimCall('call-1');
    timing.claimCall('call-2');

    expect(timing.toSummary('call-1').firstCall).toBe(true);
    expect(timing.toSummary('call-2').firstCall).toBe(false);
    // Asking again must not change the answer between report segments.
    expect(timing.toSummary('call-1').firstCall).toBe(true);
  });

  it('falls back to Date.now() when performance.now is unavailable', () => {
    Object.defineProperty(global, 'performance', {
      writable: true,
      value: {},
    });
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(5000);

    try {
      const timing = new RegistrationTiming(false);
      dateSpy.mockReturnValue(5250);
      timing.markSocketOpen();

      expect(timing.toSummary('call-1').socketOpenMs).toBe(250);
    } finally {
      dateSpy.mockRestore();
      Object.defineProperty(global, 'performance', {
        writable: true,
        value: { now: () => _now },
      });
    }
  });
});
