**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Call

# Class: Call

## Hierarchy

* BaseCall

  ↳ **Call**

## Implements

* IWebRTCCall

## Index

### Methods

* [answer](call.md#answer)
* [deaf](call.md#deaf)
* [dtmf](call.md#dtmf)
* [hangup](call.md#hangup)
* [hold](call.md#hold)
* [muteAudio](call.md#muteaudio)
* [muteVideo](call.md#mutevideo)
* [setAudioInDevice](call.md#setaudioindevice)
* [toggleAudioMute](call.md#toggleaudiomute)
* [toggleDeaf](call.md#toggledeaf)
* [toggleHold](call.md#togglehold)
* [toggleVideoMute](call.md#togglevideomute)
* [undeaf](call.md#undeaf)
* [unhold](call.md#unhold)
* [unmuteAudio](call.md#unmuteaudio)
* [unmuteVideo](call.md#unmutevideo)

## Methods

### answer

▸ **answer**(): void

*Inherited from void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:168](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L168)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:572](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L572)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:389](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L389)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:217](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L217)*

Hangs up the call.

**`examples`** 

```js
call.hangup()
```

**Returns:** void

▸ **hangup**(`hangupParams`: any, `hangupExecute`: any): void

*Inherited from void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:221](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L221)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:303](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L303)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:418](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L418)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:511](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L511)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:481](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L481)*

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

### toggleAudioMute

▸ **toggleAudioMute**(): void

*Inherited from void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:445](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L445)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:598](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L598)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:364](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L364)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:538](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L538)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:585](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L585)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:336](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L336)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:432](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L432)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:525](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L525)*

Turns on the video output, i.e. makes
video visible to other call participants.

**`examples`** 

```js
call.unmuteVideo();
```

**Returns:** void
