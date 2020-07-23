[@telnyx/webrtc - v2.1.0](../README.md) › [BaseCall](basecall.md)

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
* [state](basecall.md#state)

### Accessors

* [localStream](basecall.md#localstream)
* [memberChannel](basecall.md#memberchannel)
* [nodeId](basecall.md#nodeid)
* [remoteStream](basecall.md#remotestream)

### Methods

* [_addChannel](basecall.md#_addchannel)
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
* [setStateTelnyx](basecall.md#static-setstatetelnyx)

## Constructors

###  constructor

\+ **new BaseCall**(`session`: [BrowserSession](browsersession.md), `opts?`: [CallOptions](../interfaces/calloptions.md)): *[BaseCall](basecall.md)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:39](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L39)*

**Parameters:**

Name | Type |
------ | ------ |
`session` | [BrowserSession](browsersession.md) |
`opts?` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *[BaseCall](basecall.md)*

## Properties

###  cause

• **cause**: *string*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[cause](../interfaces/iwebrtccall.md#cause)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:24](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L24)*

___

###  causeCode

• **causeCode**: *number*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[causeCode](../interfaces/iwebrtccall.md#causecode)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:25](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L25)*

___

###  channels

• **channels**: *string[]* =  []

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[channels](../interfaces/iwebrtccall.md#channels)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:26](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L26)*

___

###  direction

• **direction**: *[Direction](../enums/direction.md)*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[direction](../interfaces/iwebrtccall.md#direction)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:21](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L21)*

___

###  extension

• **extension**: *string* =  null

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[extension](../interfaces/iwebrtccall.md#extension)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:28](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L28)*

___

###  id

• **id**: *string* = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[id](../interfaces/iwebrtccall.md#id)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:18](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L18)*

___

###  options

• **options**: *[CallOptions](../interfaces/calloptions.md)*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[options](../interfaces/iwebrtccall.md#options)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:23](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L23)*

___

###  peer

• **peer**: *[Peer](peer.md)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:22](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L22)*

___

###  prevState

• **prevState**: *string* = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[prevState](../interfaces/iwebrtccall.md#prevstate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:20](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L20)*

___

###  role

• **role**: *string* =  Role.Participant

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[role](../interfaces/iwebrtccall.md#role)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:27](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L27)*

___

###  state

• **state**: *string* =  State[State.New]

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[state](../interfaces/iwebrtccall.md#state)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:19](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L19)*

## Accessors

###  localStream

• **get localStream**(): *MediaStream*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:57](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L57)*

**Returns:** *MediaStream*

___

###  memberChannel

• **get memberChannel**(): *string*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:65](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L65)*

**Returns:** *string*

___

###  nodeId

• **get nodeId**(): *string*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:49](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L49)*

**Returns:** *string*

• **set nodeId**(`what`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:53](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L53)*

**Parameters:**

Name | Type |
------ | ------ |
`what` | string |

**Returns:** *void*

___

###  remoteStream

• **get remoteStream**(): *MediaStream*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:61](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L61)*

**Returns:** *MediaStream*

## Methods

###  _addChannel

▸ **_addChannel**(`channel`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:384](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L384)*

**Parameters:**

Name | Type |
------ | ------ |
`channel` | string |

**Returns:** *void*

___

###  answer

▸ **answer**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:75](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L75)*

**Returns:** *void*

___

###  deaf

▸ **deaf**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:236](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L236)*

**Returns:** *void*

___

###  dtmf

▸ **dtmf**(`dtmf`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:168](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L168)*

**Parameters:**

Name | Type |
------ | ------ |
`dtmf` | string |

**Returns:** *void*

___

###  handleConferenceUpdate

▸ **handleConferenceUpdate**(`packet`: any, `initialPvtData`: any): *Promise‹string›*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:276](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L276)*

**Parameters:**

Name | Type |
------ | ------ |
`msg` | any |

**Returns:** *void*

___

###  hangup

▸ **hangup**(`params`: any, `execute`: boolean): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:115](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L115)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`params` | any |  {} |
`execute` | boolean | true |

**Returns:** *void*

___

###  hold

▸ **hold**(): *any*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:147](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L147)*

**Returns:** *any*

___

###  invite

▸ **invite**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:69](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L69)*

**Returns:** *void*

___

###  message

▸ **message**(`to`: string, `body`: string): *void*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:179](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L179)*

**Returns:** *void*

___

###  muteVideo

▸ **muteVideo**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:207](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L207)*

**Returns:** *void*

___

###  playRingback

▸ **playRingback**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:99](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L99)*

**Returns:** *void*

___

###  playRingtone

▸ **playRingtone**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:83](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L83)*

**Returns:** *void*

___

###  replace

▸ **replace**(`replaceCallID`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:142](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L142)*

**Parameters:**

Name | Type |
------ | ------ |
`replaceCallID` | string |

**Returns:** *void*

___

###  setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): *Promise‹void›*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:191](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L191)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹void›*

___

###  setState

▸ **setState**(`state`: [State](../enums/state.md)): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:248](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L248)*

**Parameters:**

Name | Type |
------ | ------ |
`state` | [State](../enums/state.md) |

**Returns:** *void*

___

###  setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): *Promise‹void›*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:219](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L219)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹void›*

___

###  stopRingback

▸ **stopRingback**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:108](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L108)*

**Returns:** *void*

___

###  stopRingtone

▸ **stopRingtone**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:92](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L92)*

**Returns:** *void*

___

###  toggleAudioMute

▸ **toggleAudioMute**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:187](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L187)*

**Returns:** *void*

___

###  toggleDeaf

▸ **toggleDeaf**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:244](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L244)*

**Returns:** *void*

___

###  toggleHold

▸ **toggleHold**(): *any*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:161](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L161)*

**Returns:** *any*

___

###  toggleVideoMute

▸ **toggleVideoMute**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:215](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L215)*

**Returns:** *void*

___

###  transfer

▸ **transfer**(`destination`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:137](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L137)*

**Parameters:**

Name | Type |
------ | ------ |
`destination` | string |

**Returns:** *void*

___

###  undeaf

▸ **undeaf**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:240](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L240)*

**Returns:** *void*

___

###  unhold

▸ **unhold**(): *any*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:154](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L154)*

**Returns:** *any*

___

###  unmuteAudio

▸ **unmuteAudio**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:183](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L183)*

**Returns:** *void*

___

###  unmuteVideo

▸ **unmuteVideo**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:211](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L211)*

**Returns:** *void*

___

### `Static` setStateTelnyx

▸ **setStateTelnyx**(`call`: [Call](call.md)): *[Call](call.md)‹›*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:808](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/webrtc/BaseCall.ts#L808)*

**Parameters:**

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** *[Call](call.md)‹›*
