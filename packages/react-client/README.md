# @telnyx/react-client

> React wrapper for Telnyx Client

[![NPM](https://img.shields.io/npm/v/@telnyx/react-client.svg)](https://www.npmjs.com/package/@telnyx/react-client) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @telnyx/react-client @telnyx/webrtc@2.27.10
```

This wrapper targets the latest stable SDK baseline, `@telnyx/webrtc@2.27.10`,
with a supported peer range of `>=2.27.10 <3`. Install both packages together.

## Lifecycle

- `useTelnyxRTC` returns `undefined` initially; `TelnyxRTCContext` initially contains
  `null`. Guard client access until the effect-created instance is available.
- Connection starts in a cancellable task after publication, allowing consumers
  to subscribe in `useEffect` before synchronous startup events are emitted.
- Changing token, login, password, or authentication mode replaces the client.
  Equivalent credential values do not reconnect, even with a new object each render.
  Explicit credentials are authoritative over authentication fields in `options`.
- Other options (including debug) are a mount-time snapshot, reused on credential
  replacement. Remount to apply changed options.
- Unmounting or replacing credentials invokes SDK `disconnect()`, ending active
  calls. Disconnect completes asynchronously; cleanup does not wait for it.
  Keep the provider mounted for as long as calls should remain active.
- Error and warning events are forwarded without disconnecting the client;
  recovery remains owned by the SDK. StrictMode cleanup never reuses a disposed client.

## Usage example

```jsx
// App.jsx
import { TelnyxRTCProvider } from '@telnyx/react-client';

function App() {
  const credential = {
    login_token: 'mytoken',
  };

  return (
    <TelnyxRTCProvider credential={credential}>
      <Phone />
    </TelnyxRTCProvider>
  );
}
```

```jsx
// Phone.jsx
import { useNotification, Audio } from '@telnyx/react-client';

function Phone() {
  const notification = useNotification();
  const activeCall = notification && notification.call;

  return (
    <div>
      {activeCall &&
        activeCall.state === 'ringing' &&
        'You have an incoming call.'}

      <Audio stream={activeCall && activeCall.remoteStream} />
    </div>
  );
}
```

## Hooks

### `useCallbacks`

```jsx
import { useCallbacks } from '@telnyx/react-client';

function Phone() {
  useCallbacks({
    onReady: () => console.log('client ready'),
    onError: () => console.log('client registration error'),
    onWarning: (warning) => console.log('client warning:', warning),
    onSocketError: () => console.log('client socket error'),
    onSocketClose: () => console.log('client disconnected'),
    onNotification: (x) => console.log('received notification:', x),
  });

  // ...
}
```

### `useTelnyxRTC`

If you need more fine-tuned control over TelnyxRTC, you also have access to `useTelnyxRTC` directly.

```jsx
import { useEffect } from 'react';
import { useTelnyxRTC } from '@telnyx/react-client';

function Phone() {
  const client = useTelnyxRTC({ login_token: 'mytoken' });

  useEffect(() => {
    if (!client) return;
    const onReady = () => console.log('client ready');
    client.on('telnyx.ready', onReady);
    return () => {
      client.off('telnyx.ready', onReady);
    };
  }, [client]);

  // ...
}
```

Take care to use this hook only once in your application. For most cases, we recommend you use [TelnyxRTCContext/TelnyxRTCProvider](#TelnyxRTCContextProvider) instead of this hook directly. This ensures that you only have one Telnyx client instance running at a time.

### `useContext` with `TelnyxRTCContext`

You can retrieve the current TelnyxRTC context value by using React's [`useContext` hook](https://reactjs.org/docs/hooks-reference.html#usecontext), as an alternative to [TelnyxRTCContext.Consumer](#TelnyxRTCContextConsumer).

```jsx
import React, { useContext, useEffect } from 'react';
import { TelnyxRTCContext } from '@telnyx/react-client';

function Phone() {
  const client = useContext(TelnyxRTCContext);

  useEffect(() => {
    if (!client) return;
    const onReady = () => console.log('client ready');
    client.on('telnyx.ready', onReady);
    return () => {
      client.off('telnyx.ready', onReady);
    };
  }, [client]);

  // ...
}
```

## Components

### `TelnyxRTCContextProvider`

```jsx
import { TelnyxRTCProvider } from '@telnyx/react-client';

function App() {
  const credential = {
    // You can either use your On-Demand Credential token
    // or your Telnyx SIP username and password
    // login_token: 'mytoken',
    login: 'myusername',
    password: 'mypassword',
  };

  const options = {
    ringtoneFile: 'https://example.com/sounds/incoming_call.mp3',
    ringbackFile: 'https://example.com/sounds/ringback_tone.mp3',
  };

  return (
    <TelnyxRTCProvider credential={credential} options={options}>
      <Phone />
    </TelnyxRTCProvider>
  );
}
```

### `TelnyxRTCContext.Consumer`

```jsx
import { TelnyxRTCContext } from '@telnyx/react-client';

function PhoneWrapper() {
  return (
    <TelnyxRTCContext.Consumer>
      {(context) => (context ? <Phone client={context} /> : null)}
    </TelnyxRTCContext.Consumer>
  );
}
```

### `Audio`

```jsx
import { Audio } from '@telnyx/react-client';

function Phone({ activeCall }) {
  return (
    <div>
      <Audio stream={activeCall.remoteStream} />
    </div>
  );
}
```

### `Video`

```jsx
import { Video } from '@telnyx/react-client';

function VideoConference({ activeCall }) {
  return (
    <div>
      <Video stream={activeCall.localStream} muted />
      <Video stream={activeCall.remoteStream} />
    </div>
  );
}
```

---

## Debugging

Enabling debugging will help telnyx diagnose issues on the client side
to enable debugging you can set `debug=true` in the provider options

```jsx
<TelnyxRTCProvider credential={credential} options={{ debug: true }}>
  // Your app goes here
</TelnyxRTCProvider>
```

## Development

The SDK dev dependency intentionally uses the exact registry tarball for 2.27.10.
This bypasses Yarn workspace linking to the in-repository SDK, so wrapper builds
and type checks exercise the published SDK and its real declarations. The SDK
remains a peer dependency for consumers; it is not bundled into the wrapper.

From the repository root:

```bash
yarn workspace @telnyx/react-client test --runInBand
yarn workspace @telnyx/react-client build
node node_modules/typescript/bin/tsc --noEmit -p packages/react-client/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p packages/react-client/tsconfig.test.json
```

Install dependencies:

```bash
yarn install
yarn start
yarn link

# in another tab:
git clone https://github.com/team-telnyx/webrtc-examples/tree/main/react-client/react-app

# fill in .env
yarn install
yarn link @telnyx/react-client
yarn start
```

---

## Contributing

See [Contribution Guide](../../docs/Contributing.md)

## License

[MIT](../../LICENSE) © [Telnyx](https://github.com/team-telnyx)
