import {
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
} from '../../util/sessionStorage';

/**
 * jsdom backs `sessionStorage` with a Proxy, so assigning to one of its
 * methods writes a storage entry named `setItem` rather than replacing the
 * method. Swap the whole global instead.
 */
const withFailingStorage = (run: () => void) => {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage'
  );
  const thrower = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: thrower,
      setItem: thrower,
      removeItem: thrower,
      clear: () => undefined,
    },
  });
  try {
    run();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'sessionStorage', original);
    }
  }
};

describe('safe sessionStorage accessors', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a value', () => {
    expect(safeSetItem('k', 'v')).toBe(true);
    expect(safeGetItem('k')).toBe('v');

    safeRemoveItem('k');
    expect(safeGetItem('k')).toBeNull();
  });

  it('returns null for a key that was never set', () => {
    expect(safeGetItem('missing')).toBeNull();
  });

  // Safari private mode throws on write once the quota is reached, and a
  // browser with site data blocked throws on access. Neither should end a call.
  it('does not throw and reports failure when storage is unavailable', () => {
    withFailingStorage(() => {
      expect(() => safeGetItem('k')).not.toThrow();
      expect(safeGetItem('k')).toBeNull();
      expect(safeSetItem('k', 'v')).toBe(false);
      expect(() => safeRemoveItem('k')).not.toThrow();
    });
  });

  it('stringifies a non-Error throw without crashing', () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'sessionStorage'
    );
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        setItem: () => {
          throw 'nope';
        },
      },
    });
    try {
      expect(safeSetItem('k', 'v')).toBe(false);
    } finally {
      if (original) {
        Object.defineProperty(globalThis, 'sessionStorage', original);
      }
    }
  });
});
