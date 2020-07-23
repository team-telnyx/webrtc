[@telnyx/webrtc - v2.1.0](../README.md) › [Call](call.md)

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
* [state](call.md#state)

### Accessors

* [localStream](call.md#localstream)
* [memberChannel](call.md#memberchannel)
* [nodeId](call.md#nodeid)
* [remoteStream](call.md#remotestream)

### Methods

* [_addChannel](call.md#_addchannel)
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
* [setStateTelnyx](call.md#static-setstatetelnyx)

## Constructors

###  constructor

\+ **new Call**(`session`: [BrowserSession](browsersession.md), `opts?`: [CallOptions](../interfaces/calloptions.md)): *[Call](call.md)*

*Inherited from [BaseCall](basecall.md).[constructor](basecall.md#constructor)*

*Overrides [BaseCall](basecall.md).[constructor](basecall.md#constructor)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:39](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L39)*

**Parameters:**

Name | Type |
------ | ------ |
`session` | [BrowserSession](browsersession.md) |
`opts?` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *[Call](call.md)*

## Properties

###  cause

• **cause**: *string*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[cause](../interfaces/iwebrtccall.md#cause)*

*Inherited from [BaseCall](basecall.md).[cause](basecall.md#cause)*

*Overrides [BaseCall](basecall.md).[cause](basecall.md#cause)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:24](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L24)*

___

###  causeCode

• **causeCode**: *number*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[causeCode](../interfaces/iwebrtccall.md#causecode)*

*Inherited from [BaseCall](basecall.md).[causeCode](basecall.md#causecode)*

*Overrides [BaseCall](basecall.md).[causeCode](basecall.md#causecode)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:25](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L25)*

___

###  channels

• **channels**: *string[]* =  []

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[channels](../interfaces/iwebrtccall.md#channels)*

*Inherited from [BaseCall](basecall.md).[channels](basecall.md#channels)*

*Overrides [BaseCall](basecall.md).[channels](basecall.md#channels)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:26](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L26)*

___

###  direction

• **direction**: *[Direction](../enums/direction.md)*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[direction](../interfaces/iwebrtccall.md#direction)*

*Inherited from [BaseCall](basecall.md).[direction](basecall.md#direction)*

*Overrides [BaseCall](basecall.md).[direction](basecall.md#direction)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:21](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L21)*

___

###  extension

• **extension**: *string* =  null

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[extension](../interfaces/iwebrtccall.md#extension)*

*Inherited from [BaseCall](basecall.md).[extension](basecall.md#extension)*

*Overrides [BaseCall](basecall.md).[extension](basecall.md#extension)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:28](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L28)*

___

###  id

• **id**: *string* = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[id](../interfaces/iwebrtccall.md#id)*

*Inherited from [BaseCall](basecall.md).[id](basecall.md#id)*

*Overrides [BaseCall](basecall.md).[id](basecall.md#id)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:18](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L18)*

___

###  options

• **options**: *[CallOptions](../interfaces/calloptions.md)*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[options](../interfaces/iwebrtccall.md#options)*

*Inherited from [BaseCall](basecall.md).[options](basecall.md#options)*

*Overrides [BaseCall](basecall.md).[options](basecall.md#options)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:23](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L23)*

___

###  peer

• **peer**: *[Peer](peer.md)*

*Inherited from [BaseCall](basecall.md).[peer](basecall.md#peer)*

*Overrides [BaseCall](basecall.md).[peer](basecall.md#peer)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:22](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L22)*

___

###  prevState

• **prevState**: *string* = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[prevState](../interfaces/iwebrtccall.md#prevstate)*

*Inherited from [BaseCall](basecall.md).[prevState](basecall.md#prevstate)*

*Overrides [BaseCall](basecall.md).[prevState](basecall.md#prevstate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:20](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L20)*

___

###  role

• **role**: *string* =  Role.Participant

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[role](../interfaces/iwebrtccall.md#role)*

*Inherited from [BaseCall](basecall.md).[role](basecall.md#role)*

*Overrides [BaseCall](basecall.md).[role](basecall.md#role)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:27](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L27)*

___

###  screenShare

• **screenShare**: *[Call](call.md)*

*Defined in [src/Modules/Verto/webrtc/Call.ts:8](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/Call.ts#L8)*

___

###  state

• **state**: *string* =  State[State.New]

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[state](../interfaces/iwebrtccall.md#state)*

*Inherited from [BaseCall](basecall.md).[state](basecall.md#state)*

*Overrides [BaseCall](basecall.md).[state](basecall.md#state)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:19](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L19)*

## Accessors

###  localStream

• **get localStream**(): *MediaStream*

*Inherited from [BaseCall](basecall.md).[localStream](basecall.md#localstream)*

*Overrides [BaseCall](basecall.md).[localStream](basecall.md#localstream)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:57](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L57)*

**Returns:** *MediaStream*

___

###  memberChannel

• **get memberChannel**(): *string*

*Inherited from [BaseCall](basecall.md).[memberChannel](basecall.md#memberchannel)*

*Overrides [BaseCall](basecall.md).[memberChannel](basecall.md#memberchannel)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:65](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L65)*

**Returns:** *string*

___

###  nodeId

• **get nodeId**(): *string*

*Inherited from [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Overrides [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:49](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L49)*

**Returns:** *string*

• **set nodeId**(`what`: string): *void*

*Inherited from [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Overrides [BaseCall](basecall.md).[nodeId](basecall.md#nodeid)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:53](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L53)*

**Parameters:**

Name | Type |
------ | ------ |
`what` | string |

**Returns:** *void*

___

###  remoteStream

• **get remoteStream**(): *MediaStream*

*Inherited from [BaseCall](basecall.md).[remoteStream](basecall.md#remotestream)*

*Overrides [BaseCall](basecall.md).[remoteStream](basecall.md#remotestream)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:61](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L61)*

**Returns:** *MediaStream*

## Methods

###  _addChannel

▸ **_addChannel**(`channel`: string): *void*

*Inherited from [BaseCall](basecall.md).[_addChannel](basecall.md#_addchannel)*

*Overrides [BaseCall](basecall.md).[_addChannel](basecall.md#_addchannel)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:384](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L384)*

**Parameters:**

Name | Type |
------ | ------ |
`channel` | string |

**Returns:** *void*

___

###  answer

▸ **answer**(): *void*

*Inherited from [BaseCall](basecall.md).[answer](basecall.md#answer)*

*Overrides [BaseCall](basecall.md).[answer](basecall.md#answer)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:75](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L75)*

**Returns:** *void*

___

###  deaf

▸ **deaf**(): *void*

*Inherited from [BaseCall](basecall.md).[deaf](basecall.md#deaf)*

*Overrides [BaseCall](basecall.md).[deaf](basecall.md#deaf)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:236](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L236)*

**Returns:** *void*

___

###  dtmf

▸ **dtmf**(`dtmf`: string): *void*

*Inherited from [BaseCall](basecall.md).[dtmf](basecall.md#dtmf)*

*Overrides [BaseCall](basecall.md).[dtmf](basecall.md#dtmf)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:168](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L168)*

**Parameters:**

Name | Type |
------ | ------ |
`dtmf` | string |

**Returns:** *void*

___

###  handleConferenceUpdate

▸ **handleConferenceUpdate**(`packet`: any, `initialPvtData`: any): *Promise‹string›*

*Inherited from [BaseCall](basecall.md).[handleConferenceUpdate](basecall.md#handleconferenceupdate)*

*Overrides [BaseCall](basecall.md).[handleConferenceUpdate](basecall.md#handleconferenceupdate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:335](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L335)*

**Parameters:**

Name | Type |
------ | ------ |
`packet` | any |
`initialPvtData` | any |

**Returns:** *Promise‹string›*

___

###  handleMessage

▸ **handleMessage**(`msg`: any): *void*

*Inherited from [BaseCall](basecall.md).[handleMessage](basecall.md#handlemessage)*

*Overrides [BaseCall](basecall.md).[handleMessage](basecall.md#handlemessage)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:276](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L276)*

**Parameters:**

Name | Type |
------ | ------ |
`msg` | any |

**Returns:** *void*

___

###  hangup

▸ **hangup**(`params`: any, `execute`: boolean): *void*

*Overrides [BaseCall](basecall.md).[hangup](basecall.md#hangup)*

*Defined in [src/Modules/Verto/webrtc/Call.ts:12](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/Call.ts#L12)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`params` | any |  {} |
`execute` | boolean | true |

**Returns:** *void*

___

###  hold

▸ **hold**(): *any*

*Inherited from [BaseCall](basecall.md).[hold](basecall.md#hold)*

*Overrides [BaseCall](basecall.md).[hold](basecall.md#hold)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:147](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L147)*

**Returns:** *any*

___

###  invite

▸ **invite**(): *void*

*Inherited from [BaseCall](basecall.md).[invite](basecall.md#invite)*

*Overrides [BaseCall](basecall.md).[invite](basecall.md#invite)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:69](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L69)*

**Returns:** *void*

___

###  message

▸ **message**(`to`: string, `body`: string): *void*

*Inherited from [BaseCall](basecall.md).[message](basecall.md#message)*

*Overrides [BaseCall](basecall.md).[message](basecall.md#message)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:173](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L173)*

**Parameters:**

Name | Type |
------ | ------ |
`to` | string |
`body` | string |

**Returns:** *void*

___

###  muteAudio

▸ **muteAudio**(): *void*

*Inherited from [BaseCall](basecall.md).[muteAudio](basecall.md#muteaudio)*

*Overrides [BaseCall](basecall.md).[muteAudio](basecall.md#muteaudio)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:179](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L179)*

**Returns:** *void*

___

###  muteVideo

▸ **muteVideo**(): *void*

*Inherited from [BaseCall](basecall.md).[muteVideo](basecall.md#mutevideo)*

*Overrides [BaseCall](basecall.md).[muteVideo](basecall.md#mutevideo)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:207](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L207)*

**Returns:** *void*

___

###  playRingback

▸ **playRingback**(): *void*

*Inherited from [BaseCall](basecall.md).[playRingback](basecall.md#playringback)*

*Overrides [BaseCall](basecall.md).[playRingback](basecall.md#playringback)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:99](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L99)*

**Returns:** *void*

___

###  playRingtone

▸ **playRingtone**(): *void*

*Inherited from [BaseCall](basecall.md).[playRingtone](basecall.md#playringtone)*

*Overrides [BaseCall](basecall.md).[playRingtone](basecall.md#playringtone)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:83](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L83)*

**Returns:** *void*

___

###  replace

▸ **replace**(`replaceCallID`: string): *void*

*Inherited from [BaseCall](basecall.md).[replace](basecall.md#replace)*

*Overrides [BaseCall](basecall.md).[replace](basecall.md#replace)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:142](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L142)*

**Parameters:**

Name | Type |
------ | ------ |
`replaceCallID` | string |

**Returns:** *void*

___

###  setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): *Promise‹void›*

*Inherited from [BaseCall](basecall.md).[setAudioInDevice](basecall.md#setaudioindevice)*

*Overrides [BaseCall](basecall.md).[setAudioInDevice](basecall.md#setaudioindevice)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:191](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L191)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹void›*

___

###  setAudioOutDevice

▸ **setAudioOutDevice**(`deviceId`: string): *Promise‹boolean›*

*Defined in [src/Modules/Verto/webrtc/Call.ts:50](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/Call.ts#L50)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹boolean›*

___

###  setSpeakerPhone

▸ **setSpeakerPhone**(`flag`: boolean): *void*

*Defined in [src/Modules/Verto/webrtc/Call.native.ts:17](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/Call.native.ts#L17)*

**Parameters:**

Name | Type |
------ | ------ |
`flag` | boolean |

**Returns:** *void*

___

###  setState

▸ **setState**(`state`: [State](../enums/state.md)): *void*

*Inherited from [BaseCall](basecall.md).[setState](basecall.md#setstate)*

*Overrides [BaseCall](basecall.md).[setState](basecall.md#setstate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:248](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L248)*

**Parameters:**

Name | Type |
------ | ------ |
`state` | [State](../enums/state.md) |

**Returns:** *void*

___

###  setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): *Promise‹void›*

*Inherited from [BaseCall](basecall.md).[setVideoDevice](basecall.md#setvideodevice)*

*Overrides [BaseCall](basecall.md).[setVideoDevice](basecall.md#setvideodevice)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:219](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L219)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹void›*

___

###  startScreenShare

▸ **startScreenShare**(`opts?`: [CallOptions](../interfaces/calloptions.md)): *Promise‹[Call](call.md)‹››*

*Defined in [src/Modules/Verto/webrtc/Call.ts:19](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/Call.ts#L19)*

**Parameters:**

Name | Type |
------ | ------ |
`opts?` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *Promise‹[Call](call.md)‹››*

___

###  stopRingback

▸ **stopRingback**(): *void*

*Inherited from [BaseCall](basecall.md).[stopRingback](basecall.md#stopringback)*

*Overrides [BaseCall](basecall.md).[stopRingback](basecall.md#stopringback)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:108](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L108)*

**Returns:** *void*

___

###  stopRingtone

▸ **stopRingtone**(): *void*

*Inherited from [BaseCall](basecall.md).[stopRingtone](basecall.md#stopringtone)*

*Overrides [BaseCall](basecall.md).[stopRingtone](basecall.md#stopringtone)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:92](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L92)*

**Returns:** *void*

___

###  stopScreenShare

▸ **stopScreenShare**(): *void*

*Defined in [src/Modules/Verto/webrtc/Call.ts:44](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/Call.ts#L44)*

**Returns:** *void*

___

###  switchCamera

▸ **switchCamera**(): *void*

*Defined in [src/Modules/Verto/webrtc/Call.native.ts:9](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/Call.native.ts#L9)*

**Returns:** *void*

___

###  toggleAudioMute

▸ **toggleAudioMute**(): *void*

*Inherited from [BaseCall](basecall.md).[toggleAudioMute](basecall.md#toggleaudiomute)*

*Overrides [BaseCall](basecall.md).[toggleAudioMute](basecall.md#toggleaudiomute)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:187](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L187)*

**Returns:** *void*

___

###  toggleDeaf

▸ **toggleDeaf**(): *void*

*Inherited from [BaseCall](basecall.md).[toggleDeaf](basecall.md#toggledeaf)*

*Overrides [BaseCall](basecall.md).[toggleDeaf](basecall.md#toggledeaf)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:244](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L244)*

**Returns:** *void*

___

###  toggleHold

▸ **toggleHold**(): *any*

*Inherited from [BaseCall](basecall.md).[toggleHold](basecall.md#togglehold)*

*Overrides [BaseCall](basecall.md).[toggleHold](basecall.md#togglehold)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:161](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L161)*

**Returns:** *any*

___

###  toggleVideoMute

▸ **toggleVideoMute**(): *void*

*Inherited from [BaseCall](basecall.md).[toggleVideoMute](basecall.md#togglevideomute)*

*Overrides [BaseCall](basecall.md).[toggleVideoMute](basecall.md#togglevideomute)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:215](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L215)*

**Returns:** *void*

___

###  transfer

▸ **transfer**(`destination`: string): *void*

*Inherited from [BaseCall](basecall.md).[transfer](basecall.md#transfer)*

*Overrides [BaseCall](basecall.md).[transfer](basecall.md#transfer)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:137](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L137)*

**Parameters:**

Name | Type |
------ | ------ |
`destination` | string |

**Returns:** *void*

___

###  undeaf

▸ **undeaf**(): *void*

*Inherited from [BaseCall](basecall.md).[undeaf](basecall.md#undeaf)*

*Overrides [BaseCall](basecall.md).[undeaf](basecall.md#undeaf)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:240](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L240)*

**Returns:** *void*

___

###  unhold

▸ **unhold**(): *any*

*Inherited from [BaseCall](basecall.md).[unhold](basecall.md#unhold)*

*Overrides [BaseCall](basecall.md).[unhold](basecall.md#unhold)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:154](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L154)*

**Returns:** *any*

___

###  unmuteAudio

▸ **unmuteAudio**(): *void*

*Inherited from [BaseCall](basecall.md).[unmuteAudio](basecall.md#unmuteaudio)*

*Overrides [BaseCall](basecall.md).[unmuteAudio](basecall.md#unmuteaudio)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:183](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L183)*

**Returns:** *void*

___

###  unmuteVideo

▸ **unmuteVideo**(): *void*

*Inherited from [BaseCall](basecall.md).[unmuteVideo](basecall.md#unmutevideo)*

*Overrides [BaseCall](basecall.md).[unmuteVideo](basecall.md#unmutevideo)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:211](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L211)*

**Returns:** *void*

___

### `Static` setStateTelnyx

▸ **setStateTelnyx**(`call`: [Call](call.md)): *[Call](call.md)‹›*

*Inherited from [BaseCall](basecall.md)*

*Overrides [BaseCall](basecall.md).[setStateTelnyx](basecall.md#static-setstatetelnyx)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:808](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L808)*

**Parameters:**

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** *[Call](call.md)‹›*
