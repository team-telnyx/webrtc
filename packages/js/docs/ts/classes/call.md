**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Call

# Class: Call

## Hierarchy

* [BaseCall](basecall.md)

* [BaseCall](basecall.md)

  ↳ **Call**

## Implements

* [IWebRTCCall](../interfaces/iwebrtccall.md)
* [IWebRTCCall](../interfaces/iwebrtccall.md)

## Index

### Constructors

* [constructor](call.md#constructor)

### Properties

* [cause](call.md#cause)
* [causeCode](call.md#causecode)
* [channels](call.md#channels)
* [direction](call.md#direction)
* [extension](call.md#extension)
* [id](call.md#id)
* [options](call.md#options)
* [peer](call.md#peer)
* [prevState](call.md#prevstate)
* [role](call.md#role)
* [screenShare](call.md#screenshare)
* [sipCallId](call.md#sipcallid)
* [sipCode](call.md#sipcode)
* [sipReason](call.md#sipreason)
* [state](call.md#state)

### Accessors

* [localStream](call.md#localstream)
* [memberChannel](call.md#memberchannel)
* [nodeId](call.md#nodeid)
* [remoteStream](call.md#remotestream)

### Methods

* [\_addChannel](call.md#_addchannel)
* [answer](call.md#answer)
* [deaf](call.md#deaf)
* [dtmf](call.md#dtmf)
* [handleConferenceUpdate](call.md#handleconferenceupdate)
* [handleMessage](call.md#handlemessage)
* [hangup](call.md#hangup)
* [hold](call.md#hold)
* [invite](call.md#invite)
* [message](call.md#message)
* [muteAudio](call.md#muteaudio)
* [muteVideo](call.md#mutevideo)
* [playRingback](call.md#playringback)
* [playRingtone](call.md#playringtone)
* [replace](call.md#replace)
* [setAudioInDevice](call.md#setaudioindevice)
* [setAudioOutDevice](call.md#setaudiooutdevice)
* [setSpeakerPhone](call.md#setspeakerphone)
* [setState](call.md#setstate)
* [setVideoDevice](call.md#setvideodevice)
* [startScreenShare](call.md#startscreenshare)
* [stopRingback](call.md#stopringback)
* [stopRingtone](call.md#stopringtone)
* [stopScreenShare](call.md#stopscreenshare)
* [switchCamera](call.md#switchcamera)
* [toggleAudioMute](call.md#toggleaudiomute)
* [toggleDeaf](call.md#toggledeaf)
* [toggleHold](call.md#togglehold)
* [toggleVideoMute](call.md#togglevideomute)
* [transfer](call.md#transfer)
* [undeaf](call.md#undeaf)
* [unhold](call.md#unhold)
* [unmuteAudio](call.md#unmuteaudio)
* [unmuteVideo](call.md#unmutevideo)
* [setStateTelnyx](call.md#setstatetelnyx)

## Constructors

### constructor

\+ **new Call**(`session`: [BrowserSession](browsersession.md), `opts?`: [CallOptions](../interfaces/calloptions.md)): [Call](call.md)

*Inherited from [BaseCall](basecall.md).[constructor](basecall.md#constructor)*

*Overrides [BaseCall](basecall.md).[constructor](basecall.md#constructor)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:90](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L90)*

#### Parameters:

Name | Type |
------ | ------ |
`session` | [BrowserSession](browsersession.md) |
`opts?` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** [Call](call.md)

## Properties

### cause

•  **cause**: string

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[cause](../interfaces/iwebrtccall.md#cause)*

*Inherited from [BaseCall](basecall.md).[cause](basecall.md#cause)*

*Overrides [BaseCall](basecall.md).[cause](basecall.md#cause)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:56](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L56)*

___

### causeCode

•  **causeCode**: number

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[causeCode](../interfaces/iwebrtccall.md#causecode)*

*Inherited from [BaseCall](basecall.md).[causeCode](basecall.md#causecode)*

*Overrides [BaseCall](basecall.md).[causeCode](basecall.md#causecode)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:58](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L58)*

___

### channels

•  **channels**: string[] = []

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[channels](../interfaces/iwebrtccall.md#channels)*

*Inherited from [BaseCall](basecall.md).[channels](basecall.md#channels)*

*Overrides [BaseCall](basecall.md).[channels](basecall.md#channels)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:66](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L66)*

___

### direction

•  **direction**: [Direction](../enums/direction.md)

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[direction](../interfaces/iwebrtccall.md#direction)*

*Inherited from [BaseCall](basecall.md).[direction](basecall.md#direction)*

*Overrides [BaseCall](basecall.md).[direction](basecall.md#direction)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:50](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L50)*

___

### extension

•  **extension**: string = null

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[extension](../interfaces/iwebrtccall.md#extension)*

*Inherited from [BaseCall](basecall.md).[extension](basecall.md#extension)*

*Overrides [BaseCall](basecall.md).[extension](basecall.md#extension)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:70](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L70)*

___

### id

•  **id**: string = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[id](../interfaces/iwebrtccall.md#id)*

*Inherited from [BaseCall](basecall.md).[id](basecall.md#id)*

*Overrides [BaseCall](basecall.md).[id](basecall.md#id)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L44)*

___

### options

•  **options**: [CallOptions](../interfaces/calloptions.md)

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[options](../interfaces/iwebrtccall.md#options)*

*Inherited from [BaseCall](basecall.md).[options](basecall.md#options)*

*Overrides [BaseCall](basecall.md).[options](basecall.md#options)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L54)*

___

### peer

•  **peer**: [Peer](peer.md)

*Inherited from [BaseCall](basecall.md).[peer](basecall.md#peer)*

*Overrides [BaseCall](basecall.md).[peer](basecall.md#peer)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L52)*

___

### prevState

•  **prevState**: string = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[prevState](../interfaces/iwebrtccall.md#prevstate)*

*Inherited from [BaseCall](basecall.md).[prevState](basecall.md#prevstate)*

*Overrides [BaseCall](basecall.md).[prevState](basecall.md#prevstate)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L48)*

___

### role

•  **role**: string = Role.Participant

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[role](../interfaces/iwebrtccall.md#role)*

*Inherited from [BaseCall](basecall.md).[role](basecall.md#role)*

*Overrides [BaseCall](basecall.md).[role](basecall.md#role)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:68](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L68)*

___

### screenShare

•  **screenShare**: [Call](call.md)

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.ts:7](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L7)*

___

### sipCallId

•  **sipCallId**: string

*Inherited from [BaseCall](basecall.md).[sipCallId](basecall.md#sipcallid)*

*Overrides [BaseCall](basecall.md).[sipCallId](basecall.md#sipcallid)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:64](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L64)*

___

### sipCode

•  **sipCode**: number

*Inherited from [BaseCall](basecall.md).[sipCode](basecall.md#sipcode)*

*Overrides [BaseCall](basecall.md).[sipCode](basecall.md#sipcode)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:62](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L62)*

___

### sipReason

•  **sipReason**: string

*Inherited from [BaseCall](basecall.md).[sipReason](basecall.md#sipreason)*

*Overrides [BaseCall](basecall.md).[sipReason](basecall.md#sipreason)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:60](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L60)*

___

### state

•  **state**: string = State[State.New]

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[state](../interfaces/iwebrtccall.md#state)*

*Inherited from [BaseCall](basecall.md).[state](basecall.md#state)*

*Overrides [BaseCall](basecall.md).[state](basecall.md#state)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L46)*

## Accessors

### localStream

• get **localStream**(): MediaStream

*Inherited from [BaseCall](basecall.md).[localStream](basecall.md#localstream)*

*Overrides [BaseCall](basecall.md).[localStream](basecall.md#localstream)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:138](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L138)*

**Returns:** MediaStream

___

### memberChannel

• get **memberChannel**(): string

*Inherited from [BaseCall](basecall.md).[memberChannel](basecall.md#memberchannel)*

*Overrides [BaseCall](basecall.md).[memberChannel](basecall.md#memberchannel)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:146](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L146)*

**Returns:** string

___

### nodeId

• get **nodeId**(): string

*Inherited from [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Overrides [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:130](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L130)*

**Returns:** string

• set **nodeId**(`what`: string): void

*Inherited from [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Overrides [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:134](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L134)*

#### Parameters:

Name | Type |
------ | ------ |
`what` | string |

**Returns:** void

___

### remoteStream

• get **remoteStream**(): MediaStream

*Inherited from [BaseCall](basecall.md).[remoteStream](basecall.md#remotestream)*

*Overrides [BaseCall](basecall.md).[remoteStream](basecall.md#remotestream)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:142](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L142)*

**Returns:** MediaStream

## Methods

### \_addChannel

▸ **_addChannel**(`channel`: string): void

*Inherited from [BaseCall](basecall.md).[_addChannel](basecall.md#_addchannel)*

*Overrides [BaseCall](basecall.md).[_addChannel](basecall.md#_addchannel)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:804](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L804)*

#### Parameters:

Name | Type |
------ | ------ |
`channel` | string |

**Returns:** void

___

### answer

▸ **answer**(): void

*Inherited from [BaseCall](basecall.md).[answer](basecall.md#answer)*

*Overrides [BaseCall](basecall.md).[answer](basecall.md#answer)*

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

*Inherited from [BaseCall](basecall.md).[deaf](basecall.md#deaf)*

*Overrides [BaseCall](basecall.md).[deaf](basecall.md#deaf)*

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

*Inherited from [BaseCall](basecall.md).[dtmf](basecall.md#dtmf)*

*Overrides [BaseCall](basecall.md).[dtmf](basecall.md#dtmf)*

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

*Inherited from [BaseCall](basecall.md).[handleConferenceUpdate](basecall.md#handleconferenceupdate)*

*Overrides [BaseCall](basecall.md).[handleConferenceUpdate](basecall.md#handleconferenceupdate)*

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

*Inherited from [BaseCall](basecall.md).[handleMessage](basecall.md#handlemessage)*

*Overrides [BaseCall](basecall.md).[handleMessage](basecall.md#handlemessage)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:633](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L633)*

#### Parameters:

Name | Type |
------ | ------ |
`msg` | any |

**Returns:** void

___

### hangup

▸ **hangup**(`params?`: any, `execute?`: boolean): void

*Overrides [BaseCall](basecall.md).[hangup](basecall.md#hangup)*

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.ts:11](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L11)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`params` | any | {} |
`execute` | boolean | true |

**Returns:** void

___

### hold

▸ **hold**(): Promise<any\>

*Inherited from [BaseCall](basecall.md).[hold](basecall.md#hold)*

*Overrides [BaseCall](basecall.md).[hold](basecall.md#hold)*

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

*Inherited from [BaseCall](basecall.md).[invite](basecall.md#invite)*

*Overrides [BaseCall](basecall.md).[invite](basecall.md#invite)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:150](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L150)*

**Returns:** void

___

### message

▸ **message**(`to`: string, `body`: string): void

*Inherited from [BaseCall](basecall.md).[message](basecall.md#message)*

*Overrides [BaseCall](basecall.md).[message](basecall.md#message)*

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

*Inherited from [BaseCall](basecall.md).[muteAudio](basecall.md#muteaudio)*

*Overrides [BaseCall](basecall.md).[muteAudio](basecall.md#muteaudio)*

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

*Inherited from [BaseCall](basecall.md).[muteVideo](basecall.md#mutevideo)*

*Overrides [BaseCall](basecall.md).[muteVideo](basecall.md#mutevideo)*

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

*Inherited from [BaseCall](basecall.md).[playRingback](basecall.md#playringback)*

*Overrides [BaseCall](basecall.md).[playRingback](basecall.md#playringback)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:189](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L189)*

**Returns:** void

___

### playRingtone

▸ **playRingtone**(): void

*Inherited from [BaseCall](basecall.md).[playRingtone](basecall.md#playringtone)*

*Overrides [BaseCall](basecall.md).[playRingtone](basecall.md#playringtone)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:173](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L173)*

**Returns:** void

___

### replace

▸ **replace**(`replaceCallID`: string): void

*Inherited from [BaseCall](basecall.md).[replace](basecall.md#replace)*

*Overrides [BaseCall](basecall.md).[replace](basecall.md#replace)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:268](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L268)*

#### Parameters:

Name | Type |
------ | ------ |
`replaceCallID` | string |

**Returns:** void

___

### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): Promise<void\>

*Inherited from [BaseCall](basecall.md).[setAudioInDevice](basecall.md#setaudioindevice)*

*Overrides [BaseCall](basecall.md).[setAudioInDevice](basecall.md#setaudioindevice)*

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

### setAudioOutDevice

▸ **setAudioOutDevice**(`deviceId`: string): Promise<boolean\>

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L54)*

#### Parameters:

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** Promise<boolean\>

___

### setSpeakerPhone

▸ **setSpeakerPhone**(`flag`: boolean): void

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.native.ts:16](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.native.ts#L16)*

#### Parameters:

Name | Type |
------ | ------ |
`flag` | boolean |

**Returns:** void

___

### setState

▸ **setState**(`state`: [State](../enums/state.md)): void

*Inherited from [BaseCall](basecall.md).[setState](basecall.md#setstate)*

*Overrides [BaseCall](basecall.md).[setState](basecall.md#setstate)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:599](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L599)*

#### Parameters:

Name | Type |
------ | ------ |
`state` | [State](../enums/state.md) |

**Returns:** void

___

### setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): Promise<void\>

*Inherited from [BaseCall](basecall.md).[setVideoDevice](basecall.md#setvideodevice)*

*Overrides [BaseCall](basecall.md).[setVideoDevice](basecall.md#setvideodevice)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:539](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L539)*

#### Parameters:

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** Promise<void\>

___

### startScreenShare

▸ **startScreenShare**(`opts?`: [CallOptions](../interfaces/calloptions.md)): Promise<[Call](call.md)\>

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.ts:18](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L18)*

#### Parameters:

Name | Type |
------ | ------ |
`opts?` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** Promise<[Call](call.md)\>

___

### stopRingback

▸ **stopRingback**(): void

*Inherited from [BaseCall](basecall.md).[stopRingback](basecall.md#stopringback)*

*Overrides [BaseCall](basecall.md).[stopRingback](basecall.md#stopringback)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:198](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L198)*

**Returns:** void

___

### stopRingtone

▸ **stopRingtone**(): void

*Inherited from [BaseCall](basecall.md).[stopRingtone](basecall.md#stopringtone)*

*Overrides [BaseCall](basecall.md).[stopRingtone](basecall.md#stopringtone)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:182](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L182)*

**Returns:** void

___

### stopScreenShare

▸ **stopScreenShare**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L48)*

**Returns:** void

___

### switchCamera

▸ **switchCamera**(): void

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.native.ts:8](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.native.ts#L8)*

**Returns:** void

___

### toggleAudioMute

▸ **toggleAudioMute**(): void

*Inherited from [BaseCall](basecall.md).[toggleAudioMute](basecall.md#toggleaudiomute)*

*Overrides [BaseCall](basecall.md).[toggleAudioMute](basecall.md#toggleaudiomute)*

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

*Inherited from [BaseCall](basecall.md).[toggleDeaf](basecall.md#toggledeaf)*

*Overrides [BaseCall](basecall.md).[toggleDeaf](basecall.md#toggledeaf)*

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

*Inherited from [BaseCall](basecall.md).[toggleHold](basecall.md#togglehold)*

*Overrides [BaseCall](basecall.md).[toggleHold](basecall.md#togglehold)*

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

*Inherited from [BaseCall](basecall.md).[toggleVideoMute](basecall.md#togglevideomute)*

*Overrides [BaseCall](basecall.md).[toggleVideoMute](basecall.md#togglevideomute)*

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

*Inherited from [BaseCall](basecall.md).[transfer](basecall.md#transfer)*

*Overrides [BaseCall](basecall.md).[transfer](basecall.md#transfer)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:258](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L258)*

#### Parameters:

Name | Type |
------ | ------ |
`destination` | string |

**Returns:** void

___

### undeaf

▸ **undeaf**(): void

*Inherited from [BaseCall](basecall.md).[undeaf](basecall.md#undeaf)*

*Overrides [BaseCall](basecall.md).[undeaf](basecall.md#undeaf)*

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

*Inherited from [BaseCall](basecall.md).[unhold](basecall.md#unhold)*

*Overrides [BaseCall](basecall.md).[unhold](basecall.md#unhold)*

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

*Inherited from [BaseCall](basecall.md).[unmuteAudio](basecall.md#unmuteaudio)*

*Overrides [BaseCall](basecall.md).[unmuteAudio](basecall.md#unmuteaudio)*

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

*Inherited from [BaseCall](basecall.md).[unmuteVideo](basecall.md#unmutevideo)*

*Overrides [BaseCall](basecall.md).[unmuteVideo](basecall.md#unmutevideo)*

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

*Inherited from [BaseCall](basecall.md).[setStateTelnyx](basecall.md#setstatetelnyx)*

*Overrides [BaseCall](basecall.md).[setStateTelnyx](basecall.md#setstatetelnyx)*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:1308](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L1308)*

#### Parameters:

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** [Call](call.md)
