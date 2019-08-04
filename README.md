# telnyx-rtc

The Telnyx RTC SDK provides all the functionality you need to start making WebRTC calls from a browser.

**NOTE**: Video will be supported in a future release.

## Requirements

You'll need node 8.6.0 or later.

You'll also need a Telnyx account. [Sign up for free](https://telnyx.com/sign-up) and then follow our [quick start guide](https://developers.telnyx.com/docs/v2/sip-trunking/quickstarts/portal-setup) to create a Connection with Credentials Authentication. Make note of your Connection username and password.

## Installation

Install the package with:

```
npm install telnyx-rtc --save
```

As long as you can import NPM packages with a bundler like [webpack](https://webpack.js.org/), you're ready to begin.

---

## Usage

The package needs to be configured with a SIP username and password. You can add credentials to a [connection](https://portal.telnyx.com/#/app/connections) under your Telnyx account.

```js
// Import and initialize the client
import { TelnyxRTC } from 'telnyx-rtc';

const client = new TelnyxRTC({
  credentials: {
    // Telnyx Connection Username
    username: 'username',
    // Telnyx Connection Password
    password: 'password',
  },
  // This can be a DOM element, DOM selector, or a function that returns an element.
  remoteElement: '#videoOrAudioSelector',
  useMic: true,
  useSpeaker: true,
  useCamera: false,
});

// Create a variable to track the current call
let activeCall;

// Attach event listeners
newClient
  .on('socket.connect', () => console.log('socket connected'))
  .on('socket.close', () => console.log('socket closed'))
  .on('registered', () => console.log('registered'))
  .on('unregistered', () => console.log('unregistered'))
  .on('callUpdate', (call) => {
    activeCall = call;

    switch (call.state) {
      // Connecting to a call
      case 'connecting':
        return;
      // Receiving an inbound call
      case 'ringing':
        return;
      // An established and active call
      case 'active':
        return;
      // Call is active but on hold
      case 'held':
        return;
      // Call is over and can be removed
      case 'done':
        activeCall = null;
      // New calls that haven't started connecting yet
      case 'new':
      default:
        return;
    }
  });

client.connect();

// You can disconnect when you're done
// client.disconnect();
```

### Calls

```js
// You can save this call or wait for callUpdate
const newCall = client.newCall({
  destination: '18004377950',
  callerName: 'Caller ID Name',
  // You can only specify numbers which were purchased and assigned to your connection
  callerNumber: '‬',
});
```

A Call has more methods that can be hooked up to your UI:

```js
// End a call
call.hangup();

// Call states that can be toggled
call.hold();
call.unhold();
call.mute();
call.unmute();

// Send digits and keypresses
call.dtmf('1234');

// Transfer the call to another destination
call.transfer('destination');

// Answer an incoming call
call.answer();
// Reject an incoming call
call.reject();
```

---

## Examples

We've included a few [React examples](examples/react) to help you get started. This library can be used with any framework of your choosing.

```
cd examples/react
npm run setup
npm install
npm run storybook
```

Configuration options for your Telnyx account are available under the **Storybook Knobs**.

---

## Development

This library is written in TypeScript to define a clear API with optional typechecking benefits.

To contribute, clone this repo and install locally:

```
npm install
```

Afterwards, you're ready to make changes to files in `src`.

To run all tests:

```
npm test
```

To generate TypeScript documentation:

```
npm run docs
```
