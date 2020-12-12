**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / BaseCall

# Class: BaseCall

## Hierarchy

* **BaseCall**

  ↳ [Call](call.md)

  ↳ [Call](call.md)

## Implements

* [IWebRTCCall](../interfaces/iwebrtccall.md)

## Index

### Constructors

* [constructor](basecall.md#constructor)

### Properties

* [cause](basecall.md#cause)
* [causeCode](basecall.md#causecode)
* [channels](basecall.md#channels)
* [direction](basecall.md#direction)
* [extension](basecall.md#extension)
* [id](basecall.md#id)
* [options](basecall.md#options)
* [peer](basecall.md#peer)
* [prevState](basecall.md#prevstate)
* [role](basecall.md#role)
* [sipCallId](basecall.md#sipcallid)
* [sipCode](basecall.md#sipcode)
* [sipReason](basecall.md#sipreason)
* [state](basecall.md#state)

### Accessors

* [localStream](basecall.md#localstream)
* [memberChannel](basecall.md#memberchannel)
* [nodeId](basecall.md#nodeid)
* [remoteStream](basecall.md#remotestream)

### Methods

* [\_addChannel](basecall.md#_addchannel)
* [answer](basecall.md#answer)
* [deaf](basecall.md#deaf)
* [dtmf](basecall.md#dtmf)
* [handleConferenceUpdate](basecall.md#handleconferenceupdate)
* [handleMessage](basecall.md#handlemessage)
* [hangup](basecall.md#hangup)
* [hold](basecall.md#hold)
* [invite](basecall.md#invite)
* [message](basecall.md#message)
* [muteAudio](basecall.md#muteaudio)
* [muteVideo](basecall.md#mutevideo)
* [playRingback](basecall.md#playringback)
* [playRingtone](basecall.md#playringtone)
* [replace](basecall.md#replace)
* [setAudioInDevice](basecall.md#setaudioindevice)
* [setState](basecall.md#setstate)
* [setVideoDevice](basecall.md#setvideodevice)
* [stopRingback](basecall.md#stopringback)
* [stopRingtone](basecall.md#stopringtone)
* [toggleAudioMute](basecall.md#toggleaudiomute)
* [toggleDeaf](basecall.md#toggledeaf)
* [toggleHold](basecall.md#togglehold)
* [toggleVideoMute](basecall.md#togglevideomute)
* [transfer](basecall.md#transfer)
* [undeaf](basecall.md#undeaf)
* [unhold](basecall.md#unhold)
* [unmuteAudio](basecall.md#unmuteaudio)
* [unmuteVideo](basecall.md#unmutevideo)
* [setStateTelnyx](basecall.md#setstatetelnyx)

## Constructors

### constructor

\+ **new BaseCall**(`session`: [BrowserSession](browsersession.md), `opts?`: [CallOptions](../interfaces/calloptions.md)): [BaseCall](basecall.md)

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:90](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L90)*

#### Parameters:

Name | Type |
------ | ------ |
`session` | [BrowserSession](browsersession.md) |
`opts?` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** [BaseCall](basecall.md)

## Properties

### cause

•  **cause**: string

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[cause](../interfaces/iwebrtccall.md#cause)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:56](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L56)*

___

### causeCode

•  **causeCode**: number

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[causeCode](../interfaces/iwebrtccall.md#causecode)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:58](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L58)*

___

### channels

•  **channels**: string[] = []

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[channels](../interfaces/iwebrtccall.md#channels)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:66](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L66)*

___

### direction

•  **direction**: [Direction](../enums/direction.md)

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[direction](../interfaces/iwebrtccall.md#direction)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:50](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L50)*

___

### extension

•  **extension**: string = null

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[extension](../interfaces/iwebrtccall.md#extension)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:70](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L70)*

___

### id

•  **id**: string = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[id](../interfaces/iwebrtccall.md#id)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L44)*

___

### options

•  **options**: [CallOptions](../interfaces/calloptions.md)

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[options](../interfaces/iwebrtccall.md#options)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L54)*

___

### peer

•  **peer**: [Peer](peer.md)

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L52)*

___

### prevState

•  **prevState**: string = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[prevState](../interfaces/iwebrtccall.md#prevstate)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L48)*

___

### role

•  **role**: string = Role.Participant

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[role](../interfaces/iwebrtccall.md#role)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:68](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L68)*

___

### sipCallId

•  **sipCallId**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:64](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L64)*

___

### sipCode

•  **sipCode**: number

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:62](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L62)*

___

### sipReason

•  **sipReason**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:60](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L60)*

___

### state

•  **state**: string = State[State.New]

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[state](../interfaces/iwebrtccall.md#state)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L46)*

## Accessors

### localStream

• get **localStream**(): MediaStream

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:138](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L138)*

**Returns:** MediaStream

___

### memberChannel

• get **memberChannel**(): string

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:146](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L146)*

**Returns:** string

___

### nodeId

• get **nodeId**(): string

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:130](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L130)*

**Returns:** string

• set **nodeId**(`what`: string): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:134](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L134)*

#### Parameters:

Name | Type |
------ | ------ |
`what` | string |

**Returns:** void

___

### remoteStream

• get **remoteStream**(): MediaStream

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:142](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L142)*

**Returns:** MediaStream

## Methods

### \_addChannel

▸ **_addChannel**(`channel`: string): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:804](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L804)*

#### Parameters:

Name | Type |
------ | ------ |
`channel` | string |

**Returns:** void

___

### answer

▸ **answer**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:165](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L165)*

Starts the process to answer the incoming call.

**`examples`** 

```js
call.answer()
```

**Returns:** void

___

### deaf

▸ **deaf**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:569](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L569)*

Turns off the remote stream audio.

**`examples`** 

```js
call.deaf()
```

**Returns:** void

___

### dtmf

▸ **dtmf**(`dtmf`: string): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:386](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L386)*

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

### handleConferenceUpdate

▸ **handleConferenceUpdate**(`packet`: any, `initialPvtData`: any): Promise<string\>

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:709](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L709)*

#### Parameters:

Name | Type |
------ | ------ |
`packet` | any |
`initialPvtData` | any |

**Returns:** Promise<string\>

___

### handleMessage

▸ **handleMessage**(`msg`: any): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:633](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L633)*

#### Parameters:

Name | Type |
------ | ------ |
`msg` | any |

**Returns:** void

___

### hangup

▸ **hangup**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:214](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L214)*

Hangs up the call.

**`examples`** 

```js
call.hangup()
```

**Returns:** void

▸ **hangup**(`hangupParams`: any, `hangupExecute`: any): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:218](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L218)*

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

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:300](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L300)*

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

### invite

▸ **invite**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:150](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L150)*

**Returns:** void

___

### message

▸ **message**(`to`: string, `body`: string): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:395](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L395)*

#### Parameters:

Name | Type |
------ | ------ |
`to` | string |
`body` | string |

**Returns:** void

___

### muteAudio

▸ **muteAudio**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:415](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L415)*

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

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:508](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L508)*

Turns off the video output, i.e. hides
video from other call participants.

**`examples`** 

```js
call.muteVideo();
```

**Returns:** void

___

### playRingback

▸ **playRingback**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:189](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L189)*

**Returns:** void

___

### playRingtone

▸ **playRingtone**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:173](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L173)*

**Returns:** void

___

### replace

▸ **replace**(`replaceCallID`: string): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:268](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L268)*

#### Parameters:

Name | Type |
------ | ------ |
`replaceCallID` | string |

**Returns:** void

___

### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:478](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L478)*

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

Usage with [BrowserSession.getAudioInDevices](browsersession.md#getaudioindevices):

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

### setState

▸ **setState**(`state`: [State](../enums/state.md)): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:599](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L599)*

#### Parameters:

Name | Type |
------ | ------ |
`state` | [State](../enums/state.md) |

**Returns:** void

___

### setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:539](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L539)*

#### Parameters:

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** Promise<void\>

___

### stopRingback

▸ **stopRingback**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:198](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L198)*

**Returns:** void

___

### stopRingtone

▸ **stopRingtone**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:182](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L182)*

**Returns:** void

___

### toggleAudioMute

▸ **toggleAudioMute**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:442](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L442)*

Toggles the audio output on/off.

**`examples`** 

```js
call.toggleAudioMute();
```

**Returns:** void

___

### toggleDeaf

▸ **toggleDeaf**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:595](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L595)*

Toggles the remote stream audio.

**`examples`** 

```js
call.toggleDeaf()
```

**Returns:** void

___

### toggleHold

▸ **toggleHold**(): Promise<any\>

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:361](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L361)*

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

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:535](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L535)*

Toggles the video output on/off.

**`examples`** 

```js
call.toggleVideoMute();
```

**Returns:** void

___

### transfer

▸ **transfer**(`destination`: string): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:258](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L258)*

#### Parameters:

Name | Type |
------ | ------ |
`destination` | string |

**Returns:** void

___

### undeaf

▸ **undeaf**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:582](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L582)*

Turns on the remote stream audio.

**`examples`** 

```js
call.undeaf()
```

**Returns:** void

___

### unhold

▸ **unhold**(): Promise<any\>

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:333](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L333)*

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

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:429](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L429)*

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

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:522](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L522)*

Turns on the video output, i.e. makes
video visible to other call participants.

**`examples`** 

```js
call.unmuteVideo();
```

**Returns:** void

___

### setStateTelnyx

▸ `Static`**setStateTelnyx**(`call`: [Call](call.md)): [Call](call.md)

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:1308](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L1308)*

#### Parameters:

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** [Call](call.md)
