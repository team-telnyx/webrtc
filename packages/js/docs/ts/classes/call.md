**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Call

# Class: Call

## Hierarchy

* BaseCall

* BaseCall

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:93](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L93)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:59](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L59)*

___

### causeCode

•  **causeCode**: number

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[causeCode](../interfaces/iwebrtccall.md#causecode)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:61](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L61)*

___

### channels

•  **channels**: string[] = []

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[channels](../interfaces/iwebrtccall.md#channels)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:69](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L69)*

___

### direction

•  **direction**: [Direction](../enums/direction.md)

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[direction](../interfaces/iwebrtccall.md#direction)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:53](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L53)*

___

### extension

•  **extension**: string = null

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[extension](../interfaces/iwebrtccall.md#extension)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:73](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L73)*

___

### id

•  **id**: string = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[id](../interfaces/iwebrtccall.md#id)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L47)*

___

### options

•  **options**: [CallOptions](../interfaces/calloptions.md)

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[options](../interfaces/iwebrtccall.md#options)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:57](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L57)*

___

### peer

•  **peer**: Peer

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:55](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L55)*

___

### prevState

•  **prevState**: string = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[prevState](../interfaces/iwebrtccall.md#prevstate)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:51](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L51)*

___

### role

•  **role**: string = Role.Participant

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[role](../interfaces/iwebrtccall.md#role)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:71](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L71)*

___

### screenShare

•  **screenShare**: [Call](call.md)

*Defined in [packages/js/src/Modules/Verto/webrtc/Call.ts:7](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L7)*

___

### sipCallId

•  **sipCallId**: string

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:67](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L67)*

___

### sipCode

•  **sipCode**: number

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:65](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L65)*

___

### sipReason

•  **sipReason**: string

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:63](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L63)*

___

### state

•  **state**: string = State[State.New]

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[state](../interfaces/iwebrtccall.md#state)*

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L49)*

## Accessors

### localStream

• get **localStream**(): MediaStream

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:141](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L141)*

**Returns:** MediaStream

___

### memberChannel

• get **memberChannel**(): string

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:149](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L149)*

**Returns:** string

___

### nodeId

• get **nodeId**(): string

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:133](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L133)*

**Returns:** string

• set **nodeId**(`what`: string): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:137](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L137)*

#### Parameters:

Name | Type |
------ | ------ |
`what` | string |

**Returns:** void

___

### remoteStream

• get **remoteStream**(): MediaStream

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:145](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L145)*

**Returns:** MediaStream

## Methods

### \_addChannel

▸ **_addChannel**(`channel`: string): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:807](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L807)*

#### Parameters:

Name | Type |
------ | ------ |
`channel` | string |

**Returns:** void

___

### answer

▸ **answer**(): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:168](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L168)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:572](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L572)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:389](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L389)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:712](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L712)*

#### Parameters:

Name | Type |
------ | ------ |
`packet` | any |
`initialPvtData` | any |

**Returns:** Promise<string\>

___

### handleMessage

▸ **handleMessage**(`msg`: any): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:636](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L636)*

#### Parameters:

Name | Type |
------ | ------ |
`msg` | any |

**Returns:** void

___

### hangup

▸ **hangup**(`params?`: any, `execute?`: boolean): void

*Overrides void*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:303](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L303)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:153](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L153)*

**Returns:** void

___

### message

▸ **message**(`to`: string, `body`: string): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:398](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L398)*

#### Parameters:

Name | Type |
------ | ------ |
`to` | string |
`body` | string |

**Returns:** void

___

### muteAudio

▸ **muteAudio**(): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:418](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L418)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:511](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L511)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:192](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L192)*

**Returns:** void

___

### playRingtone

▸ **playRingtone**(): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:176](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L176)*

**Returns:** void

___

### replace

▸ **replace**(`replaceCallID`: string): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:271](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L271)*

#### Parameters:

Name | Type |
------ | ------ |
`replaceCallID` | string |

**Returns:** void

___

### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): Promise<void\>

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:481](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L481)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:602](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L602)*

#### Parameters:

Name | Type |
------ | ------ |
`state` | [State](../enums/state.md) |

**Returns:** void

___

### setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): Promise<void\>

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:542](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L542)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:201](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L201)*

**Returns:** void

___

### stopRingtone

▸ **stopRingtone**(): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:185](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L185)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:445](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L445)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:598](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L598)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:364](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L364)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:538](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L538)*

Toggles the video output on/off.

**`examples`** 

```js
call.toggleVideoMute();
```

**Returns:** void

___

### transfer

▸ **transfer**(`destination`: string): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:261](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L261)*

#### Parameters:

Name | Type |
------ | ------ |
`destination` | string |

**Returns:** void

___

### undeaf

▸ **undeaf**(): void

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:585](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L585)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:336](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L336)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:432](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L432)*

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

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:525](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L525)*

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

*Inherited from void*

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/webrtc/BaseCall.ts:1311](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L1311)*

#### Parameters:

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** [Call](call.md)
