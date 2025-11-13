The `TelnyxRTC` client connects your application to the Telnyx backend,
enabling you to make outgoing calls and handle incoming calls.

**`Examples`**

```js
// Initialize the client
const client = new TelnyxRTC({
  // Use a JWT to authenticate (recommended)
  login_token: login_token,
  // or use your Connection credentials
  //  login: username,
  //  password: password,
});

// Attach event listeners
client
  .on('telnyx.ready', () => console.log('ready to call'))
  .on('telnyx.notification', (notification) => {
    console.log('notification:', notification)
  });

// Connect and login
client.connect();

// You can call client.disconnect() when you're done.
Note: When you call `client.disconnect()` you need to remove all ON event methods you've had attached before.

// Disconnecting and Removing listeners.
client.disconnect();
client.off('telnyx.ready')
client.off('telnyx.notification');
```

## Hierarchy

- `default`

  ↳ **`TelnyxRTC`**

## Table of contents

### Constructors

- [constructor](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#constructor)

### Accessors

- [connected](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#connected)
- [localElement](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#localelement)
- [mediaConstraints](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#mediaconstraints)
- [remoteElement](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#remoteelement)
- [speaker](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#speaker)

### Methods

- [checkPermissions](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#checkpermissions)
- [connect](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#connect)
- [disableMicrophone](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#disablemicrophone)
- [disconnect](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#disconnect)
- [enableMicrophone](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#enablemicrophone)
- [getAudioInDevices](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#getaudioindevices)
- [getAudioOutDevices](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#getaudiooutdevices)
- [getDeviceResolutions](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#getdeviceresolutions)
- [getDevices](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#getdevices)
- [getVideoDevices](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#getvideodevices)
- [handleLoginError](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#handleloginerror)
- [logout](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#logout)
- [newCall](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#newcall)
- [off](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#off)
- [on](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#on)
- [setAudioSettings](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#setaudiosettings)
- [webRTCInfo](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#webrtcinfo)
- [webRTCSupportedBrowserList](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md#webrtcsupportedbrowserlist)

## Constructors

### constructor

• **new TelnyxRTC**(`options`)

Creates a new `TelnyxRTC` instance with the provided options.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | [`IClientOptions`](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md) | Options for initializing a client |

**`Examples`**

Authenticating with a JSON Web Token:

```javascript
const client = new TelnyxRTC({
  login_token: login_token,
});
```

Authenticating with username and password credentials:

```js
const client = new TelnyxRTC({
  login: username,
  password: password,
});
```

#### Custom ringtone and ringback

Custom ringback and ringtone files can be a wav/mp3 in your local public folder
or a file hosted on a CDN, ex: https://cdn.company.com/sounds/call.mp3.

To use the `ringbackFile`, make sure the "Generate Ringback Tone" option is **disabled**
in your [Telnyx Portal connection](https://portaldev.telnyx.com/#/app/connections)
configuration (Inbound tab.)

```js
const client = new TelnyxRTC({
  login_token: login_token,
  ringtoneFile: './sounds/incoming_call.mp3',
  ringbackFile: './sounds/ringback_tone.mp3',
});
```

#### To hear/view calls in the browser, you'll need to specify an HTML media element:

```js
client.remoteElement = 'remoteMedia';
```

The corresponding HTML:

```html
<audio id="remoteMedia" autoplay="true" />
<!-- or for video: -->
<!-- <video id="remoteMedia" autoplay="true" playsinline="true" /> -->
```

#### Keep Connection Alive on Socket Close

By default, when the websocket connection is closed and an `attach` message is received, the call will be hung up with a default cause.
To keep the call alive when an `attach` message is received, pass `keepConnectionAliveOnSocketClose`:

```js
const client = new TelnyxRTC({
  keepConnectionAliveOnSocketClose: true,
});
```

> Note: If client using this option is switching networks and there are new network restrictions, combine this option with `iceServers` overrides and `forceRelayCandidate` to ensure connectivity on signaling.

#### Overrides

TelnyxRTCClient.constructor

## Accessors

### connected

• `get` **connected**(): `boolean`

`true` if the client is connected to the Telnyx RTC server

#### Returns

`boolean`

**`Example`**

```js
const client = new TelnyxRTC(options);
console.log(client.connected); // => false
```

#### Inherited from

TelnyxRTCClient.connected

___

### localElement

• `get` **localElement**(): `string` \| `Function` \| `HTMLMediaElement`

Gets the local html element.

#### Returns

`string` \| `Function` \| `HTMLMediaElement`

**`Example`**

```js
const client = new TelnyxRTC(options);

console.log(client.localElement);
// => HTMLMediaElement
```

#### Inherited from

TelnyxRTCClient.localElement

• `set` **localElement**(`tag`): `void`

Sets the local html element that will receive the local stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `tag` | `string` \| `Function` \| `HTMLMediaElement` |

#### Returns

`void`

**`Example`**

```js
const client = new TelnyxRTC(options);
client.localElement = 'localElementMediaId';
```

#### Inherited from

TelnyxRTCClient.localElement

___

### mediaConstraints

• `get` **mediaConstraints**(): `Object`

Audio and video constraints currently used by the client.

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `audio` | `boolean` \| `MediaTrackConstraints` |

**`Examples`**

```js
const client = new TelnyxRTC(options);

console.log(client.mediaConstraints);
// => { audio: true, video: false }
```

#### Inherited from

TelnyxRTCClient.mediaConstraints

___

### remoteElement

• `get` **remoteElement**(): `string` \| `Function` \| `HTMLMediaElement`

Gets the remote html element.

#### Returns

`string` \| `Function` \| `HTMLMediaElement`

**`Example`**

```js
const client = new TelnyxRTC(options);

console.log(client.remoteElement);
// => HTMLMediaElement
```

#### Inherited from

TelnyxRTCClient.remoteElement

• `set` **remoteElement**(`tag`): `void`

Sets the remote html element that will receive the remote stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `tag` | `string` \| `Function` \| `HTMLMediaElement` |

#### Returns

`void`

**`Example`**

```js
const client = new TelnyxRTC(options);
client.remoteElement = 'remoteElementMediaId';
```

#### Inherited from

TelnyxRTCClient.remoteElement

___

### speaker

• `get` **speaker**(): `string`

Default audio output device, if set by client.

#### Returns

`string`

**`Example`**

```js
const client = new TelnyxRTC(options);

console.log(client.speaker);
// => "abc123xyz"
```

#### Inherited from

TelnyxRTCClient.speaker

• `set` **speaker**(`deviceId`): `void`

Sets the default audio output device for subsequent calls.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |

#### Returns

`void`

**`Example`**

```js
let result = await client.getAudioOutDevices();

if (result.length) {
  client.speaker = result[1].deviceId;
}
```

#### Inherited from

TelnyxRTCClient.speaker

## Methods

### checkPermissions

▸ **checkPermissions**(`audio?`, `video?`): `Promise`\<`boolean`\>

Checks if the browser has the permission to access mic and/or webcam

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `audio` | `boolean` | `true` | Whether to check for microphone permissions. |
| `video` | `boolean` | `true` | Whether to check for webcam permissions. |

#### Returns

`Promise`\<`boolean`\>

**`Examples`**

Checking for audio and video permissions:

```js
const client = new TelnyxRTC(options);

client.checkPermissions();
```

Checking only for audio permissions:

```js
const client = new TelnyxRTC(options);

client.checkPermissions(true, false);
```

Checking only for video permissions:

```js
const client = new TelnyxRTC(options);

client.checkPermissions(false, true);
```

#### Inherited from

TelnyxRTCClient.checkPermissions

___

### connect

▸ **connect**(): `Promise`\<`void`\>

Creates a new connection for exchanging data with the WebRTC server

#### Returns

`Promise`\<`void`\>

**`Examples`**

```js
const client = new TelnyxRTC(options);

client.connect();
```

#### Inherited from

TelnyxRTCClient.connect

___

### disableMicrophone

▸ **disableMicrophone**(): `void`

Disables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: true` is
specified when creating a new call.

#### Returns

`void`

**`Examples`**

```js
const client = new TelnyxRTC(options);

client.disableMicrophone();
```

Keep in mind that new calls will fail if both the
microphone and webcam is disabled. Make sure that the
webcam is manually enabled, or `video: true` is
specified before disabling the microphone.

```js
const client = new TelnyxRTC({
  ...options,
  video: true
});

client.disableMicrophone();
```

#### Inherited from

TelnyxRTCClient.disableMicrophone

___

### disconnect

▸ **disconnect**(): `Promise`\<`void`\>

Disconnect all active calls

#### Returns

`Promise`\<`void`\>

**`Examples`**

```js
const client = new TelnyxRTC(options);

client.disconnect();
```

#### Inherited from

TelnyxRTCClient.disconnect

___

### enableMicrophone

▸ **enableMicrophone**(): `void`

Enables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: false` is
specified when creating a new call.

#### Returns

`void`

**`Examples`**

```js
const client = new TelnyxRTC(options);

client.enableMicrophone();
```

#### Inherited from

TelnyxRTCClient.enableMicrophone

___

### getAudioInDevices

▸ **getAudioInDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns the audio input devices supported by the browser.

#### Returns

`Promise`\<`MediaDeviceInfo`[]\>

Promise with an array of MediaDeviceInfo

**`Examples`**

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);

  let result = await client.getAudioInDevices();

  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getAudioInDevices().then((result) => {
  console.log(result);
});
```

#### Inherited from

TelnyxRTCClient.getAudioInDevices

___

### getAudioOutDevices

▸ **getAudioOutDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns the audio output devices supported by the browser.

Browser Compatibility Note: Firefox has yet to fully implement
audio output devices. As of v63, this feature is behind the
user preference `media.setsinkid.enabled`.
See: https://bugzilla.mozilla.org/show_bug.cgi?id=1152401#c98

#### Returns

`Promise`\<`MediaDeviceInfo`[]\>

Promise with an array of MediaDeviceInfo

**`Examples`**

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);

  let result = await client.getAudioOutDevices();

  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getAudioOutDevices().then((result) => {
  console.log(result);
});
```

#### Inherited from

TelnyxRTCClient.getAudioOutDevices

___

### getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`): `Promise`\<`any`[]\>

Returns supported resolution for the given webcam.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | the `deviceId` from your webcam. |

#### Returns

`Promise`\<`any`[]\>

**`Examples`**

If `deviceId` is `null`

1. if `deviceId` is `null` and you don't have a webcam connected to your computer,
it will throw an error with the message `"Requested device not found"`.

2. if `deviceId` is `null` and you have one or more webcam connected to your computer,
it will return a list of resolutions from the default device set up in your operating system.

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDeviceResolutions();
  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getDeviceResolutions().then((result) => {
  console.log(result);
});
```

If `deviceId` is **not** `null`

it will return a list of resolutions from the `deviceId` sent.

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDeviceResolutions(deviceId);
  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getDeviceResolutions(deviceId).then((result) => {
  console.log(result);
});
```

**`Deprecated`**

#### Inherited from

TelnyxRTCClient.getDeviceResolutions

___

### getDevices

▸ **getDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns a list of devices supported by the browser

#### Returns

`Promise`\<`MediaDeviceInfo`[]\>

**`Examples`**

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDevices();
  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getDevices().then((result) => {
  console.log(result);
});
```

#### Inherited from

TelnyxRTCClient.getDevices

___

### getVideoDevices

▸ **getVideoDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns a list of video devices supported by the browser (i.e. webcam).

#### Returns

`Promise`\<`MediaDeviceInfo`[]\>

Promise with an array of MediaDeviceInfo

**`Examples`**

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getVideoDevices();
  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getVideoDevices().then((result) => {
  console.log(result);
});
```

**`Deprecated`**

#### Inherited from

TelnyxRTCClient.getVideoDevices

___

### handleLoginError

▸ **handleLoginError**(`error`): `void`

Handle login error

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `any` |

#### Returns

`void`

void

#### Inherited from

TelnyxRTCClient.handleLoginError

___

### logout

▸ **logout**(): `void`

Alias for .disconnect()

#### Returns

`void`

**`Deprecated`**

#### Inherited from

TelnyxRTCClient.logout

___

### newCall

▸ **newCall**(`options`): [`Call`](/docs/voice/webrtc/js-sdk/classes/Call.md)

Makes a new outbound call.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | [`ICallOptions`](/docs/voice/webrtc/js-sdk/interfaces/ICallOptions.md) | Options object for a new call. |

#### Returns

[`Call`](/docs/voice/webrtc/js-sdk/classes/Call.md)

The new outbound `Call` object.

**`Examples`**

Making an outbound call to `+1 856-444-0362` using default values from the client:

```js
const call = client.newCall({
  destinationNumber: '+18564440362',
  callerNumber: '+15551231234'
});
```

You can omit `callerNumber` when dialing a SIP address:

```js
const call = client.newCall({
 destinationNumber: 'sip:example-sip-username@voip-provider.example.net'
});
```

If you are making calls from one Telnyx connection to another, you may specify just the SIP username:

```js
const call = client.newCall({
 destinationNumber: 'telnyx-sip-username' // This is equivalent to 'sip:telnyx-sip-username@sip.telnyx.com'
});
```

### Error handling

An error will be thrown if `destinationNumber` is not specified.

```js
const call = client.newCall().catch(console.error);
// => `destinationNumber is required`
```

### Setting Custom Headers

```js

client.newCall({
 destinationNumber: '18004377950',

 callerNumber: '155531234567',

 customHeaders: [ {name: "X-Header", value: "value" } ] 
});
```

### Setting Preferred Codec

You can pass `preferred_codecs` to the `newCall` method to set codec preference during the call.

`preferred_codecs` is a sub-array of the codecs returned by [RTCRtpReceiver.getCapabilities('audio')](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/getCapabilities_static#codecs)

```js
const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;

const PCMACodec = allCodecs.find((c) => c.mimeType.toLowerCase().includes('pcma'));

client.newCall({
 destinationNumber: 'xxx',
 preferred_codecs: [PCMACodec],
});
```

### ICE Candidate Prefetching

ICE candidate prefetching can be enabled by passing `prefetchIceCandidates` to the `newCall` method.
example:
```js
client.newCall({
 destinationNumber: 'xxx',
 prefetchIceCandidates: true,
});
```

### Trickle ICE

Trickle ICE can be enabled by passing `trickleIce` to the `newCall` method.
example:
```js
client.newCall({
 destinationNumber: 'xxx',
 trickleIce: true,
});
```

### Voice Isolation

Voice isolation options can be set by passing an `audio` object to the `newCall` method. This property controls the settings of a MediaStreamTrack object. For reference on available audio constraints, see [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
example:
```js
client.newCall({
 destinationNumber: 'xxx',
 audio: {
   echoCancellation: true,
   noiseSuppression: true,
   autoGainControl: true
 },
});
```

#### Overrides

TelnyxRTCClient.newCall

___

### off

▸ **off**(`eventName`, `callback?`): [`TelnyxRTC`](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md)

Removes an event handler that were attached with .on().
If no handler parameter is passed, all listeners for that event will be removed.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |
| `callback?` | `Function` | Function handler to be removed. |

#### Returns

[`TelnyxRTC`](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md)

The client object itself.

Note: a handler will be removed from the stack by reference
so make sure to use the same reference in both `.on()` and `.off()` methods.

**`Examples`**

Subscribe to the `telnyx.error` and then, remove the event handler.

```js
const errorHandler = (error) => {
 // Log the error..
}

const client = new TelnyxRTC(options);

client.on('telnyx.error', errorHandler)

 // .. later
client.off('telnyx.error', errorHandler)
```

#### Inherited from

TelnyxRTCClient.off

___

### on

▸ **on**(`eventName`, `callback`): [`TelnyxRTC`](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md)

Attaches an event handler for a specific type of event.

### Events
|   |   |
|---|---|
| `telnyx.ready` | The client is authenticated and available to use |
| `telnyx.error` | An error occurred at the session level |
| `telnyx.notification` | An update to the call or session |
| `telnyx.socket.open` | The WebSocket connection has been made |
| `telnyx.socket.close` | The WebSocket connection is set to close |
| `telnyx.socket.error` | An error occurred at the WebSocket level |
| `telnyx.socket.message` | The client has received a message through WebSockets |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |
| `callback` | `Function` | Function to call when the event comes. |

#### Returns

[`TelnyxRTC`](/docs/voice/webrtc/js-sdk/classes/TelnyxRTC.md)

The client object itself.

**`Examples`**

Subscribe to the `telnyx.ready` and `telnyx.error` events.

```js
const client = new TelnyxRTC(options);

client.on('telnyx.ready', (client) => {
  // Your client is ready!
}).on('telnyx.error', (error) => {
  // Got an error...
})
```

#### Inherited from

TelnyxRTCClient.on

___

### setAudioSettings

▸ **setAudioSettings**(`settings`): `Promise`\<`MediaTrackConstraints`\>

Sets the default `audio` constraints for your client. [See here](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_audio_tracks) for further details.

Note: It's a common behaviour, in WebRTC applications,
to persist devices user's selection to then reuse them across visits.
Due to a Webkit’s security protocols, Safari generates random `deviceId` on each page load.
To avoid this issue you can specify two additional properties
`micId` and `micLabel` in the constraints input parameter.
The client will use these values to assure the microphone you want to use is available
by matching both id and label with the device list retrieved from the browser.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `settings` | `IAudioSettings` | [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `micId` and `micLabel`. |

#### Returns

`Promise`\<`MediaTrackConstraints`\>

`Promise<MediaTrackConstraints>` Audio constraints applied to the client.

**`Examples`**

Set microphone by `id` and `label` with the `echoCancellation` flag turned off:

```js
// within an async function
const constraints = await client.setAudioSettings({
 micId: '772e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
 micLabel: 'Internal Microphone (Built-in)',
 echoCancellation: false
})
```

#### Inherited from

TelnyxRTCClient.setAudioSettings

___

### webRTCInfo

▸ `Static` **webRTCInfo**(): `string` \| `IWebRTCInfo`

Checks if the running browser has support for TelnyRTC

#### Returns

`string` \| `IWebRTCInfo`

An object with WebRTC browser support information or a string error message.

**`Examples`**

Check if your browser supports TelnyxRTC

```js
const info = TelnyxRTC.webRTCInfo();
const isWebRTCSupported = info.supportWebRTC;
console.log(isWebRTCSupported); // => true
```

#### Error handling

An error message will be returned if your browser doesn't support TelnyxRTC

```js
const info = TelnyxRTC.webRTCInfo();
if (!info.supportWebRTC) {
  console.error(info) // => 'This browser does not support @telnyx/webrtc. To see browser support list: `TelnyxRTC.webRTCSupportedBrowserList()'
}
```

___

### webRTCSupportedBrowserList

▸ `Static` **webRTCSupportedBrowserList**(): `IWebRTCSupportedBrowser`[]

Returns the WebRTC supported browser list.

The following table indicates the browsers supported by TelnyxRTC.
We support the most recent (N) versions of these browsers unless otherwise indicated.

|         | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Android |  [-]   |   [-]   |  [ ]   | [ ]  |
| iOS     |  [ ]   |   [ ]   |  [x]   | [ ]  |
| Linux   |  [x]   |   [-]   |  [ ]   | [ ]  |
| MacOS   |  [x]   |   [-]   |  [x]   | [-]  |
| Windows |  [x]   |   [-]   |  [ ]   | [-]  |

#### Legend
[x] supports audio and video
[-] supports only audio
[ ] not supported

#### Returns

`IWebRTCSupportedBrowser`[]

An array with supported operational systems and browsers.

**`Examples`**

```js
const browserList = TelnyxRTC.webRTCSupportedBrowserList();
console.log(browserList) // => [{"operationSystem": "Android", "supported": [{"browserName": "Chrome", "features": ["video", "audio"], "supported": "full"},{...}]
```
