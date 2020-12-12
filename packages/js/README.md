# @telnyx/webrtc

![npm (scoped)](https://img.shields.io/npm/v/@telnyx/webrtc) <!-- GEN:chromium-version-badge-if-release -->[![Chromium version](https://img.shields.io/badge/chromium-82.0.4057.0-blue.svg?logo=google-chrome)](https://www.chromium.org/Home)<!-- GEN:stop --> <!-- GEN:firefox-version-badge-if-release -->[![Firefox version](https://img.shields.io/badge/firefox-72-blue.svg?logo=mozilla-firefox)](https://www.mozilla.org/en-US/firefox/new/)<!-- GEN:stop --> [![WebKit version](https://img.shields.io/badge/webkit-13.0.4-blue.svg?logo=safari)](https://webkit.org/) [![Join Slack](https://img.shields.io/badge/join-slack-infomational)](https://joinslack.telnyx.com/)

The Telnyx WebRTC Client provides all the functionality you need to start making voice & video calls from a browser.

---

## Requirements

You'll need a Telnyx account in order to authenticate your application. Follow our [WebRTC quickstart guide](https://developers.telnyx.com/docs/v2/webrtc/quickstart) to setup your account.

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

To initialize the WebRTC client, you'll need to authenticate using a Telnyx SIP Connection. Follow our [quickstart guide](https://developers.telnyx.com/docs/v2/webrtc/quickstart) to create **JWTs** (JSON Web Tokens) to authenticate. You can also authenticate directly with the SIP Connection `username` and `password`.

```js
// Initialize the client
const client = new TelnyxRTC({
  /* Use a JWT to authenticate (recommended) */
  login_token: login_token,
  /* or use your Connection credentials */
  // login: username,
  // password: password,
});

// Connect and login
client.connect();

// You can disconnect when you're done
//  client.disconnect();
```

> See [TelnyxRTC#constructor](./docs/ts/classes/telnyxrtc.md#constructors) for all options.

Important: You should treat Connection credentials as sensitive data and should not hardcode credentials into your frontend web application. Check out the [examples](https://github.com/team-telnyx/webrtc/tree/main/examples/react) for sample React code that handles username and password by prompting the user.

To hear/view calls in the browser, you'll need to specify an HTML media element:

```js
client.remoteElement = 'remoteMedia';
```

The corresponding HTML:

```html
<audio id="remoteMedia" autoplay="true" />
<!-- or for video: -->
<!-- <video id="remoteMedia" autoplay="true" playsinline="true" /> -->
```

### Events

```js
// Create a variable to track the current call
let activeCall;

// Attach event listeners
client
  .on('telnyx.ready', () => console.log('ready to call'))
  .on('telnyx.error', () => console.log('error'))
  // Events are fired on both session and call updates
  // ex: when the session has been established
  // ex: when there's an incoming call
  .on('telnyx.notification', (notification) => {
    if (notification.type === 'callUpdate') {
      activeCall = notification.call;
    }
  });
```

> See [TelnyxRTC.on](./docs/ts/classes/telnyxrtc.md#on) for all events.

### Calls

```js
// Dial a number
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destinationNumber: '18004377950',
  callerNumber: '‬155531234567',
});
```

Set `video` to `true` to enable audio & video:

```js
const videoCall = client.newCall({
  destinationNumber: 'sip:example@sip.example.com',
  video: true,
});

// And in your HTML:
//  <video id="remoteMedia" autoplay="true" playsinline="true" />
```

> See [TelnyxRTC.newCall](./docs/ts/classes/telnyxrtc.md#newCall) for all options.

A `Call` instance has methods that can be hooked up to your UI:

```js
// Answer an incoming call in the `'telnyx.notification'` event
call.answer();
// Hangup or reject an incoming call
call.hangup();

// Send digits and keypresses
call.dtmf('1234');

// Call states that can be toggled
call.hold();
call.muteAudio();
```

> See [Call#methods](./docs/ts/classes/call.md#methods) for all methods.

---

## Examples

### Vanilla Javascript

We've included a few [examples in Javascript (ES6)](https://github.com/team-telnyx/webrtc/tree/main/packages/js/examples/vanilla) to help you get started.

```
cd examples/vanilla
open index.html
```

Screenshot:
![Video call](https://raw.githubusercontent.com/team-telnyx/webrtc/master/packages/js/examples/vanilla/vanilla-screeshot.png)

---

### ReactJS

We've included a few [examples in React](https://github.com/team-telnyx/webrtc/tree/main/packages/js/examples) to help you get started. This library is not limited to React and can be used with any JavaScript framework of your choosing.

> _Looking for an easier way to get started with React or React Native? Check out our other packages:_
>
> - [@telnyx/react-client](../react-client)
> - [@telnyx/react-native](../react-client)

#### Audio call

```
cd examples/react-audio
npm run setup
npm install
npm run storybook
```

Configuration options for your Telnyx account are available under the [Storybook **Knobs**](https://github.com/storybookjs/storybook/tree/master/addons/knobs).

Screenshot:
![Web Dialer](https://raw.githubusercontent.com/team-telnyx/webrtc/master/packages/js/examples/react-audio/storybook-screenshot.png)

#### Video call

```
cd examples/react-video
npm run setup
npm install
npm start
```

Screenshot:
![Web Dialer](https://raw.githubusercontent.com/team-telnyx/webrtc/master/packages/js/examples/react-video/react-video-screenshot.png)

---

## Development

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

TypeScript documentation is automatically generated from TSDoc-style comments on merge to `main`.

### Requirements

You'll need node v11.15.0 or later.

---

## Contributing

See [Contribution Guide](../../docs/Contributing.md)

## License

[MIT](../../LICENSE) © [Telnyx](https://github.com/team-telnyx)
