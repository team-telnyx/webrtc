# Class: Call

A `Call` is the representation of an audio or video call between
two browsers, SIP clients or phone numbers. The `call` object is
created whenever a new call is initiated, either by you or the
remote caller. You can access and act upon calls initiated by
a remote caller in a `telnyx.notification` event handler.

**`Examples`**

To create a new call, i.e. dial:

```js
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destinationNumber: '18004377950',
  callerNumber: '‬155531234567',
});
```

To answer an incoming call:

```js
client.on('telnyx.notification', (notification) => {
  const call = notification.call;

  if (notification.type === 'callUpdate' && call.state === 'ringing') {
    call.answer();
  }
});
```

Both the outgoing and incoming call has methods that can be hooked up to your UI.

```js
// Hangup or reject an incoming call
call.hangup();

// Send digits and keypresses
call.dtmf('1234');

// Call states that can be toggled
call.hold();
call.muteAudio();
```

## Hierarchy

- `default`

  ↳ **`Call`**

## Table of contents

### Properties

- [direction](Call.md#direction)
- [id](Call.md#id)
- [prevState](Call.md#prevstate)
- [state](Call.md#state)

### Accessors

- [localStream](Call.md#localstream)
- [remoteStream](Call.md#remotestream)
- [telnyxIDs](Call.md#telnyxids)

### Methods

- [answer](Call.md#answer)
- [deaf](Call.md#deaf)
- [dtmf](Call.md#dtmf)
- [getStats](Call.md#getstats)
- [hold](Call.md#hold)
- [muteAudio](Call.md#muteaudio)
- [muteVideo](Call.md#mutevideo)
- [setAudioInDevice](Call.md#setaudioindevice)
- [setAudioOutDevice](Call.md#setaudiooutdevice)
- [setVideoDevice](Call.md#setvideodevice)
- [toggleAudioMute](Call.md#toggleaudiomute)
- [toggleDeaf](Call.md#toggledeaf)
- [toggleHold](Call.md#togglehold)
- [toggleVideoMute](Call.md#togglevideomute)
- [undeaf](Call.md#undeaf)
- [unhold](Call.md#unhold)
- [unmuteAudio](Call.md#unmuteaudio)
- [unmuteVideo](Call.md#unmutevideo)

## Properties

### <a id="direction" name="direction"></a> direction

• **direction**: `Direction`

The direction of the call.
Can be either `inbound` or `outbound`.

#### Inherited from

BaseCall.direction

___

### <a id="id" name="id"></a> id

• **id**: `string` = `''`

The call identifier.

#### Inherited from

BaseCall.id

___

### <a id="prevstate" name="prevstate"></a> prevState

• **prevState**: `string` = `''`

The previous state of the call.
See `Call.state` for all possible values.

#### Inherited from

BaseCall.prevState

___

### <a id="state" name="state"></a> state

• **state**: `string`

The `state` of the call.

| Value | Description |
|---|---|
| `new` | New call has been created in the client. |
| `trying` | It's attempting to call someone. |
| `requesting` | The outbound call is being sent to the server. |
| `recovering` | The previous call is recovering after the page refreshes. If the user refreshes the page during a call, it will automatically join the latest call. |
| `ringing` | Someone is attempting to call you. |
| `answering` | You are attempting to answer this inbound call. |
| `early` | It receives the media before the call has been answered. |
| `active` | Call has become active. |
| `held` | Call has been held. |
| `hangup` | Call has ended. |
| `destroy` | Call has been destroyed. |
| `purge` | Call has been purged. |

#### Inherited from

BaseCall.state

## Accessors

### <a id="localstream" name="localstream"></a> localStream

• `get` **localStream**(): `MediaStream`

Gets the local stream of the call.
This can be used in a video/audio element to play the local media.
See [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).

#### Returns

`MediaStream`

**`Examples`**

```js
const stream = call.localStream;
document.querySelector('audio').srcObject = stream;
```

#### Inherited from

BaseCall.localStream

___

### <a id="remotestream" name="remotestream"></a> remoteStream

• `get` **remoteStream**(): `MediaStream`

Gets the remote stream of the call.
This can be used in a video/audio element to play the remote media.
See [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).

#### Returns

`MediaStream`

**`Examples`**

```js
const stream = call.remoteStream;
document.querySelector('audio').srcObject = stream;
```

#### Inherited from

BaseCall.remoteStream

___

### <a id="telnyxids" name="telnyxids"></a> telnyxIDs

• `get` **telnyxIDs**(): `Object`

Gets Telnyx call IDs, if using Telnyx Call Control services.
You can use these IDs to identify specific calls in your application code.

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `telnyxCallControlId` | `string` |
| `telnyxLegId` | `string` |
| `telnyxSessionId` | `string` |

**`Examples`**

```js
const { telnyxCallControlId, telnyxSessionId, telnyxLegId } = call.telnyxIDs;
```

#### Inherited from

BaseCall.telnyxIDs

## Methods

### <a id="answer" name="answer"></a> answer

▸ **answer**(`params?`): `void`

Starts the process to answer the incoming call.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `AnswerParams` |

#### Returns

`void`

**`Examples`**

```js
call.answer()
```

#### Inherited from

BaseCall.answer

___

### <a id="deaf" name="deaf"></a> deaf

▸ **deaf**(): `void`

Turns off the remote stream audio.

#### Returns

`void`

**`Examples`**

```js
call.deaf()
```

#### Inherited from

BaseCall.deaf

___

### <a id="dtmf" name="dtmf"></a> dtmf

▸ **dtmf**(`dtmf`): `void`

Sends dual-tone multi-frequency (DTMF) signal

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dtmf` | `string` | Single DTMF key |

#### Returns

`void`

**`Examples`**

```js
call.dtmf('0');
call.dtmf('1');
call.dtmf('*');
call.dtmf('#');
```

#### Inherited from

BaseCall.dtmf

___

### <a id="getstats" name="getstats"></a> getStats

▸ **getStats**(`callback`, `constraints`): `void`

Registers callback for stats.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | `Function` |
| `constraints` | `any` |

#### Returns

`void`

#### Inherited from

BaseCall.getStats

___

### <a id="hold" name="hold"></a> hold

▸ **hold**(): `Promise`\<`any`\>

Holds the call.

#### Returns

`Promise`\<`any`\>

Promise that resolves or rejects based on server response

**`Examples`**

Using async/await:

```js
await call.hold()
console.log(call.state) // => 'held'
```

Using ES6 `Promises`:

```js
call.hold().then(() => {
  console.log(call.state) // => 'held'
});
```

#### Inherited from

BaseCall.hold

___

### <a id="muteaudio" name="muteaudio"></a> muteAudio

▸ **muteAudio**(): `void`

Turns off audio output, i.e. makes it so other
call participants cannot hear your audio.

#### Returns

`void`

**`Examples`**

```js
call.muteAudio();
```

#### Inherited from

BaseCall.muteAudio

___

### <a id="mutevideo" name="mutevideo"></a> muteVideo

▸ **muteVideo**(): `void`

Turns off the video output, i.e. hides
video from other call participants.

#### Returns

`void`

**`Examples`**

```js
call.muteVideo();
```

#### Inherited from

BaseCall.muteVideo

___

### <a id="setaudioindevice" name="setaudioindevice"></a> setAudioInDevice

▸ **setAudioInDevice**(`deviceId`): `Promise`\<`void`\>

Changes the audio input device (i.e. microphone) used for the call.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | The target audio input device ID |

#### Returns

`Promise`\<`void`\>

Promise that resolves if the audio input device has been updated

**`Examples`**

Using async/await:

```js
await call.setAudioInDevice('abc123')
```

Using ES6 `Promises`:

```js
call.setAudioInDevice('abc123').then(() => {
  // Do something using new audio input device
});
```

Usage with `.getAudioInDevices`:

```js
let result = await client.getAudioInDevices();

if (result.length) {
  call.setAudioInDevice(result[1].deviceId);
}
```

#### Inherited from

BaseCall.setAudioInDevice

___

### <a id="setaudiooutdevice" name="setaudiooutdevice"></a> setAudioOutDevice

▸ **setAudioOutDevice**(`deviceId`): `Promise`\<`boolean`\>

Changes the audio output device (i.e. speaker) used for the call.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | The target audio output device ID |

#### Returns

`Promise`\<`boolean`\>

Promise that returns a boolean

**`Examples`**

Using async/await:

```js
await call.setAudioOutDevice('abc123')
```

Using ES6 `Promises`:

```js
call.setAudioOutDevice('abc123').then(() => {
  // Do something using new audio output device
});
```

Usage with `.getAudioOutDevices`:

```js
let result = await client.getAudioOutDevices();

if (result.length) {
  await call.setAudioOutDevice(result[1].deviceId);
}
```

___

### <a id="setvideodevice" name="setvideodevice"></a> setVideoDevice

▸ **setVideoDevice**(`deviceId`): `Promise`\<`void`\>

Changes the video device (i.e. webcam) used for the call.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | the target video device ID |

#### Returns

`Promise`\<`void`\>

Promise that resolves if the video device has been updated

**`Examples`**

Using async/await:

```js
await call.setVideoDevice('abc123')
```

Using ES6 `Promises`:

```js
call.setVideoDevice('abc123').then(() => {
  // Do something using new video device
});
```

Usage with `.getVideoDevices`:

```js
let result = await client.getVideoDevices();

if (result.length) {
  await call.setVideoDevice(result[1].deviceId);
}
```

#### Inherited from

BaseCall.setVideoDevice

___

### <a id="toggleaudiomute" name="toggleaudiomute"></a> toggleAudioMute

▸ **toggleAudioMute**(): `void`

Toggles the audio output on/off.

#### Returns

`void`

**`Examples`**

```js
call.toggleAudioMute();
```

#### Inherited from

BaseCall.toggleAudioMute

___

### <a id="toggledeaf" name="toggledeaf"></a> toggleDeaf

▸ **toggleDeaf**(): `void`

Toggles the remote stream audio.

#### Returns

`void`

**`Examples`**

```js
call.toggleDeaf()
```

#### Inherited from

BaseCall.toggleDeaf

___

### <a id="togglehold" name="togglehold"></a> toggleHold

▸ **toggleHold**(): `Promise`\<`any`\>

Toggles hold state of the call.

#### Returns

`Promise`\<`any`\>

Promise that resolves or rejects based on server response

**`Examples`**

Using async/await:

```js
await call.toggleHold()
console.log(call.state) // => 'held'

await call.toggleHold()
console.log(call.state) // => 'active'
```

#### Inherited from

BaseCall.toggleHold

___

### <a id="togglevideomute" name="togglevideomute"></a> toggleVideoMute

▸ **toggleVideoMute**(): `void`

Toggles the video output on/off.

#### Returns

`void`

**`Examples`**

```js
call.toggleVideoMute();
```

#### Inherited from

BaseCall.toggleVideoMute

___

### <a id="undeaf" name="undeaf"></a> undeaf

▸ **undeaf**(): `void`

Turns on the remote stream audio.

#### Returns

`void`

**`Examples`**

```js
call.undeaf()
```

#### Inherited from

BaseCall.undeaf

___

### <a id="unhold" name="unhold"></a> unhold

▸ **unhold**(): `Promise`\<`any`\>

Removes hold from the call.

#### Returns

`Promise`\<`any`\>

Promise that resolves or rejects based on server response

**`Examples`**

Using async/await:

```js
await call.unhold()
console.log(call.state) // => 'active'
```

Using ES6 `Promises`:

```js
call.unhold().then(() => {
  console.log(call.state) // => 'active'
});
```

#### Inherited from

BaseCall.unhold

___

### <a id="unmuteaudio" name="unmuteaudio"></a> unmuteAudio

▸ **unmuteAudio**(): `void`

Turns on audio output, i.e. makes it so other
call participants can hear your audio.

#### Returns

`void`

**`Examples`**

```js
call.unmuteAudio();
```

#### Inherited from

BaseCall.unmuteAudio

___

### <a id="unmutevideo" name="unmutevideo"></a> unmuteVideo

▸ **unmuteVideo**(): `void`

Turns on the video output, i.e. makes
video visible to other call participants.

#### Returns

`void`

**`Examples`**

```js
call.unmuteVideo();
```

#### Inherited from

BaseCall.unmuteVideo
