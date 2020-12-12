**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Call

# Class: Call

## Hierarchy

- BaseCall

  ↳ **Call**

## Implements

- IWebRTCCall

## Index

### Methods

- [answer](call.md#answer)
- [deaf](call.md#deaf)
- [dtmf](call.md#dtmf)
- [hangup](call.md#hangup)
- [hold](call.md#hold)
- [muteAudio](call.md#muteaudio)
- [muteVideo](call.md#mutevideo)
- [setAudioInDevice](call.md#setaudioindevice)
- [toggleAudioMute](call.md#toggleaudiomute)
- [toggleDeaf](call.md#toggledeaf)
- [toggleHold](call.md#togglehold)
- [toggleVideoMute](call.md#togglevideomute)
- [undeaf](call.md#undeaf)
- [unhold](call.md#unhold)
- [unmuteAudio](call.md#unmuteaudio)
- [unmuteVideo](call.md#unmutevideo)

## Methods

### answer

▸ **answer**(): void

_Inherited from void_

Starts the process to answer the incoming call.

**`examples`**

```js
call.answer();
```

**Returns:** void

---

### deaf

▸ **deaf**(): void

_Inherited from void_

Turns off the remote stream audio.

**`examples`**

```js
call.deaf();
```

**Returns:** void

---

### dtmf

▸ **dtmf**(`dtmf`: string): void

_Inherited from void_

Sends dual-tone multi-frequency (DTMF) signal

**`examples`**

```js
call.dtmf('0');
call.dtmf('1');
call.dtmf('*');
call.dtmf('#');
```

#### Parameters:

| Name   | Type   | Description     |
| ------ | ------ | --------------- |
| `dtmf` | string | Single DTMF key |

**Returns:** void

---

### hangup

▸ **hangup**(): void

_Inherited from void_

Hangs up the call.

**`examples`**

```js
call.hangup();
```

**Returns:** void

▸ **hangup**(`hangupParams`: any, `hangupExecute`: any): void

_Inherited from void_

**`internal`**

#### Parameters:

| Name            | Type | Description                                                |
| --------------- | ---- | ---------------------------------------------------------- |
| `hangupParams`  | any  | _For internal use_ Specify custom hangup cause and call ID |
| `hangupExecute` | any  | _For internal use_ Allow or prevent execution of `Bye`     |

**Returns:** void

---

### hold

▸ **hold**(): Promise<any\>

_Inherited from void_

Holds the call.

**`examples`**

Using async/await:

```js
await call.hold();
console.log(call.state); // => 'held'
```

Using ES6 `Promises`:

```js
call.hold().then(() => {
  console.log(call.state); // => 'held'
});
```

**Returns:** Promise<any\>

Promise that resolves or rejects based on server response

---

### muteAudio

▸ **muteAudio**(): void

_Inherited from void_

Turns off audio output, i.e. makes it so other
call participants cannot hear your audio.

**`examples`**

```js
call.muteAudio();
```

**Returns:** void

---

### muteVideo

▸ **muteVideo**(): void

_Inherited from void_

Turns off the video output, i.e. hides
video from other call participants.

**`examples`**

```js
call.muteVideo();
```

**Returns:** void

---

### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): Promise<void\>

_Inherited from void_

Changes the audio input device (i.e. microphone) used for the call.

**`examples`**

Using async/await:

```js
await call.setAudioInDevice('abc123');
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

| Name       | Type   | Description                      |
| ---------- | ------ | -------------------------------- |
| `deviceId` | string | The target audio input device ID |

**Returns:** Promise<void\>

Promise that resolves if the audio input device has been updated

---

### toggleAudioMute

▸ **toggleAudioMute**(): void

_Inherited from void_

Toggles the audio output on/off.

**`examples`**

```js
call.toggleAudioMute();
```

**Returns:** void

---

### toggleDeaf

▸ **toggleDeaf**(): void

_Inherited from void_

Toggles the remote stream audio.

**`examples`**

```js
call.toggleDeaf();
```

**Returns:** void

---

### toggleHold

▸ **toggleHold**(): Promise<any\>

_Inherited from void_

Toggles hold state of the call.

**`examples`**

Using async/await:

```js
await call.toggleHold();
console.log(call.state); // => 'held'

await call.toggleHold();
console.log(call.state); // => 'active'
```

**Returns:** Promise<any\>

Promise that resolves or rejects based on server response

---

### toggleVideoMute

▸ **toggleVideoMute**(): void

_Inherited from void_

Toggles the video output on/off.

**`examples`**

```js
call.toggleVideoMute();
```

**Returns:** void

---

### undeaf

▸ **undeaf**(): void

_Inherited from void_

Turns on the remote stream audio.

**`examples`**

```js
call.undeaf();
```

**Returns:** void

---

### unhold

▸ **unhold**(): Promise<any\>

_Inherited from void_

Removes hold from the call.

**`examples`**

Using async/await:

```js
await call.unhold();
console.log(call.state); // => 'active'
```

Using ES6 `Promises`:

```js
call.unhold().then(() => {
  console.log(call.state); // => 'active'
});
```

**Returns:** Promise<any\>

Promise that resolves or rejects based on server response

---

### unmuteAudio

▸ **unmuteAudio**(): void

_Inherited from void_

Turns on audio output, i.e. makes it so other
call participants can hear your audio.

**`examples`**

```js
call.unmuteAudio();
```

**Returns:** void

---

### unmuteVideo

▸ **unmuteVideo**(): void

_Inherited from void_

Turns on the video output, i.e. makes
video visible to other call participants.

**`examples`**

```js
call.unmuteVideo();
```

**Returns:** void
