**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Call

# Class: Call

## Hierarchy

* BaseCall

  ↳ **Call**

## Implements

* IWebRTCCall

## Index

### Properties

* [direction](call.md#direction)
* [id](call.md#id)
* [prevState](call.md#prevstate)
* [state](call.md#state)

### Accessors

* [localStream](call.md#localstream)
* [remoteStream](call.md#remotestream)

### Methods

* [answer](call.md#answer)
* [deaf](call.md#deaf)
* [dtmf](call.md#dtmf)
* [hangup](call.md#hangup)
* [hold](call.md#hold)
* [muteAudio](call.md#muteaudio)
* [muteVideo](call.md#mutevideo)
* [setAudioInDevice](call.md#setaudioindevice)
* [setAudioOutDevice](call.md#setaudiooutdevice)
* [setVideoDevice](call.md#setvideodevice)
* [toggleAudioMute](call.md#toggleaudiomute)
* [toggleDeaf](call.md#toggledeaf)
* [toggleHold](call.md#togglehold)
* [toggleVideoMute](call.md#togglevideomute)
* [undeaf](call.md#undeaf)
* [unhold](call.md#unhold)
* [unmuteAudio](call.md#unmuteaudio)
* [unmuteVideo](call.md#unmutevideo)

## Properties

### direction

•  **direction**: Direction

*Inherited from void*

The direction of the call.
Can be either `inbound` or `outbound`.

Usage with {@link Direction}:

___

### id

•  **id**: string = ""

*Inherited from void*

The call identifier.

___

### prevState

•  **prevState**: string = ""

*Inherited from void*

The `prevState` of the call.
Usage with {@link State}:

___

### state

•  **state**: string = State[State.New]

*Inherited from void*

The `state` of the call.
Usage with {@link State}:

| Value | Description |
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

## Accessors

### localStream

• get **localStream**(): MediaStream

*Inherited from void*

Gets the local stream of the call.
This can be used in a video/audio element to play the local media.
[MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).

**`examples`** 

```js
const stream = call.localStream();
document.querySelector('audio').srcObject = stream;
```

**Returns:** MediaStream

___

### remoteStream

• get **remoteStream**(): MediaStream

*Inherited from void*

Gets the remote stream of the call.
This can be used in a video/audio element to play the local media.
[MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).

**`examples`** 

```js
const stream = call.remoteStream();
document.querySelector('audio').srcObject = stream;
```

**Returns:** MediaStream

## Methods

### answer

▸ **answer**(): void

*Inherited from void*

Starts the process to answer the incoming call.

**`examples`** 

```js
call.answer()
```

**Returns:** void

___

### deaf

▸ **deaf**(): void

*Inherited from void*

Turns off the remote stream audio.

**`examples`** 

```js
call.deaf()
```

**Returns:** void

___

### dtmf

▸ **dtmf**(`dtmf`: string): void

*Inherited from void*

Sends dual-tone multi-frequency (DTMF) signal

**`examples`** 

```js
call.dtmf('0');
call.dtmf('1');
call.dtmf('*');
call.dtmf('#');
```

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`dtmf` | string | Single DTMF key  |

**Returns:** void

___

### hangup

▸ **hangup**(): void

*Inherited from void*

Hangs up the call.

**`examples`** 

```js
call.hangup()
```

**Returns:** void

▸ **hangup**(`hangupParams`: any, `hangupExecute`: any): void

*Inherited from void*

**`internal`** 

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`hangupParams` | any | _For internal use_ Specify custom hangup cause and call ID |
`hangupExecute` | any | _For internal use_ Allow or prevent execution of `Bye`  |

**Returns:** void

___

### hold

▸ **hold**(): Promise<any\>

*Inherited from void*

Holds the call.

**`examples`** 

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

**Returns:** Promise<any\>

Promise that resolves or rejects based on server response

___

### muteAudio

▸ **muteAudio**(): void

*Inherited from void*

Turns off audio output, i.e. makes it so other
call participants cannot hear your audio.

**`examples`** 

```js
call.muteAudio();
```

**Returns:** void

___

### muteVideo

▸ **muteVideo**(): void

*Inherited from void*

Turns off the video output, i.e. hides
video from other call participants.

**`examples`** 

```js
call.muteVideo();
```

**Returns:** void

___

### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): Promise<void\>

*Inherited from void*

Changes the audio input device (i.e. microphone) used for the call.

**`examples`** 

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

Usage with {@link BrowserSession.getAudioInDevices}:

```js
let result = await client.getAudioInDevices();

if (result.length) {
  call.setAudioInDevice(result[1].deviceId);
}
```

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`deviceId` | string | The target audio input device ID |

**Returns:** Promise<void\>

Promise that resolves if the audio input device has been updated

___

### setAudioOutDevice

▸ **setAudioOutDevice**(`deviceId`: string): Promise<boolean\>

Changes the audio output device (i.e. speaker) used for the call.

**`examples`** 

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

Usage with {@link BrowserSession.getAudioOutDevices}:

```js
let result = await client.getAudioOutDevices();

if (result.length) {
  await call.setAudioOutDevice(result[1].deviceId);
}
```

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`deviceId` | string | The target audio output device ID |

**Returns:** Promise<boolean\>

Promise that returns a boolean

___

### setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): Promise<void\>

*Inherited from void*

Changes the video device (i.e. webcam) used for the call.

**`examples`** 

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

Usage with {@link BrowserSession.getVideoDevices}:

```js
let result = await client.getVideoDevices();

if (result.length) {
  await call.setVideoDevice(result[1].deviceId);
}
```

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`deviceId` | string | the target video device ID |

**Returns:** Promise<void\>

Promise that resolves if the video device has been updated

___

### toggleAudioMute

▸ **toggleAudioMute**(): void

*Inherited from void*

Toggles the audio output on/off.

**`examples`** 

```js
call.toggleAudioMute();
```

**Returns:** void

___

### toggleDeaf

▸ **toggleDeaf**(): void

*Inherited from void*

Toggles the remote stream audio.

**`examples`** 

```js
call.toggleDeaf()
```

**Returns:** void

___

### toggleHold

▸ **toggleHold**(): Promise<any\>

*Inherited from void*

Toggles hold state of the call.

**`examples`** 

Using async/await:

```js
await call.toggleHold()
console.log(call.state) // => 'held'

await call.toggleHold()
console.log(call.state) // => 'active'
```

**Returns:** Promise<any\>

Promise that resolves or rejects based on server response

___

### toggleVideoMute

▸ **toggleVideoMute**(): void

*Inherited from void*

Toggles the video output on/off.

**`examples`** 

```js
call.toggleVideoMute();
```

**Returns:** void

___

### undeaf

▸ **undeaf**(): void

*Inherited from void*

Turns on the remote stream audio.

**`examples`** 

```js
call.undeaf()
```

**Returns:** void

___

### unhold

▸ **unhold**(): Promise<any\>

*Inherited from void*

Removes hold from the call.

**`examples`** 

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

**Returns:** Promise<any\>

Promise that resolves or rejects based on server response

___

### unmuteAudio

▸ **unmuteAudio**(): void

*Inherited from void*

Turns on audio output, i.e. makes it so other
call participants can hear your audio.

**`examples`** 

```js
call.unmuteAudio();
```

**Returns:** void

___

### unmuteVideo

▸ **unmuteVideo**(): void

*Inherited from void*

Turns on the video output, i.e. makes
video visible to other call participants.

**`examples`** 

```js
call.unmuteVideo();
```

**Returns:** void
