# @telnyx/webrtc

![npm (scoped)](https://img.shields.io/npm/v/@telnyx/webrtc) [![Join Slack](https://img.shields.io/badge/join-slack-infomational)](https://joinslack.telnyx.com/)

## Summary

The Telnyx WebRTC Client provides all the functionality you need to start making voice & video calls from a browser.

- [Installation](#Installation)
- [Usage](#Usage)
- [Examples](#Examples)
  - [Vanilla JavaScript](#vanilla-javascript)
  - [React.js](#reactjs)
- [Browser support](#Browser-support)
- [Development](#Development)

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

To initialize the WebRTC client, you'll need to authenticate using a Telnyx SIP Connection. Follow our [quickstart guide](https://developers.telnyx.com/docs/v2/webrtc/quickstart) to create **JWTs** (JSON Web Tokens) to authenticate. You can also authenticate directly with the SIP Connection `username` and `password`.

### Client

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

// You can call client.disconnect() when you're done.
// Note: When you call `client.disconnect()` you need to remove all ON event methods you've had attached before.

// Disconnecting and Removing listeners.
// client.disconnect();
// client.off('telnyx.ready')
// client.off('telnyx.notification');
```

> See ON [Events](https://github.com/team-telnyx/webrtc/tree/main/packages/js#events)

> See [TelnyxRTC#constructor](./docs/ts/classes/telnyxrtc.md#constructor) for all options.

Important: You should treat Connection credentials as sensitive data and should not hardcode credentials into your frontend web application. Check out the [app examples](./examples) for sample code that handles username and password by prompting the user.

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

To initiate an outgoing call:

```js
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destinationNumber: '18004377950',
  callerNumber: '‬155531234567',
});
```

To enable video when calling:

```js
const videoCall = client.newCall({
  destinationNumber: 'sip:example@sip.example.com',
  video: true,
});

// And in your HTML, replace the audio element with video.
//  <video id="remoteMedia" autoplay="true" playsinline="true" />
```

> See [TelnyxRTC.newCall](./docs/ts/classes/telnyxrtc.md#newCall) for all options.

To answer an incoming call:

```js
client.on('telnyx.notification', (notification) => {
  const call = notification.call;

  if (notification.type === 'callUpdate' && call.state === 'ringing') {
    call.answer();
  }
});
```

Both the outgoing and incoming `Call` instance has methods that can be hooked up to your UI:

```js
// Hangup or reject an incoming call
call.hangup();

// Send digits and keypresses
call.dtmf('1234');

// Call states that can be toggled
call.hold();
call.muteAudio();
```

> See [Call#methods](./docs/ts/classes/call.md#methods) for all methods.

### Debugging

In order to have a better idea on what is going on under the hood you can gather webrtc metrics for a call:

```js
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destinationNumber: '18004377950',
  callerNumber: '‬155531234567',
  debug: true // Default is false,
  debugOutput: 'socket' // Possible values are 'socket' | 'file'
});

// The debug dump is set to be sent to telnyx by default, if you want to save the debug data to disk
// You can change the debugOutput option to 'file'
```

### In-Call Quality Metrics

To be able to get the in-call quality metrics you have to first enable debugging for the call and then listen for the `telnyx.stats.frame` event.

```js
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destinationNumber: '18004377950',
  debug: true, // it is required to enable debugging for the call,
});

client.on('telnyx.stats.frame', (stats) => {
  console.log(stats);
});
```

### Pre-Call Diagnosis

To be able to run pre-call diagnosis you can use the `PreCallDiagnosis.run` method.

```js
import { PreCallDiagnosis } from '@telnyx/webrtc';

PreCallDiagnosis.run({
  credentials: {
    login: clientOptions.login,
    password: clientOptions.password,
    loginToken: clientOptions.login_token,
  },
  texMLApplicationNumber: '+1-240-775-8982',
})
  .then((report) => {
    console.log(report);
  })
  .catch((error) => {
    console.error(error);
  });
```

### Setting Preferred Codec

You can pass `preferred_codecs` to the `newCall` method to set codec preference during the call.

`preferred_codecs` is a sub-array of the codecs returned by [RTCRtpReceiver.getCapabilities('audio')](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/getCapabilities_static#codecs)

```js
const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;

const PCMACodec = allCodecs.find((c) =>
  c.mimeType.toLowerCase().includes('pcma')
);

client.newCall({
  destinationNumber: '123',
  preferred_codecs: [PCMACodec],
});
```

### Getting the Registration State

To retrieve the registration state from the server gateway you can
use `client.getIsRegistered` method

```js
client.getIsRegistered().then(isRegistered => {...})
```

### Anonymous Login for AI assistant

The TelnyxRTC client can be used with an AI assistant by using the `anonymous_login` method. This allows you to authenticate without a SIP connection, making it easier to integrate with AI assistants.

**Note:** In order for anonymous login to work, you have to set `telephony_settings.supports_unauthenticated_web_calls` to `true` via the API or in the assistant's telephony settings tab in the portal.

```js
const client = new TelnyxRTC({
  anonymous_login: {
    /** Your AI assistant's ID */
    target_id: 'assistant-UUID',
    target_type: 'ai_assistant',
  },
});

client.connect();
```

### Making Calls to AI Assistants

Making calls to the AI assistant is similar to making calls with a SIP connection. You can use the `newCall` method to initiate a call, the destination number can be left blank.

```js
const call = client.newCall({
  destinationNumber: '',
  remoteElement: 'remoteElement',
  /** other call options. */
});
```

Its recommended that you set the preferred codec to `opus` by passing the `preferred_codecs` option to the `newCall` method when calling AI assistants.

```js
const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;
const opusCodec = allCodecs.find((c) =>
  c.mimeType.toLowerCase().includes('opus')
);

client.newCall({
  destinationNumber: '',
  preferred_codecs: [opusCodec],
});
```

---

## Examples

We've included a few [examples in vanilla JavaScript (ES6) and React](https://github.com/team-telnyx/webrtc-examples/tree/main/js) to help you get started.

> _Looking for more examples in React? Check out our React client packages:_
>
> - [@telnyx/react-client](../react-client)

---

## Browser support

The following table indicates the browsers supported by TelnyxRTC.

We support the most recent (N) versions of these browsers unless otherwise indicated.

|         | Chrome | Firefox | Safari | Edge |
| ------- | ------ | ------- | ------ | ---- |
| Android | [-]    | [-]     | [ ]    | [ ]  |
| iOS     | [ ]    | [ ]     | [x]    | [ ]  |
| Linux   | [x]    | [-]     | [ ]    | [ ]  |
| MacOS   | [x]    | [-]     | [x]    | [-]  |
| Windows | [x]    | [-]     | [ ]    | [-]  |

[x] supports audio and video

[-] supports only audio

[ ] not supported

To extend support to other browsers, install and import [webrtc-adapter](https://www.npmjs.com/package/webrtc-adapter) before importing `TelnyxRTC`. For example:

```js
import 'webrtc-adapter';
import { TelnyxRTC } from '@telnyx/webrtc';
```

To check whether your browser supports TelnyxRTC, use [`TelnyxRTC.webRTCInfo`](./docs/ts/classes/telnyxrtc.md#webRTCInfo).

---

## Development

_**Requirement** Node v11.15.0 or later_

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

### Documentation

[TypeScript documentation](./docs/ts) is automatically generated from TSDoc-style comments on merge to `main`.

Only code symbols with a symbol-level TSDoc comment will appear in the docs. Use `@category` to group symbols. For example:

```ts
// `PublicUseModule` will appear in docs due to the class-level TSDoc comment.
/**
 * A module for public consumption
 * @category Public Modules
 */
class PublicUseModule {
  // `getSomething` WILL appear in docs because
  // there is a TSDoc comment
  /**
   * Gets something.
   */
  getSomething() {}
  // `getSomethingElse` will NOT appear in docs
  // because of the `@ignore` tag
  /**
   * Adds another thing
   * @ignore
   */
  getSomethingElse() {}
  // `addAnotherThing` will NOT appear in docs
  // because there is no TSDoc comment
  addAnotherThing() {}
  // `updateSomething` will NOT appear in docs
  // because of the `private` keyword
  private updateSomething() {}
  // `deleteSomething` will NOT appear in docs
  // because of the `protected` keyword
  protected deleteSomething() {}
}

// `InternalUseModule` will NOT appear in docs,
// even if its members are documented, because
// there is no class-level TSDoc comment.
class InternalUseModule {
  doThis() {}
  doThat() {}
}
```

If you've added comments and still do not see documentation as expected, check the `typedocOptions.exclude` config in `tsconfig.json`.

#### Supported tags

In addition to the tags [supported by Typedoc](https://typedoc.org/guides/doccomments/#supported-tags), we use `apialias`, `example`/`examples` and `internalnote`.

_Note: `@link` is not supported in public-facing documentation at this time._

##### `@apialias`

Use `apialias` to display a different name in public documentation.

```ts
/**
 * @apialias PublicObject
 */
interface IPublicObject {}
```

##### `@examples`

Precede code samples with `examples`.

````ts
/**
 * @examples
 * ```js
 * new PublicUseModule(options);
 * ```
 */
````

##### `@internalnote`

Precede internal notes that should not be rendered with `internalnote`.

```ts
/**
 * @internalnote {@see InternalUseModule} for implementation
 */
```

---

## Contributing

See [Contribution Guide](../../docs/Contributing.md)

## License

[MIT](../../LICENSE) © [Telnyx](https://github.com/team-telnyx)
