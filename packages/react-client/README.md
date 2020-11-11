# @telnyx/react-client

> React wrapper for Telnyx Client

[![NPM](https://img.shields.io/npm/v/@telnyx/react-client.svg)](https://www.npmjs.com/package/@telnyx/react-client) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @telnyx/react-client
```

## Usage

```jsx
// App.jsx
import { TelnyxClientProvider } from '@telnyx/react-client';

function App() {
  const credential = {
    login_token: 'mytoken',
  };

  return (
    <TelnyxClientProvider credential={credential}>
      <Phone />
    </TelnyxClientProvider>
  );
}
```

```jsx
// Phone.jsx
import { useNotification } from '@telnyx/react-client';

function Phone() {
  const notification = useNotification();
  const activeCall = notification && notification.call;

  return (
    <div>
      {activeCall &&
        activeCall.state === 'ringing' &&
        'You have an incoming call.'}
    </div>
  );
}
```

### with `useEvents`

```jsx
import { useEvents } from '@telnyx/react-client';

function Phone() {
  useNotification({
    onReady: () => console.log('client ready'),
    onError: () => console.log('client registration error'),
    onNotification: (x) => console.log('received notification:', x),
  });

  // ...
}
```

### with `TelnyxClientContext.Consumer`

```jsx
import { TelnyxClientContext } from '@telnyx/react-client';

function PhoneWrapper() {
  return (
    <TelnyxClientContext.Consumer>
      {(context) => <Phone client={context} />}
    </TelnyxClientContext.Consumer>
  );
}
```

### `useTelnyxClient` usage

```jsx
import { useTelnyxClient } from '@telnyx/react-client';

function Phone() {
  const client = useTelnyxClient({ login_token: 'mytoken' });

  client.on('telnyx.ready', () => {
    console.log('client ready');
  });

  // ...
}
```

You should only have one Telnyx client instance running at a time. To ensure a single instance, it's recommended to use `TelnyxClientContext`/`TelnyxClientProvider` instead of using this hook directly.

## Development

Install dependencies:

```bash
npm install
# in another tab:
cd example && npm install
```

Watch and compile files:

```bash
npm start
# in another tab:
cd example && npm start
```

## License

MIT © [Telnyx](https://github.com/team-telnyx)
