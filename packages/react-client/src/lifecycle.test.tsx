import React, { act, StrictMode, useContext, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { TelnyxRTC, IClientOptions } from '@telnyx/webrtc';
import TelnyxRTCContext from './TelnyxRTCContext';
import TelnyxRTCProvider from './TelnyxRTCProvider';
import useTelnyxRTC, { CredentialOptions } from './useTelnyxRTC';
import useCallbacks from './useCallbacks';

jest.mock('@telnyx/webrtc', () => ({
  TelnyxRTC: jest.fn().mockImplementation((options) => {
    const listeners = new Map<string, Set<(event: any) => void>>();
    return {
      options,
      connected: false,
      connect: jest.fn(async () => {
        listeners
          .get('telnyx.error')
          ?.forEach((callback) => callback({ startup: true }));
      }),
      disconnect: jest.fn(async () => {
        await Promise.resolve();
        listeners.clear();
      }),
      on: jest.fn((name, callback) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(callback);
      }),
      off: jest.fn((name, callback) => {
        if (callback) listeners.get(name)?.delete(callback);
        else listeners.delete(name);
      }),
      emit: (name: string, event?: unknown) =>
        listeners.get(name)?.forEach((callback) => callback(event)),
    };
  }),
}));

type MockClient = TelnyxRTC & { emit: (name: string, event?: unknown) => void };
const clients = () =>
  (TelnyxRTC as unknown as jest.Mock).mock.results.map(
    ({ value }) => value as MockClient
  );

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  jest.useFakeTimers();
  // jsdom 16 (the repository's pinned version) exposes null here on Node 25.
  // React expects the browser's undefined value outside event dispatch.
  Object.defineProperty(window, 'event', {
    configurable: true,
    value: undefined,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  jest.useRealTimers();
  container.remove();
});
const render = (element: React.ReactElement, connect = true) => {
  act(() => root.render(element));
  if (connect) act(() => jest.runOnlyPendingTimers());
};

function Client({
  credential = { login_token: 'first' },
  options,
  observe = () => {},
}: {
  credential?: CredentialOptions;
  options?: Partial<IClientOptions>;
  observe?: (client: TelnyxRTC | undefined) => void;
}) {
  observe(useTelnyxRTC(credential, options));
  return null;
}

describe('useTelnyxRTC lifecycle', () => {
  it('delivers synchronous connect errors to provider-child callbacks', () => {
    const onError = jest.fn();
    render(
      <TelnyxRTCProvider credential={{ login_token: 'first' }}>
        <Callbacks onError={onError} />
      </TelnyxRTCProvider>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ startup: true });
  });

  it('delivers synchronous connect errors to direct-hook effect subscribers', () => {
    const onError = jest.fn();
    function Direct() {
      const client = useTelnyxRTC({ login_token: 'first' });
      useEffect(() => {
        if (!client) return;
        client.on('telnyx.error', onError);
        return () => {
          client.off('telnyx.error', onError);
        };
      }, [client]);
      return null;
    }
    render(<Direct />);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ startup: true });
  });

  it('cancels pending connection on unmount and credential replacement', () => {
    render(<Client />, false);
    expect(clients()[0].connect).not.toHaveBeenCalled();
    render(<Client credential={{ login_token: 'second' }} />, false);
    expect(clients()[0].disconnect).toHaveBeenCalledTimes(1);
    render(<></>);
    clients().forEach((client) => {
      expect(client.connect).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  it('does not create a client during server rendering', () => {
    renderToString(<Client />);
    expect(TelnyxRTC).not.toHaveBeenCalled();
  });

  it('returns undefined during initial render and disconnects even a not-yet-connected client on unmount', () => {
    const observe = jest.fn();
    render(<Client observe={observe} />);
    expect(observe.mock.calls[0][0]).toBeUndefined();
    expect(clients()).toHaveLength(1);
    expect(clients()[0].connect).toHaveBeenCalledTimes(1);
    render(<></>);
    expect(clients()[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects each previous client when token, authentication mode, login or password changes', () => {
    const credentials: CredentialOptions[] = [
      { login_token: 'first' },
      { login_token: 'second' },
      { login: 'alice', password: 'secret' },
      { login: 'bob', password: 'secret' },
      { login: 'bob', password: 'new-secret' },
    ];
    credentials.forEach((credential) =>
      render(<Client credential={credential} />)
    );
    expect(clients()).toHaveLength(credentials.length);
    clients().forEach((client, index) => {
      expect(client.options).toMatchObject(credentials[index]);
      expect(client.connect).toHaveBeenCalledTimes(1);
      expect(client.disconnect).toHaveBeenCalledTimes(
        index < credentials.length - 1 ? 1 : 0
      );
    });
    render(<></>);
    clients().forEach((client) =>
      expect(client.disconnect).toHaveBeenCalledTimes(1)
    );
  });

  it('keeps equivalent credentials and mount-time options stable across rerenders and credential replacement', () => {
    render(<Client options={{ debug: false, region: 'us' }} />);
    render(<Client options={{ debug: false, region: 'us' }} />);
    render(
      <Client
        options={{ debug: true, region: 'eu' }}
        credential={{ login_token: 'first', debug: true }}
      />
    );
    expect(clients()).toHaveLength(1);
    render(
      <Client
        options={{ debug: true, region: 'eu' }}
        credential={{ login_token: 'second' }}
      />
    );
    expect(clients()[1].options).toMatchObject({
      login_token: 'second',
      debug: false,
      region: 'us',
    });
  });

  it('does not let options override explicit replacement credentials', () => {
    render(
      <Client
        options={{ login_token: 'stale' }}
        credential={{ login_token: 'current' }}
      />
    );
    expect(clients()[0].options.login_token).toBe('current');
  });

  it('leaves error recovery to the SDK', () => {
    render(<Client />);
    const client = clients()[0];
    client.emit('telnyx.error', { error: { code: 50001, recoverable: true } });
    client.emit('telnyx.socket.error', new Error('temporary network failure'));
    client.emit('telnyx.warning', { warning: { code: 10001 } });
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(clients()).toHaveLength(1);
  });

  it('balances setup and cleanup in React 19 StrictMode without reconnecting a disposed instance', () => {
    const observe = jest.fn();
    render(
      <StrictMode>
        <Client observe={observe} />
      </StrictMode>
    );
    expect(clients()).toHaveLength(2);
    expect(clients()[0].disconnect).toHaveBeenCalledTimes(1);
    expect(clients()[1].disconnect).not.toHaveBeenCalled();
    expect(observe.mock.calls[observe.mock.calls.length - 1][0]).toBe(
      clients()[1]
    );
    render(<></>);
    clients().forEach((client, index) => {
      expect(client.connect).toHaveBeenCalledTimes(index === 0 ? 0 : 1);
      expect(client.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  it('provides null initially, then the effect-created client', () => {
    const observed: (TelnyxRTC | null)[] = [];
    function Consumer() {
      observed.push(useContext(TelnyxRTCContext));
      return null;
    }
    render(
      <TelnyxRTCProvider credential={{ login_token: 'first' }}>
        <Consumer />
      </TelnyxRTCProvider>
    );
    expect(observed[0]).toBeNull();
    expect(observed[observed.length - 1]).toBe(clients()[0]);
  });
});

const events = {
  onReady: 'telnyx.ready',
  onError: 'telnyx.error',
  onSocketError: 'telnyx.socket.error',
  onSocketClose: 'telnyx.socket.close',
  onNotification: 'telnyx.notification',
  onWarning: 'telnyx.warning',
};
function Callbacks(props: Parameters<typeof useCallbacks>[0]) {
  useCallbacks(props);
  return null;
}
function Subscribers({
  client,
  children,
}: {
  client: TelnyxRTC;
  children: React.ReactNode;
}) {
  return (
    <TelnyxRTCContext.Provider value={client}>
      {children}
    </TelnyxRTCContext.Provider>
  );
}

describe('useCallbacks subscriptions', () => {
  it.each(Object.entries(events))(
    '%s uses latest callbacks and removes only its own exact handler',
    (prop, event) => {
      const client = new TelnyxRTC({ login_token: 'first' }) as MockClient;
      const first = jest.fn();
      const latest = jest.fn();
      const external = jest.fn();
      client.on(event, external);
      render(
        <Subscribers client={client}>
          <Callbacks {...{ [prop]: first }} />
        </Subscribers>
      );
      client.emit(event, { payload: 1 });
      expect(first).toHaveBeenCalledWith({ payload: 1 });
      render(
        <Subscribers client={client}>
          <Callbacks {...{ [prop]: latest }} />
        </Subscribers>
      );
      client.emit(event, { payload: 2 });
      expect(first).toHaveBeenCalledTimes(1);
      expect(latest).toHaveBeenCalledWith({ payload: 2 });
      render(<></>);
      client.emit(event);
      expect(latest).toHaveBeenCalledTimes(1);
      expect(external).toHaveBeenCalledTimes(3);
      expect(client.off).toHaveBeenCalledTimes(2);
      for (const [name, handler] of (client.off as jest.Mock).mock.calls) {
        expect(client.on).toHaveBeenCalledWith(name, handler);
        expect(handler).toEqual(expect.any(Function));
      }
    }
  );

  it('removes callbacks when omitted and does not resubscribe for an equivalent props object', () => {
    const client = new TelnyxRTC({ login_token: 'first' }) as MockClient;
    const callback = jest.fn();
    render(
      <Subscribers client={client}>
        <Callbacks onReady={callback} />
      </Subscribers>
    );
    render(
      <Subscribers client={client}>
        <Callbacks onReady={callback} />
      </Subscribers>
    );
    expect(client.on).toHaveBeenCalledTimes(1);
    render(
      <Subscribers client={client}>
        <Callbacks />
      </Subscribers>
    );
    client.emit('telnyx.ready');
    expect(callback).not.toHaveBeenCalled();
  });

  it('preserves other subscribers even when they use the same callback reference', () => {
    const client = new TelnyxRTC({ login_token: 'first' }) as MockClient;
    const shared = jest.fn();
    client.on('telnyx.ready', shared);
    render(
      <Subscribers client={client}>
        <Callbacks onReady={shared} />
        <Callbacks onReady={shared} />
      </Subscribers>
    );
    render(
      <Subscribers client={client}>
        <Callbacks onReady={shared} />
      </Subscribers>
    );
    client.emit('telnyx.ready');
    expect(shared).toHaveBeenCalledTimes(2);
    render(<></>);
    client.emit('telnyx.ready');
    expect(shared).toHaveBeenCalledTimes(3);
  });

  it('unsubscribes from the replaced context client and survives StrictMode effect replay', () => {
    const first = new TelnyxRTC({ login_token: 'first' }) as MockClient;
    const second = new TelnyxRTC({ login_token: 'second' }) as MockClient;
    const callback = jest.fn();
    const view = (client: TelnyxRTC) => (
      <StrictMode>
        <Subscribers client={client}>
          <Callbacks onReady={callback} />
        </Subscribers>
      </StrictMode>
    );
    render(view(first));
    first.emit('telnyx.ready');
    expect(callback).toHaveBeenCalledTimes(1);
    render(view(second));
    first.emit('telnyx.ready');
    expect(callback).toHaveBeenCalledTimes(1);
    second.emit('telnyx.ready');
    expect(callback).toHaveBeenCalledTimes(2);
    render(<></>);
    second.emit('telnyx.ready');
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
