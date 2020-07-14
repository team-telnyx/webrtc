# Telnyx WebRTC SDK

## Version v1

To access v1 click [here](https://github.com/team-telnyx/webrtc/tree/v1.0.9)

## Version v2

![npm (scoped)](https://img.shields.io/npm/v/@telnyx/webrtc) <!-- GEN:chromium-version-badge-if-release -->[![Chromium version](https://img.shields.io/badge/chromium-82.0.4057.0-blue.svg?logo=google-chrome)](https://www.chromium.org/Home)<!-- GEN:stop --> <!-- GEN:firefox-version-badge-if-release -->[![Firefox version](https://img.shields.io/badge/firefox-72-blue.svg?logo=mozilla-firefox)](https://www.mozilla.org/en-US/firefox/new/)<!-- GEN:stop --> [![WebKit version](https://img.shields.io/badge/webkit-13.0.4-blue.svg?logo=safari)](https://webkit.org/) [![Join Slack](https://img.shields.io/badge/join-slack-infomational)](https://joinslack.telnyx.com/)

The Telnyx WebRTC SDK provides all the functionality you need to start making voice calls from a browser to phone numbers or other browsers.

## Requirements

You'll need node v11.15.0 or later.

You'll also need a Telnyx account in order to authenticate your application. Follow our [quick start guide](https://developers.telnyx.com/docs/v2/sip-trunking/quickstarts/portal-setup) to create a **Connection** with **Credentials Authentication** -- it's simple and quick to get set up with secure credentials that are automatically generated for you.

---

## Our packages

- `@telnyx/webrtc`
- `@telnyx/react-native` - [React Native](https://www.npmjs.com/package/@telnyx/react-native)

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

To use the `ringbackFile` make sure the option "Generate Ringback Tone" is disabled in your connection configuration on customer-portal

```js
// Initialize the client
const client = new TelnyxRTC({
  // Required credentials
  login: username,
  password: password,
  /* 
    ringtoneFile - This file can be a wav/mp3 in your local public folder or you can host it in a CDN and pass just the URL, such as https://cdn.company.com/sounds/call.mp3
   */
  ringtoneFile: './sounds/incoming_call.mp3',
  /*
    ringbackFile - Used when you disable Generate Ringback Tone to provide your own ringback sound - Enable Instant Ringback (180).
  */
  ringbackFile: './sounds/ringback_tone.mp3',
});

// Create a variable to track the current call
let activeCall;

// Attach event listeners
client
  .on('telnyx.socket.open', () => console.log('socket open'))
  .on('telnyx.socket.close', () => {
    console.log('socket closed');
    client.disconnect();
  })
  .on('telnyx.socket.error', (error) => {
    console.log('telnyx.socket.error', error);
    client.disconnect();
  })
  .on('telnyx.ready', () => console.log('ready to call'))
  .on('telnyx.error', () => console.log('error'))
  // Event fired on call updates, e.g. when there's an incoming call
  .on('telnyx.notification', (notification) => {
    activeCall = notification.call;

    switch (notification.type) {
      case 'callUpdate':
        // Call is over and can be removed
        if (
          notification.call.state === 'hangup' ||
          notification.call.state === 'destroy'
        ) {
          activeCall = null;
        }
        // An established and active call
        if (notification.call.state === 'active') {
          return;
        }
        // New calls that haven't started connecting yet
        if (notification.call.state === 'new') {
          return;
        }
        // Receiving an inbound call
        if (notification.call.state === 'ringing') {
          return;
        }
        // Call is active but on hold
        if (notification.call.state === 'held') {
          return;
        }
        break;
    }
  });

// Connect and login
client.connect();

// You can disconnect when you're done
// client.disconnect();
```

Important: You should treat Connection credentials as sensitive data and should not hardcode credentials into your frontend web application. Check out the [examples](https://github.com/team-telnyx/webrtc/tree/master/examples/react) for sample React code that handles username and password by prompting the user.

### Calls

To initiate a call from your application:

```js
// You can save this call or wait for `callUpdate` and use the returned `activeCall`
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destinationNumber: '18004377950',
  callerName: 'Caller ID Name',
  // Caller ID number is optional.
  // You can only specify a phone number that you own and have assigned
  // to your Connection in the Telnyx Portal
  callerNumber: '‬',
  audio: true,
  video: false, //Used to enable/disable video
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

#### Using WebRTC with React to make an audio call

```Js
    // Used to set remote stream
    if (mediaRef.current && call && call.remoteStream) {
        mediaRef.current.srcObject = call.remoteStream;
    }

    <audio
      ref={mediaRef}
      id='audioCall'
      autoPlay='autoplay'
      controls={false}
    />
```

---

#### Using WebRTC with Vanilla Javascript to make video call

```Js
    // Used to set local and remote stream
    client.remoteElement = 'remoteVideo';
    client.localElement = 'localVideo';

    <video
      id="localVideo"
      autoplay="true"
      playsinline="true"
    />
     <video
      id="remoteVideo"
      autoplay="true"
      playsinline="true"
    />

```

---

## Examples

### Vanilla Javascript

We've included a few [examples in Javascript(ES6)](https://github.com/team-telnyx/webrtc/tree/master/examples/vanilla) to help you get started.

```
cd examples/vanilla
open index.html
```

Screenshot:
![Video call](examples/vanilla/vanilla-screeshot.png?raw=true)

---

### ReactJS

We've included a few [examples in React](https://github.com/team-telnyx/webrtc/tree/master/examples/react) to help you get started. This library is not limited to React and can be used with any JavaScript framework of your choosing.

```
cd examples/react
npm run setup
npm install
npm run storybook
```

Configuration options for your Telnyx account are available under the [Storybook **Knobs**](https://github.com/storybookjs/storybook/tree/master/addons/knobs).

Screenshot:
![Web Dialer](examples/react/storybook-screenshot.png?raw=true)

---

### React Native

We've included a few [examples in React Native](https://github.com/team-telnyx/webrtc/tree/master/examples/react-native) to help you get started.\
You can access the documentation [here](https://www.npmjs.com/package/@telnyx/react-native) about `@telnyx/react-native` to have more information.

```
cd examples/react-native
npm install
npm run android or npm run ios
```

Screenshot:
![Video call app](examples/react-native/app-screenshot.png?raw=true)

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
