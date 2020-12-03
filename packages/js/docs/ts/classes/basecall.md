[@telnyx/webrtc - v2.5.1](../README.md) › [BaseCall](basecall.md)

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:90](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L90)*

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

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:56](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L56)*

___

###  causeCode

• **causeCode**: *number*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[causeCode](../interfaces/iwebrtccall.md#causecode)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:58](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L58)*

___

###  channels

• **channels**: *string[]* =  []

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[channels](../interfaces/iwebrtccall.md#channels)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:66](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L66)*

___

###  direction

• **direction**: *[Direction](../enums/direction.md)*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[direction](../interfaces/iwebrtccall.md#direction)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:50](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L50)*

___

###  extension

• **extension**: *string* =  null

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[extension](../interfaces/iwebrtccall.md#extension)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:70](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L70)*

___

###  id

• **id**: *string* = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[id](../interfaces/iwebrtccall.md#id)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L44)*

___

###  options

• **options**: *[CallOptions](../interfaces/calloptions.md)*

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[options](../interfaces/iwebrtccall.md#options)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L54)*

___

###  peer

• **peer**: *[Peer](peer.md)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L52)*

___

###  prevState

• **prevState**: *string* = ""

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[prevState](../interfaces/iwebrtccall.md#prevstate)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L48)*

___

###  role

• **role**: *string* =  Role.Participant

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[role](../interfaces/iwebrtccall.md#role)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:68](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L68)*

___

###  sipCallId

• **sipCallId**: *string*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:64](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L64)*

___

###  sipCode

• **sipCode**: *number*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:62](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L62)*

___

###  sipReason

• **sipReason**: *string*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:60](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L60)*

___

###  state

• **state**: *string* =  State[State.New]

*Implementation of [IWebRTCCall](../interfaces/iwebrtccall.md).[state](../interfaces/iwebrtccall.md#state)*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L46)*

## Accessors

###  localStream

• **get localStream**(): *MediaStream*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:138](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L138)*

**Returns:** *MediaStream*

___

###  memberChannel

• **get memberChannel**(): *string*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:146](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L146)*

**Returns:** *string*

___

###  nodeId

• **get nodeId**(): *string*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:130](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L130)*

**Returns:** *string*

• **set nodeId**(`what`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:134](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L134)*

**Parameters:**

Name | Type |
------ | ------ |
`what` | string |

**Returns:** *void*

___

###  remoteStream

• **get remoteStream**(): *MediaStream*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:142](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L142)*

**Returns:** *MediaStream*

## Methods

###  _addChannel

▸ **_addChannel**(`channel`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:581](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L581)*

**Parameters:**

Name | Type |
------ | ------ |
`channel` | string |

**Returns:** *void*

___

###  answer

▸ **answer**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:156](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L156)*

**Returns:** *void*

___

###  deaf

▸ **deaf**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:364](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L364)*

**Returns:** *void*

___

###  dtmf

▸ **dtmf**(`dtmf`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:280](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L280)*

**Parameters:**

Name | Type |
------ | ------ |
`dtmf` | string |

**Returns:** *void*

___

###  handleConferenceUpdate

▸ **handleConferenceUpdate**(`packet`: any, `initialPvtData`: any): *Promise‹string›*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:486](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L486)*

**Parameters:**

Name | Type |
------ | ------ |
`packet` | any |
`initialPvtData` | any |

**Returns:** *Promise‹string›*

___

###  handleMessage

▸ **handleMessage**(`msg`: any): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:410](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L410)*

**Parameters:**

Name | Type |
------ | ------ |
`msg` | any |

**Returns:** *void*

___

###  hangup

▸ **hangup**(`params`: any, `execute`: boolean): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:196](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L196)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`params` | any |  {} |
`execute` | boolean | true |

**Returns:** *void*

___

###  hold

▸ **hold**(): *any*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:247](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L247)*

**Returns:** *any*

___

###  invite

▸ **invite**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:150](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L150)*

**Returns:** *void*

___

###  message

▸ **message**(`to`: string, `body`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:289](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L289)*

**Parameters:**

Name | Type |
------ | ------ |
`to` | string |
`body` | string |

**Returns:** *void*

___

###  muteAudio

▸ **muteAudio**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:299](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L299)*

**Returns:** *void*

___

###  muteVideo

▸ **muteVideo**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:331](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L331)*

**Returns:** *void*

___

###  playRingback

▸ **playRingback**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:180](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L180)*

**Returns:** *void*

___

###  playRingtone

▸ **playRingtone**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:164](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L164)*

**Returns:** *void*

___

###  replace

▸ **replace**(`replaceCallID`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:237](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L237)*

**Parameters:**

Name | Type |
------ | ------ |
`replaceCallID` | string |

**Returns:** *void*

___

###  setAudioInDevice

▸ **setAudioInDevice**(`deviceId`: string): *Promise‹void›*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:311](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L311)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹void›*

___

###  setState

▸ **setState**(`state`: [State](../enums/state.md)): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:376](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L376)*

**Parameters:**

Name | Type |
------ | ------ |
`state` | [State](../enums/state.md) |

**Returns:** *void*

___

###  setVideoDevice

▸ **setVideoDevice**(`deviceId`: string): *Promise‹void›*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:343](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L343)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹void›*

___

###  stopRingback

▸ **stopRingback**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:189](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L189)*

**Returns:** *void*

___

###  stopRingtone

▸ **stopRingtone**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:173](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L173)*

**Returns:** *void*

___

###  toggleAudioMute

▸ **toggleAudioMute**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:307](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L307)*

**Returns:** *void*

___

###  toggleDeaf

▸ **toggleDeaf**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:372](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L372)*

**Returns:** *void*

___

###  toggleHold

▸ **toggleHold**(): *any*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:269](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L269)*

**Returns:** *any*

___

###  toggleVideoMute

▸ **toggleVideoMute**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:339](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L339)*

**Returns:** *void*

___

###  transfer

▸ **transfer**(`destination`: string): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:227](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L227)*

**Parameters:**

Name | Type |
------ | ------ |
`destination` | string |

**Returns:** *void*

___

###  undeaf

▸ **undeaf**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:368](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L368)*

**Returns:** *void*

___

###  unhold

▸ **unhold**(): *any*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:258](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L258)*

**Returns:** *any*

___

###  unmuteAudio

▸ **unmuteAudio**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:303](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L303)*

**Returns:** *void*

___

###  unmuteVideo

▸ **unmuteVideo**(): *void*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:335](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L335)*

**Returns:** *void*

___

### `Static` setStateTelnyx

▸ **setStateTelnyx**(`call`: [Call](call.md)): *[Call](call.md)‹›*

*Defined in [src/Modules/Verto/webrtc/BaseCall.ts:1085](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/BaseCall.ts#L1085)*

**Parameters:**

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** *[Call](call.md)‹›*
