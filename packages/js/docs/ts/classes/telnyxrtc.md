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

// You can disconnect when you're done
//  client.disconnect();
```

## Hierarchy

* Verto

  ↳ **TelnyxRTC**

## Index

### Constructors

* [constructor](telnyxrtc.md#constructor)

### Accessors

* [connected](telnyxrtc.md#connected)
* [localElement](telnyxrtc.md#localelement)
* [mediaConstraints](telnyxrtc.md#mediaconstraints)
* [remoteElement](telnyxrtc.md#remoteelement)
* [speaker](telnyxrtc.md#speaker)

### Methods

* [checkPermissions](telnyxrtc.md#checkpermissions)
* [connect](telnyxrtc.md#connect)
* [disableMicrophone](telnyxrtc.md#disablemicrophone)
* [disableWebcam](telnyxrtc.md#disablewebcam)
* [disconnect](telnyxrtc.md#disconnect)
* [enableMicrophone](telnyxrtc.md#enablemicrophone)
* [enableWebcam](telnyxrtc.md#enablewebcam)
* [getAudioInDevices](telnyxrtc.md#getaudioindevices)
* [getAudioOutDevices](telnyxrtc.md#getaudiooutdevices)
* [getDeviceResolutions](telnyxrtc.md#getdeviceresolutions)
* [getDevices](telnyxrtc.md#getdevices)
* [getVideoDevices](telnyxrtc.md#getvideodevices)
* [logout](telnyxrtc.md#logout)
* [newCall](telnyxrtc.md#newcall)
* [off](telnyxrtc.md#off)
* [on](telnyxrtc.md#on)
* [setAudioSettings](telnyxrtc.md#setaudiosettings)
* [setVideoSettings](telnyxrtc.md#setvideosettings)

## Constructors

### constructor

\+ **new TelnyxRTC**(`options`: ITelnyxRTCOptions): [TelnyxRTC](telnyxrtc.md)

Creates a new `TelnyxRTC` instance with the provided options.

|   |   |   |   |
|---|---|---|---|
| `login_token` | string | **required** | The JSON Web Token (JWT) to authenticate with your SIP Connection. This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart). |
| `login` | string | optional | The `username` to authenticate with your SIP Connection. `login` and `password` will take precedence over `login_token` for authentication. |
| `password` | string | optional | The `password` to authenticate with your SIP Connection. |
| `ringtoneFile` | string | optional | A URL to a wav/mp3 ringtone file. |
| `ringbackFile` | string | optional | A URL to a wav/mp3 ringback file that will be used when you disable "Generate Ringback Tone" in you SIP Connection. |

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

### Custom ringtone and ringback

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`options` | ITelnyxRTCOptions | Options for initializing a client  |

**Returns:** [TelnyxRTC](telnyxrtc.md)

## Accessors

### connected

• get **connected**(): boolean

*Inherited from [TelnyxRTC](telnyxrtc.md).[connected](telnyxrtc.md#connected)*

`true` if the client is connected to the Telnyx RTC server

**`example`** 

```js
const client = new TelnyxRTC(options);
console.log(client.connected); // => false
```

**Returns:** boolean

___

### localElement

• get **localElement**(): string \| Function \| HTMLMediaElement

*Inherited from [TelnyxRTC](telnyxrtc.md).[localElement](telnyxrtc.md#localelement)*

Gets the local html element.

**`example`** 

```js
const client = new TelnyxRTC(options);

console.log(client.localElement);
// => HTMLMediaElement
```

**Returns:** string \| Function \| HTMLMediaElement

• set **localElement**(`tag`: HTMLMediaElement \| string \| Function): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[localElement](telnyxrtc.md#localelement)*

Sets the local html element that will receive the local stream.

**`example`** 

```js
const client = new TelnyxRTC(options);
client.localElement = '#localElementMediaId';
```

#### Parameters:

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement \| string \| Function |

**Returns:** void

___

### mediaConstraints

• get **mediaConstraints**(): object

*Inherited from [TelnyxRTC](telnyxrtc.md).[mediaConstraints](telnyxrtc.md#mediaconstraints)*

Audio and video constraints currently used by the client.

**`examples`** 

```js
const client = new TelnyxRTC(options);

console.log(client.mediaConstraints);
// => { audio: true, video: false }
```

**`readonly`** 

**Returns:** object

Name | Type |
------ | ------ |
`audio` | boolean \| MediaTrackConstraints |
`video` | boolean \| MediaTrackConstraints |

___

### remoteElement

• get **remoteElement**(): string \| Function \| HTMLMediaElement

*Inherited from [TelnyxRTC](telnyxrtc.md).[remoteElement](telnyxrtc.md#remoteelement)*

Gets the remote html element.

**`example`** 

```js
const client = new TelnyxRTC(options);

console.log(client.remoteElement);
// => HTMLMediaElement
```

**Returns:** string \| Function \| HTMLMediaElement

• set **remoteElement**(`tag`: HTMLMediaElement \| string \| Function): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[remoteElement](telnyxrtc.md#remoteelement)*

Sets the remote html element that will receive the remote stream.

**`example`** 

```js
const client = new TelnyxRTC(options);
client.remoteElement = '#remoteElementMediaId';
```

#### Parameters:

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement \| string \| Function |

**Returns:** void

___

### speaker

• get **speaker**(): string \| null

*Inherited from [TelnyxRTC](telnyxrtc.md).[speaker](telnyxrtc.md#speaker)*

Default audio output device, if set by client.

**`example`** 

```js
const client = new TelnyxRTC(options);

console.log(client.speaker);
// => "abc123xyz"
```

**Returns:** string \| null

• set **speaker**(`deviceId`: string): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[speaker](telnyxrtc.md#speaker)*

Sets the default audio output device for subsequent calls.

**`example`** 

```js
let result = await client.getAudioOutDevices();

if (result.length) {
  client.speaker = result[1].deviceId;
}
```

#### Parameters:

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** void

## Methods

### checkPermissions

▸ **checkPermissions**(`audio?`: boolean, `video?`: boolean): Promise<boolean\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[checkPermissions](telnyxrtc.md#checkpermissions)*

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

#### Parameters:

Name | Type | Default value | Description |
------ | ------ | ------ | ------ |
`audio` | boolean | true | Whether to check for microphone permissions. |
`video` | boolean | true | Whether to check for webcam permissions.  |

**Returns:** Promise<boolean\>

___

### connect

▸ **connect**(): Promise<void\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[connect](telnyxrtc.md#connect)*

*Overrides void*

Creates a new connection for exchanging data with the WebRTC server

**`examples`** 

```js
const client = new TelnyxRTC(options);

client.connect();
```

**Returns:** Promise<void\>

___

### disableMicrophone

▸ **disableMicrophone**(): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[disableMicrophone](telnyxrtc.md#disablemicrophone)*

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

**Returns:** void

___

### disableWebcam

▸ **disableWebcam**(): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[disableWebcam](telnyxrtc.md#disablewebcam)*

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

**Returns:** void

___

### disconnect

▸ **disconnect**(): Promise<void\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[disconnect](telnyxrtc.md#disconnect)*

*Overrides void*

Disconnect all active calls

**`examples`** 

```js
const client = new TelnyxRTC(options);

client.disconnect();
```

**Returns:** Promise<void\>

___

### enableMicrophone

▸ **enableMicrophone**(): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[enableMicrophone](telnyxrtc.md#enablemicrophone)*

Enables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: false` is
specified when creating a new call.

**`examples`** 

```js
const client = new TelnyxRTC(options);

client.enableMicrophone();
```

**Returns:** void

___

### enableWebcam

▸ **enableWebcam**(): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[enableWebcam](telnyxrtc.md#enablewebcam)*

Enables use of the webcam in subsequent calls.

Note: This setting will be ignored if `video: false` is
specified when creating a new call.

**`examples`** 

```js
const client = new TelnyxRTC(options);

client.enableWebcam();
```

**Returns:** void

___

### getAudioInDevices

▸ **getAudioInDevices**(): Promise<MediaDeviceInfo[]\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[getAudioInDevices](telnyxrtc.md#getaudioindevices)*

Return the audio output devices supported by the browser.

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

**Returns:** Promise<MediaDeviceInfo[]\>

Promise with an array of MediaDeviceInfo

___

### getAudioOutDevices

▸ **getAudioOutDevices**(): Promise<MediaDeviceInfo[]\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[getAudioOutDevices](telnyxrtc.md#getaudiooutdevices)*

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

**Returns:** Promise<MediaDeviceInfo[]\>

Promise with an array of MediaDeviceInfo

___

### getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`: string): Promise<any[]\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[getDeviceResolutions](telnyxrtc.md#getdeviceresolutions)*

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`deviceId` | string | the `deviceId` from your webcam.  |

**Returns:** Promise<any[]\>

___

### getDevices

▸ **getDevices**(): Promise<MediaDeviceInfo[]\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[getDevices](telnyxrtc.md#getdevices)*

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

**Returns:** Promise<MediaDeviceInfo[]\>

___

### getVideoDevices

▸ **getVideoDevices**(): Promise<MediaDeviceInfo[]\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[getVideoDevices](telnyxrtc.md#getvideodevices)*

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

**Returns:** Promise<MediaDeviceInfo[]\>

Promise with an array of MediaDeviceInfo

___

### logout

▸ **logout**(): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[logout](telnyxrtc.md#logout)*

Alias for .disconnect()

**`deprecated`** 

**Returns:** void

___

### newCall

▸ **newCall**(`options`: CallOptions): [Call](call.md)

*Inherited from [TelnyxRTC](telnyxrtc.md).[newCall](telnyxrtc.md#newcall)*

Makes a new outbound call.

This method receives an object `options` with the following properties:
|   |   |   |   |
|---|---|---|---|
| `destinationNumber` | string | **required** | Phone number or SIP URI to dial. |
| `callerNumber` | string | optional | Number to use as the caller ID when dialing out to a destination. A valid phone number is required for dials out to PSTN numbers. |
| `callerName` | string | optional | Name to use as the caller ID name when dialing out to a destination. |
| `id` | string | optional | Custom ID to identify the call. This will be used as the `callID` in place of the UUID generated by the client. |
| `telnyxCallControlId` | string | optional | Telnyx Call Control ID, if using Call Control services |
| `telnyxSessionId` | string | optional | Telnyx call session ID, if using Call Control services |
| `telnyxLegId` | string | optional | Telnyx call leg ID, if using Call Control services |
| `localStream` | MediaStream | optional | If set, the call will use this stream instead of retrieving a new one. |
| `remoteStream` | MediaStream | optional | If set, the call will use this stream instead of retrieving a new one. |
| `localElement` | HTMLMediaElement | optional | Overrides client's default `localElement`. |
| `remoteElement` | HTMLMediaElement | optional | Overrides client's default `remoteElement`. |
| `iceServers` | RTCIceServer[] | optional | Overrides client's default `iceServers`. |
| `audio` | boolean | optional | Overrides client's default audio constraints. Defaults to `true` |
| `video` | boolean | optional | Overrides client's default video constraints. Defaults to `false` |
| `useStereo` | boolean | optional | Uses stereo audio instead of mono. |
| `micId` | string | optional | `deviceId` to use as microphone. Overrides the client's default one. |
| `camId` | string | optional | `deviceId` to use as webcam. Overrides the client's default one. |
| `speakerId` | string | optional | `deviceId` to use as speaker. Overrides the client's default one. |
| `onNotification` | Function | optional | Overrides client's default `telnyx.notification` handler for this call. |

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`options` | CallOptions | Options object for a new call.  |

**Returns:** [Call](call.md)

The new outbound `Call` object.

___

### off

▸ **off**(`eventName`: string, `callback?`: Function): this

*Inherited from [TelnyxRTC](telnyxrtc.md).[off](telnyxrtc.md#off)*

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback?` | Function | Function handler to be removed.  |

**Returns:** this

The client object itself.

Note: a handler will be removed from the stack by reference
so make sure to use the same reference in both `.on()` and `.off()` methods.

___

### on

▸ **on**(`eventName`: string, `callback`: Function): this

*Inherited from [TelnyxRTC](telnyxrtc.md).[on](telnyxrtc.md#on)*

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback` | Function | Function to call when the event comes. |

**Returns:** this

The client object itself.

___

### setAudioSettings

▸ **setAudioSettings**(`settings`: IAudioSettings): Promise<MediaTrackConstraints\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[setAudioSettings](telnyxrtc.md#setaudiosettings)*

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`settings` | IAudioSettings | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `micId` and `micLabel`.  |

**Returns:** Promise<MediaTrackConstraints\>

`Promise<MediaTrackConstraints>` Audio constraints applied to the client.

___

### setVideoSettings

▸ **setVideoSettings**(`settings`: IVideoSettings): Promise<MediaTrackConstraints\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[setVideoSettings](telnyxrtc.md#setvideosettings)*

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`settings` | IVideoSettings | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `camId` and `camLabel`.  |

**Returns:** Promise<MediaTrackConstraints\>

`Promise<MediaTrackConstraints>` Video constraints applied to the client.
