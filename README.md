# Telnyx WebRTC SDK

![npm (scoped)](https://img.shields.io/npm/v/@telnyx/webrtc) <!-- GEN:chromium-version-badge-if-release -->[![Chromium version](https://img.shields.io/badge/chromium-82.0.4057.0-blue.svg?logo=google-chrome)](https://www.chromium.org/Home)<!-- GEN:stop --> <!-- GEN:firefox-version-badge-if-release -->[![Firefox version](https://img.shields.io/badge/firefox-72-blue.svg?logo=mozilla-firefox)](https://www.mozilla.org/en-US/firefox/new/)<!-- GEN:stop --> [![WebKit version](https://img.shields.io/badge/webkit-13.0.4-blue.svg?logo=safari)](https://webkit.org/) [![Join Slack](https://img.shields.io/badge/join-slack-infomational)](https://joinslack.telnyx.com/)

The Telnyx WebRTC SDK provides all the functionality you need to start making voice calls from a browser to phone numbers or other browsers.

## Requirements

You'll need node 8.6.0 or later.

You'll also need a Telnyx account in order to authenticate your application. Follow our [quick start guide](https://developers.telnyx.com/docs/v2/sip-trunking/quickstarts/portal-setup) to create a **Connection** with **Credentials Authentication** -- it's simple and quick to get set up with secure credentials that are automatically generated for you.

---

## Installation

Install the package with:

```
npm install @telnyx/webrtc --save
```

As long as you can import npm packages with a bundler like [Webpack](https://webpack.js.org/), you're ready to import `TelnyxRTC` and begin:

```js
import { TelnyxRTC } from '@telnyx/webrtc';
```

## Usage

To initialize the JavaScript SDK, you'll need to authenticate using a Telnyx Connection. You can access the Connection credentials in the [Telnyx Portal](https://portal.telnyx.com/#/app/connections).

```js
// Initialize the client
const client = new TelnyxRTC({
  // Required credentials
  credentials: {
    // Telnyx Connection Username
    username: 'username',
    // Telnyx Connection Password
    password: 'password',
  },
  // Other options
  //
  // This can be a DOM element, DOM selector, or a function that returns an element.
  remoteElement: '#videoOrAudioSelector',
  // This file can be a wav/mp3 in your local public folder or you can host it in a CDN and pass just the URL, such as https://cdn.company.com/sounds/call.mp3
  ringFile: './sounds/incoming_call.mp3',
  useMic: true,
  useSpeaker: true,
  useCamera: false,
});

// Create a variable to track the current call
let activeCall;

// Attach event listeners
client
  .on('socket.connect', () => console.log('socket connected'))
  .on('socket.close', () => console.log('socket closed'))
  .on('registered', () => console.log('registered'))
  .on('unregistered', () => console.log('unregistered'))
  // Event fired on call updates, e.g. when there's an incoming call
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

// Connect and login
client.connect();

// You can disconnect when you're done
// client.disconnect();
```

Important: You should treat Connection credentials as sensitive data and should not hardcode credentials into your frontend web application. Check out the [examples](examples/react) for sample React code that handles username and password by prompting the user.

### Calls

To initiate a call from your application:

```js
// You can save this call or wait for `callUpdate` and use the returned `activeCall`
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destination: '18004377950',
  callerName: 'Caller ID Name',
  // Caller ID number is optional.
  // You can only specify a phone number that you own and have assigned
  // to your Connection in the Telnyx Portal
  callerNumber: '‬',
});
```

A [Call](./docs/ts/interfaces/icall.md) has methods that can be hooked up to your UI:

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

We've included a few [examples in React](examples/react) to help you get started. This library is not limited to React and can be used with any JavaScript framework of your choosing.

```
cd examples/react
npm run setup
npm install
npm run storybook
```

Configuration options for your Telnyx account are available under the [Storybook **Knobs**](https://github.com/storybookjs/storybook/tree/master/addons/knobs).

---

## Contributing

### Development

This library is written in [TypeScript](https://www.typescriptlang.org/) to define a clear API with optional typechecking benefits.

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

### Releasing

Releases are handled by the [release-it](https://github.com/release-it/release-it) package. This is available as an npm script:

```
# start a release with prompts
npm run release

# pass in specific arguments
npm run release -- <type|version>
npm run release -- minor
npm run release -- major
```

Open a new pull request with your changes to propose a new release.
