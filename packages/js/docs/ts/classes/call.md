**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Call

# Class: Call

## Hierarchy

* BaseCall

  ↳ **Call**

## Implements

* IWebRTCCall

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
* [setState](call.md#setstate)
* [setVideoDevice](call.md#setvideodevice)
* [startScreenShare](call.md#startscreenshare)
* [stopRingback](call.md#stopringback)
* [stopRingtone](call.md#stopringtone)
* [stopScreenShare](call.md#stopscreenshare)
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

\+ **new Call**(`session`: [BrowserSession](browsersession.md), `opts?`: CallOptions): [Call](call.md)

*Inherited from [Call](call.md).[constructor](call.md#constructor)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:93](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L93)*

#### Parameters:

Name | Type |
------ | ------ |
`session` | [BrowserSession](browsersession.md) |
`opts?` | CallOptions |

**Returns:** [Call](call.md)

## Properties

### cause

•  **cause**: string

*Inherited from [Call](call.md).[cause](call.md#cause)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:59](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L59)*

___

### causeCode

•  **causeCode**: number

*Inherited from [Call](call.md).[causeCode](call.md#causecode)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:61](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L61)*

___

### channels

•  **channels**: string[] = []

*Inherited from [Call](call.md).[channels](call.md#channels)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:69](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L69)*

___

### direction

•  **direction**: Direction

*Inherited from [Call](call.md).[direction](call.md#direction)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:53](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L53)*

___

### extension

•  **extension**: string = null

*Inherited from [Call](call.md).[extension](call.md#extension)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:73](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L73)*

___

### id

•  **id**: string = ""

*Inherited from [Call](call.md).[id](call.md#id)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L47)*

___

### options

•  **options**: CallOptions

*Inherited from [Call](call.md).[options](call.md#options)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:57](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L57)*

___

### peer

•  **peer**: Peer

*Inherited from [Call](call.md).[peer](call.md#peer)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:55](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L55)*

___

### prevState

•  **prevState**: string = ""

*Inherited from [Call](call.md).[prevState](call.md#prevstate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:51](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L51)*

___

### role

•  **role**: string = Role.Participant

*Inherited from [Call](call.md).[role](call.md#role)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:71](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L71)*

___

### screenShare

•  **screenShare**: [Call](call.md)

*Defined in [src/Modules/Verto/webrtc/Call.ts:7](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L7)*

___

### sipCallId

•  **sipCallId**: string

*Inherited from [Call](call.md).[sipCallId](call.md#sipcallid)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:67](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L67)*

___

### sipCode

•  **sipCode**: number

*Inherited from [Call](call.md).[sipCode](call.md#sipcode)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:65](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L65)*

___

### sipReason

•  **sipReason**: string

*Inherited from [Call](call.md).[sipReason](call.md#sipreason)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:63](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L63)*

___

### state

•  **state**: string = State[State.New]

*Inherited from [Call](call.md).[state](call.md#state)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L49)*

## Accessors

### localStream

• get **localStream**(): MediaStream

*Inherited from [Call](call.md).[localStream](call.md#localstream)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:141](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L141)*

**Returns:** MediaStream

___

### memberChannel

• get **memberChannel**(): string

*Inherited from [Call](call.md).[memberChannel](call.md#memberchannel)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:149](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L149)*

**Returns:** string

___

### nodeId

• get **nodeId**(): string

*Inherited from [Call](call.md).[nodeId](call.md#nodeid)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:133](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L133)*

**Returns:** string

• set **nodeId**(`what`: string): void

*Inherited from [Call](call.md).[nodeId](call.md#nodeid)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:137](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L137)*

#### Parameters:

Name | Type |
------ | ------ |
`what` | string |

**Returns:** void

___

### remoteStream

• get **remoteStream**(): MediaStream

*Inherited from [Call](call.md).[remoteStream](call.md#remotestream)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:145](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L145)*

**Returns:** MediaStream

## Methods

### \_addChannel

▸ **_addChannel**(`channel`: string): void

*Inherited from [Call](call.md).[_addChannel](call.md#_addchannel)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:807](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L807)*

#### Parameters:

Name | Type |
------ | ------ |
`channel` | string |

**Returns:** void

___

### answer

▸ **answer**(): void

*Inherited from [Call](call.md).[answer](call.md#answer)*

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

*Inherited from [Call](call.md).[deaf](call.md#deaf)*

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

*Inherited from [Call](call.md).[dtmf](call.md#dtmf)*

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

### handleConferenceUpdate

▸ **handleConferenceUpdate**(`packet`: any, `initialPvtData`: any): Promise<string\>

*Inherited from [Call](call.md).[handleConferenceUpdate](call.md#handleconferenceupdate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:712](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L712)*

#### Parameters:

Name | Type |
------ | ------ |
`packet` | any |
`initialPvtData` | any |

**Returns:** Promise<string\>

___

### handleMessage

▸ **handleMessage**(`msg`: any): void

*Inherited from [Call](call.md).[handleMessage](call.md#handlemessage)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:636](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L636)*

#### Parameters:

Name | Type |
------ | ------ |
`msg` | any |

**Returns:** void

___

### hangup

▸ **hangup**(`params?`: any, `execute?`: boolean): void

*Overrides void*

*Defined in [src/Modules/Verto/webrtc/Call.ts:11](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L11)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`params` | any | {} |
`execute` | boolean | true |

**Returns:** void

___

### hold

▸ **hold**(): Promise<any\>

*Inherited from [Call](call.md).[hold](call.md#hold)*

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

### invite

▸ **invite**(): void

*Inherited from [Call](call.md).[invite](call.md#invite)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:153](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L153)*

**Returns:** void

___

### message

▸ **message**(`to`: string, `body`: string): void

*Inherited from [Call](call.md).[message](call.md#message)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:398](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L398)*

#### Parameters:

Name | Type |
------ | ------ |
`to` | string |
`body` | string |

**Returns:** void

___

### muteAudio

▸ **muteAudio**(): void

*Inherited from [Call](call.md).[muteAudio](call.md#muteaudio)*

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

*Inherited from [Call](call.md).[muteVideo](call.md#mutevideo)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:511](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L511)*

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

*Inherited from [Call](call.md).[playRingback](call.md#playringback)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:192](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L192)*

**Returns:** void

___

### playRingtone

▸ **playRingtone**(): void

*Inherited from [Call](call.md).[playRingtone](call.md#playringtone)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:176](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L176)*

**Returns:** void

___

### replace

▸ **replace**(`replaceCallID`: string): void

*Inherited from [Call](call.md).[replace](call.md#replace)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:271](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L271)*

#### Parameters:

Name | Type |
------ | ------ |
`replaceCallID` | string |

**Returns:** void

___

### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): Promise<void\>

*Inherited from [Call](call.md).[setAudioInDevice](call.md#setaudioindevice)*

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

*Defined in [src/Modules/Verto/webrtc/Call.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L54)*

#### Parameters:

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** Promise<boolean\>

___

### setState

▸ **setState**(`state`: State): void

*Inherited from [Call](call.md).[setState](call.md#setstate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:602](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L602)*

#### Parameters:

Name | Type |
------ | ------ |
`state` | State |

**Returns:** void

___

### setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): Promise<void\>

*Inherited from [Call](call.md).[setVideoDevice](call.md#setvideodevice)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:542](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L542)*

#### Parameters:

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** Promise<void\>

___

### startScreenShare

▸ **startScreenShare**(`opts?`: CallOptions): Promise<[Call](call.md)\>

*Defined in [src/Modules/Verto/webrtc/Call.ts:18](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L18)*

#### Parameters:

Name | Type |
------ | ------ |
`opts?` | CallOptions |

**Returns:** Promise<[Call](call.md)\>

___

### stopRingback

▸ **stopRingback**(): void

*Inherited from [Call](call.md).[stopRingback](call.md#stopringback)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:201](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L201)*

**Returns:** void

___

### stopRingtone

▸ **stopRingtone**(): void

*Inherited from [Call](call.md).[stopRingtone](call.md#stopringtone)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:185](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L185)*

**Returns:** void

___

### stopScreenShare

▸ **stopScreenShare**(): void

*Defined in [src/Modules/Verto/webrtc/Call.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Call.ts#L48)*

**Returns:** void

___

### toggleAudioMute

▸ **toggleAudioMute**(): void

*Inherited from [Call](call.md).[toggleAudioMute](call.md#toggleaudiomute)*

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

*Inherited from [Call](call.md).[toggleDeaf](call.md#toggledeaf)*

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

*Inherited from [Call](call.md).[toggleHold](call.md#togglehold)*

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

*Inherited from [Call](call.md).[toggleVideoMute](call.md#togglevideomute)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:538](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L538)*

Toggles the video output on/off.

**`examples`** 

```js
call.toggleVideoMute();
```

**Returns:** void

___

### transfer

▸ **transfer**(`destination`: string): void

*Inherited from [Call](call.md).[transfer](call.md#transfer)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:261](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L261)*

#### Parameters:

Name | Type |
------ | ------ |
`destination` | string |

**Returns:** void

___

### undeaf

▸ **undeaf**(): void

*Inherited from [Call](call.md).[undeaf](call.md#undeaf)*

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

*Inherited from [Call](call.md).[unhold](call.md#unhold)*

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

*Inherited from [Call](call.md).[unmuteAudio](call.md#unmuteaudio)*

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

*Inherited from [Call](call.md).[unmuteVideo](call.md#unmutevideo)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:525](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L525)*

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

*Inherited from [Call](call.md).[setStateTelnyx](call.md#setstatetelnyx)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:1311](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L1311)*

#### Parameters:

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** [Call](call.md)
