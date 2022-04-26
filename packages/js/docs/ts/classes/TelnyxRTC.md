# Class: TelnyxRTC

The `TelnyxRTC` client connects your application to the Telnyx backend,
enabling you to make outgoing calls and handle incoming calls.

**`examples`**

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

- [constructor](TelnyxRTC.md#constructor)

### Accessors

- [connected](TelnyxRTC.md#connected)
- [localElement](TelnyxRTC.md#localelement)
- [mediaConstraints](TelnyxRTC.md#mediaconstraints)
- [remoteElement](TelnyxRTC.md#remoteelement)
- [speaker](TelnyxRTC.md#speaker)

### Methods

- [checkPermissions](TelnyxRTC.md#checkpermissions)
- [connect](TelnyxRTC.md#connect)
- [disableMicrophone](TelnyxRTC.md#disablemicrophone)
- [disableWebcam](TelnyxRTC.md#disablewebcam)
- [disconnect](TelnyxRTC.md#disconnect)
- [enableMicrophone](TelnyxRTC.md#enablemicrophone)
- [enableWebcam](TelnyxRTC.md#enablewebcam)
- [getAudioInDevices](TelnyxRTC.md#getaudioindevices)
- [getAudioOutDevices](TelnyxRTC.md#getaudiooutdevices)
- [getDeviceResolutions](TelnyxRTC.md#getdeviceresolutions)
- [getDevices](TelnyxRTC.md#getdevices)
- [getVideoDevices](TelnyxRTC.md#getvideodevices)
- [logout](TelnyxRTC.md#logout)
- [newCall](TelnyxRTC.md#newcall)
- [off](TelnyxRTC.md#off)
- [on](TelnyxRTC.md#on)
- [setAudioSettings](TelnyxRTC.md#setaudiosettings)
- [setVideoSettings](TelnyxRTC.md#setvideosettings)
- [webRTCInfo](TelnyxRTC.md#webrtcinfo)
- [webRTCSupportedBrowserList](TelnyxRTC.md#webrtcsupportedbrowserlist)

## Constructors

### <a id="constructor" name="constructor"></a> constructor

• **new TelnyxRTC**(`options`)

Creates a new `TelnyxRTC` instance with the provided options.

**`examples`**

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

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | [`IClientOptions`](../interfaces/IClientOptions.md) | Options for initializing a client |

#### Overrides

TelnyxRTCClient.constructor

## Accessors

### <a id="connected" name="connected"></a> connected

• `get` **connected**(): `boolean`

`true` if the client is connected to the Telnyx RTC server

**`example`**

```js
const client = new TelnyxRTC(options);
console.log(client.connected); // => false
```

#### Returns

`boolean`

#### Inherited from

TelnyxRTCClient.connected

___

### <a id="localelement" name="localelement"></a> localElement

• `get` **localElement**(): `string` \| `Function` \| `HTMLMediaElement`

Gets the local html element.

**`example`**

```js
const client = new TelnyxRTC(options);

console.log(client.localElement);
// => HTMLMediaElement
```

#### Returns

`string` \| `Function` \| `HTMLMediaElement`

#### Inherited from

TelnyxRTCClient.localElement

• `set` **localElement**(`tag`): `void`

Sets the local html element that will receive the local stream.

**`example`**

```js
const client = new TelnyxRTC(options);
client.localElement = 'localElementMediaId';
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `tag` | `string` \| `Function` \| `HTMLMediaElement` |

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.localElement

___

### <a id="mediaconstraints" name="mediaconstraints"></a> mediaConstraints

• `get` **mediaConstraints**(): `Object`

Audio and video constraints currently used by the client.

**`examples`**

```js
const client = new TelnyxRTC(options);

console.log(client.mediaConstraints);
// => { audio: true, video: false }
```

**`readonly`**

#### Returns

`Object`

#### Inherited from

TelnyxRTCClient.mediaConstraints

___

### <a id="remoteelement" name="remoteelement"></a> remoteElement

• `get` **remoteElement**(): `string` \| `Function` \| `HTMLMediaElement`

Gets the remote html element.

**`example`**

```js
const client = new TelnyxRTC(options);

console.log(client.remoteElement);
// => HTMLMediaElement
```

#### Returns

`string` \| `Function` \| `HTMLMediaElement`

#### Inherited from

TelnyxRTCClient.remoteElement

• `set` **remoteElement**(`tag`): `void`

Sets the remote html element that will receive the remote stream.

**`example`**

```js
const client = new TelnyxRTC(options);
client.remoteElement = 'remoteElementMediaId';
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `tag` | `string` \| `Function` \| `HTMLMediaElement` |

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.remoteElement

___

### <a id="speaker" name="speaker"></a> speaker

• `get` **speaker**(): `string`

Default audio output device, if set by client.

**`example`**

```js
const client = new TelnyxRTC(options);

console.log(client.speaker);
// => "abc123xyz"
```

#### Returns

`string`

#### Inherited from

TelnyxRTCClient.speaker

• `set` **speaker**(`deviceId`): `void`

Sets the default audio output device for subsequent calls.

**`example`**

```js
let result = await client.getAudioOutDevices();

if (result.length) {
  client.speaker = result[1].deviceId;
}
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.speaker

## Methods

### <a id="checkpermissions" name="checkpermissions"></a> checkPermissions

▸ **checkPermissions**(`audio?`, `video?`): `Promise`<`boolean`\>

Checks if the browser has the permission to access mic and/or webcam

**`examples`**

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

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `audio` | `boolean` | `true` | Whether to check for microphone permissions. |
| `video` | `boolean` | `true` | Whether to check for webcam permissions. |

#### Returns

`Promise`<`boolean`\>

#### Inherited from

TelnyxRTCClient.checkPermissions

___

### <a id="connect" name="connect"></a> connect

▸ **connect**(): `Promise`<`void`\>

Creates a new connection for exchanging data with the WebRTC server

**`examples`**

```js
const client = new TelnyxRTC(options);

client.connect();
```

#### Returns

`Promise`<`void`\>

#### Inherited from

TelnyxRTCClient.connect

___

### <a id="disablemicrophone" name="disablemicrophone"></a> disableMicrophone

▸ **disableMicrophone**(): `void`

Disables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: true` is
specified when creating a new call.

**`examples`**

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

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.disableMicrophone

___

### <a id="disablewebcam" name="disablewebcam"></a> disableWebcam

▸ **disableWebcam**(): `void`

Disables use of the webcam in subsequent calls.

Note: This method will disable the video even if `video: true` is specified.

**`examples`**

```js
const client = new TelnyxRTC(options);

client.disableWebcam();
```

```js
const client = new TelnyxRTC({
  ...options,
  video: true
});

client.disableWebcam();
```

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.disableWebcam

___

### <a id="disconnect" name="disconnect"></a> disconnect

▸ **disconnect**(): `Promise`<`void`\>

Disconnect all active calls

**`examples`**

```js
const client = new TelnyxRTC(options);

client.disconnect();
```

#### Returns

`Promise`<`void`\>

#### Inherited from

TelnyxRTCClient.disconnect

___

### <a id="enablemicrophone" name="enablemicrophone"></a> enableMicrophone

▸ **enableMicrophone**(): `void`

Enables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: false` is
specified when creating a new call.

**`examples`**

```js
const client = new TelnyxRTC(options);

client.enableMicrophone();
```

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.enableMicrophone

___

### <a id="enablewebcam" name="enablewebcam"></a> enableWebcam

▸ **enableWebcam**(): `void`

Enables use of the webcam in subsequent calls.

Note: This setting will be ignored if `video: false` is
specified when creating a new call.

**`examples`**

```js
const client = new TelnyxRTC(options);

client.enableWebcam();
```

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.enableWebcam

___

### <a id="getaudioindevices" name="getaudioindevices"></a> getAudioInDevices

▸ **getAudioInDevices**(): `Promise`<`MediaDeviceInfo`[]\>

Returns the audio input devices supported by the browser.

**`examples`**

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

#### Returns

`Promise`<`MediaDeviceInfo`[]\>

Promise with an array of MediaDeviceInfo

#### Inherited from

TelnyxRTCClient.getAudioInDevices

___

### <a id="getaudiooutdevices" name="getaudiooutdevices"></a> getAudioOutDevices

▸ **getAudioOutDevices**(): `Promise`<`MediaDeviceInfo`[]\>

Returns the audio output devices supported by the browser.

Browser Compatibility Note: Firefox has yet to fully implement
audio output devices. As of v63, this feature is behind the
user preference `media.setsinkid.enabled`.
See: https://bugzilla.mozilla.org/show_bug.cgi?id=1152401#c98

**`examples`**

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

#### Returns

`Promise`<`MediaDeviceInfo`[]\>

Promise with an array of MediaDeviceInfo

#### Inherited from

TelnyxRTCClient.getAudioOutDevices

___

### <a id="getdeviceresolutions" name="getdeviceresolutions"></a> getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`): `Promise`<`any`[]\>

Returns supported resolution for the given webcam.

**`examples`**

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

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | the `deviceId` from your webcam. |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

TelnyxRTCClient.getDeviceResolutions

___

### <a id="getdevices" name="getdevices"></a> getDevices

▸ **getDevices**(): `Promise`<`MediaDeviceInfo`[]\>

Returns a list of devices supported by the browser

**`examples`**

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

#### Returns

`Promise`<`MediaDeviceInfo`[]\>

#### Inherited from

TelnyxRTCClient.getDevices

___

### <a id="getvideodevices" name="getvideodevices"></a> getVideoDevices

▸ **getVideoDevices**(): `Promise`<`MediaDeviceInfo`[]\>

Returns a list of video devices supported by the browser (i.e. webcam).

**`examples`**

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

#### Returns

`Promise`<`MediaDeviceInfo`[]\>

Promise with an array of MediaDeviceInfo

#### Inherited from

TelnyxRTCClient.getVideoDevices

___

### <a id="logout" name="logout"></a> logout

▸ **logout**(): `void`

Alias for .disconnect()

**`deprecated`**

#### Returns

`void`

#### Inherited from

TelnyxRTCClient.logout

___

### <a id="newcall" name="newcall"></a> newCall

▸ **newCall**(`options`): [`Call`](Call.md)

Makes a new outbound call.

**`examples`**

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

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | [`ICallOptions`](../interfaces/ICallOptions.md) | Options object for a new call. |

#### Returns

[`Call`](Call.md)

The new outbound `Call` object.

#### Overrides

TelnyxRTCClient.newCall

___

### <a id="off" name="off"></a> off

▸ **off**(`eventName`, `callback?`): [`TelnyxRTC`](TelnyxRTC.md)

Removes an event handler that were attached with .on().
If no handler parameter is passed, all listeners for that event will be removed.

**`examples`**

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

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |
| `callback?` | `Function` | Function handler to be removed. |

#### Returns

[`TelnyxRTC`](TelnyxRTC.md)

The client object itself.

Note: a handler will be removed from the stack by reference
so make sure to use the same reference in both `.on()` and `.off()` methods.

#### Inherited from

TelnyxRTCClient.off

___

### <a id="on" name="on"></a> on

▸ **on**(`eventName`, `callback`): [`TelnyxRTC`](TelnyxRTC.md)

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

**`examples`**

Subscribe to the `telnyx.ready` and `telnyx.error` events.

```js
const client = new TelnyxRTC(options);

client.on('telnyx.ready', (client) => {
  // Your client is ready!
}).on('telnyx.error', (error) => {
  // Got an error...
})
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |
| `callback` | `Function` | Function to call when the event comes. |

#### Returns

[`TelnyxRTC`](TelnyxRTC.md)

The client object itself.

#### Inherited from

TelnyxRTCClient.on

___

### <a id="setaudiosettings" name="setaudiosettings"></a> setAudioSettings

▸ **setAudioSettings**(`settings`): `Promise`<`MediaTrackConstraints`\>

Sets the default `audio` constraints for your client. [See here](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_audio_tracks) for further details.

Note: It's a common behaviour, in WebRTC applications,
to persist devices user's selection to then reuse them across visits.
Due to a Webkit’s security protocols, Safari generates random `deviceId` on each page load.
To avoid this issue you can specify two additional properties
`micId` and `micLabel` in the constraints input parameter.
The client will use these values to assure the microphone you want to use is available
by matching both id and label with the device list retrieved from the browser.

**`examples`**

Set microphone by `id` and `label` with the `echoCancellation` flag turned off:

```js
// within an async function
const constraints = await client.setAudioSettings({
 micId: '772e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
 micLabel: 'Internal Microphone (Built-in)',
 echoCancellation: false
})
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `settings` | `IAudioSettings` | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `micId` and `micLabel`. |

#### Returns

`Promise`<`MediaTrackConstraints`\>

`Promise<MediaTrackConstraints>` Audio constraints applied to the client.

#### Inherited from

TelnyxRTCClient.setAudioSettings

___

### <a id="setvideosettings" name="setvideosettings"></a> setVideoSettings

▸ **setVideoSettings**(`settings`): `Promise`<`MediaTrackConstraints`\>

Sets the default `video` constraints for your client. [See here](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_video_tracks) for further details.

Note: It's a common behaviour, in WebRTC applications,
to persist devices user's selection to then reuse them across visits.
Due to a Webkit’s security protocols, Safari generates random `deviceId` on each page load.
To avoid this issue you can specify two additional properties
`camId` and `camLabel` in the constraints input parameter.
The client will use these values to assure the webcam you want to use is available
by matching both `id` and `label` with the device list retrieved from the browser.

**`examples`**

Set webcam by `id` and `label` with 720p resolution.

```js
// within an async function
const constraints = await client.setVideoSettings({
 camId: '882e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
 camLabel: 'Default WebCam (Built-in)',
 width: 1080,
 height: 720
})
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `settings` | `IVideoSettings` | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `camId` and `camLabel`. |

#### Returns

`Promise`<`MediaTrackConstraints`\>

`Promise<MediaTrackConstraints>` Video constraints applied to the client.

#### Inherited from

TelnyxRTCClient.setVideoSettings

___

### <a id="webrtcinfo" name="webrtcinfo"></a> webRTCInfo

▸ `Static` **webRTCInfo**(): `string` \| `IWebRTCInfo`

Checks if the running browser has support for TelnyRTC

**`examples`**

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

#### Returns

`string` \| `IWebRTCInfo`

An object with WebRTC browser support information or a string error message.

___

### <a id="webrtcsupportedbrowserlist" name="webrtcsupportedbrowserlist"></a> webRTCSupportedBrowserList

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

**`examples`**

```js
const browserList = TelnyxRTC.webRTCSupportedBrowserList();
console.log(browserList) // => [{"operationSystem": "Android", "supported": [{"browserName": "Chrome", "features": ["video", "audio"], "supported": "full"},{...}]
```

#### Returns

`IWebRTCSupportedBrowser`[]

An array with supported operational systems and browsers.
