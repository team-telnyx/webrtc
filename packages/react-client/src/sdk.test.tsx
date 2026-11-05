import React, { act, StrictMode, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { webcrypto } from 'crypto';
import type { TelnyxRTC as TelnyxRTCClient } from '@telnyx/webrtc';

// Runs the wrapper against the installed SDK instead of a mock, with only the
// WebSocket faked. The SDK reads the globals set in beforeAll when it loads,
// so the SDK and the wrapper modules are imported after them.

const sockets: FakeWebSocket[] = [];
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  onopen?: (event: unknown) => void;
  onclose?: (event: unknown) => void;
  onerror?: (event: unknown) => void;
  onmessage?: (event: unknown) => void;
  sent: string[] = [];
  constructor(public url: string) {
    sockets.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }
}

let TelnyxRTC: typeof TelnyxRTCClient;
let TelnyxRTCContext: typeof import('./TelnyxRTCContext').default;
let TelnyxRTCProvider: typeof import('./TelnyxRTCProvider').default;
beforeAll(async () => {
  // jsdom 16 has no crypto.getRandomValues, which the SDK uses for IDs.
  Object.defineProperty(window, 'crypto', {
    configurable: true,
    value: webcrypto,
  });
  (window as any).WebSocket = FakeWebSocket;
  // The SDK logs registration timing at info level; keep warnings and errors.
  for (const method of ['log', 'info', 'debug', 'table'] as const) {
    jest.spyOn(console, method).mockImplementation(() => {});
  }
  ({ TelnyxRTC } = await import('@telnyx/webrtc'));
  TelnyxRTCContext = (await import('./TelnyxRTCContext')).default;
  TelnyxRTCProvider = (await import('./TelnyxRTCProvider')).default;
});

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

let unhandled: unknown[];
const onUnhandled = (reason: unknown) => unhandled.push(reason);
beforeEach(() => {
  // React expects the browser's undefined value outside event dispatch.
  Object.defineProperty(window, 'event', {
    configurable: true,
    value: undefined,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  sockets.length = 0;
  unhandled = [];
  process.on('unhandledRejection', onUnhandled);
});
afterEach(() => {
  process.off('unhandledRejection', onUnhandled);
});

test('connects one SDK client under StrictMode and disconnects it on unmount', async () => {
  const seen: (TelnyxRTCClient | null)[] = [];
  function Probe() {
    seen.push(useContext(TelnyxRTCContext));
    return null;
  }
  const root = createRoot(document.createElement('div'));

  await act(async () => {
    root.render(
      <StrictMode>
        <TelnyxRTCProvider
          credential={{ login_token: 'token' }}
          options={{ region: 'eu' }}
        >
          <Probe />
        </TelnyxRTCProvider>
      </StrictMode>
    );
  });
  await settle();

  expect(seen[seen.length - 1]).toBeInstanceOf(TelnyxRTC);
  // The StrictMode probe client is disposed before it connects.
  expect(sockets).toHaveLength(1);
  const [socket] = sockets;
  expect(socket.url).toContain('eu.rtc.telnyx.com');

  socket.readyState = FakeWebSocket.OPEN;
  await act(async () => socket.onopen?.({}));
  await settle();
  const messages = socket.sent.map((data) => JSON.parse(data));
  expect(messages).toContainEqual(
    expect.objectContaining({
      method: 'login',
      params: expect.objectContaining({ login_token: 'token' }),
    })
  );

  await act(async () => root.unmount());
  await settle();
  expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
  expect(unhandled).toEqual([]);
});
