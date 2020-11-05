[@telnyx/webrtc - v2.1.5](../README.md) › [IWebRTCCall](iwebrtccall.md)

# Interface: IWebRTCCall

## Hierarchy

* **IWebRTCCall**

## Implemented by

* [BaseCall](../classes/basecall.md)
* [Call](../classes/call.md)
* [Call](../classes/call.md)

## Index

### Properties

* [_addChannel](iwebrtccall.md#_addchannel)
* [answer](iwebrtccall.md#answer)
* [cause](iwebrtccall.md#cause)
* [causeCode](iwebrtccall.md#causecode)
* [channels](iwebrtccall.md#channels)
* [deaf](iwebrtccall.md#deaf)
* [direction](iwebrtccall.md#direction)
* [dtmf](iwebrtccall.md#dtmf)
* [extension](iwebrtccall.md#extension)
* [handleConferenceUpdate](iwebrtccall.md#handleconferenceupdate)
* [handleMessage](iwebrtccall.md#handlemessage)
* [hangup](iwebrtccall.md#hangup)
* [hold](iwebrtccall.md#hold)
* [id](iwebrtccall.md#id)
* [invite](iwebrtccall.md#invite)
* [localStream](iwebrtccall.md#localstream)
* [message](iwebrtccall.md#message)
* [muteAudio](iwebrtccall.md#muteaudio)
* [muteVideo](iwebrtccall.md#mutevideo)
* [options](iwebrtccall.md#options)
* [prevState](iwebrtccall.md#prevstate)
* [remoteStream](iwebrtccall.md#remotestream)
* [replace](iwebrtccall.md#replace)
* [role](iwebrtccall.md#role)
* [setAudioInDevice](iwebrtccall.md#setaudioindevice)
* [setAudioOutDevice](iwebrtccall.md#optional-setaudiooutdevice)
* [setSpeakerPhone](iwebrtccall.md#optional-setspeakerphone)
* [setState](iwebrtccall.md#setstate)
* [setVideoDevice](iwebrtccall.md#setvideodevice)
* [startScreenShare](iwebrtccall.md#optional-startscreenshare)
* [state](iwebrtccall.md#state)
* [stopScreenShare](iwebrtccall.md#optional-stopscreenshare)
* [switchCamera](iwebrtccall.md#optional-switchcamera)
* [toggleAudioMute](iwebrtccall.md#toggleaudiomute)
* [toggleDeaf](iwebrtccall.md#toggledeaf)
* [toggleHold](iwebrtccall.md#togglehold)
* [toggleVideoMute](iwebrtccall.md#togglevideomute)
* [transfer](iwebrtccall.md#transfer)
* [undeaf](iwebrtccall.md#undeaf)
* [unhold](iwebrtccall.md#unhold)
* [unmuteAudio](iwebrtccall.md#unmuteaudio)
* [unmuteVideo](iwebrtccall.md#unmutevideo)

## Properties

###  _addChannel

• **_addChannel**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:72](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L72)*

#### Type declaration:

▸ (`laChannel`: any): *void*

**Parameters:**

Name | Type |
------ | ------ |
`laChannel` | any |

___

###  answer

• **answer**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:49](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L49)*

#### Type declaration:

▸ (): *void*

___

###  cause

• **cause**: *string*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:41](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L41)*

___

###  causeCode

• **causeCode**: *number*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:42](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L42)*

___

###  channels

• **channels**: *string[]*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:43](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L43)*

___

###  deaf

• **deaf**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:66](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L66)*

#### Type declaration:

▸ (): *void*

___

###  direction

• **direction**: *string*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:39](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L39)*

___

###  dtmf

• **dtmf**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:56](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L56)*

#### Type declaration:

▸ (`dtmf`: string): *void*

**Parameters:**

Name | Type |
------ | ------ |
`dtmf` | string |

___

###  extension

• **extension**: *string*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:45](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L45)*

___

###  handleConferenceUpdate

• **handleConferenceUpdate**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:73](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L73)*

#### Type declaration:

▸ (`packet`: any, `pvtData`: any): *Promise‹string›*

**Parameters:**

Name | Type |
------ | ------ |
`packet` | any |
`pvtData` | any |

___

###  handleMessage

• **handleMessage**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:71](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L71)*

#### Type declaration:

▸ (`msg`: any): *void*

**Parameters:**

Name | Type |
------ | ------ |
`msg` | any |

___

###  hangup

• **hangup**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:50](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L50)*

#### Type declaration:

▸ (`params`: any, `execute`: boolean): *void*

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |
`execute` | boolean |

___

###  hold

• **hold**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:53](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L53)*

#### Type declaration:

▸ (): *void*

___

###  id

• **id**: *string*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:36](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L36)*

___

###  invite

• **invite**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:48](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L48)*

#### Type declaration:

▸ (): *void*

___

###  localStream

• **localStream**: *MediaStream*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:46](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L46)*

___

###  message

• **message**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:57](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L57)*

#### Type declaration:

▸ (`to`: string, `body`: string): *void*

**Parameters:**

Name | Type |
------ | ------ |
`to` | string |
`body` | string |

___

###  muteAudio

• **muteAudio**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:58](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L58)*

#### Type declaration:

▸ (): *void*

___

###  muteVideo

• **muteVideo**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:62](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L62)*

#### Type declaration:

▸ (): *void*

___

###  options

• **options**: *[CallOptions](calloptions.md)*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:40](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L40)*

___

###  prevState

• **prevState**: *string*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:38](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L38)*

___

###  remoteStream

• **remoteStream**: *MediaStream*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:47](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L47)*

___

###  replace

• **replace**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:52](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L52)*

#### Type declaration:

▸ (`replaceCallID`: string): *void*

**Parameters:**

Name | Type |
------ | ------ |
`replaceCallID` | string |

___

###  role

• **role**: *string*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:44](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L44)*

___

###  setAudioInDevice

• **setAudioInDevice**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:61](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L61)*

#### Type declaration:

▸ (`deviceId`: string): *Promise‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

___

### `Optional` setAudioOutDevice

• **setAudioOutDevice**? : *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:77](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L77)*

#### Type declaration:

▸ (`deviceId`: string): *Promise‹boolean›*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

___

### `Optional` setSpeakerPhone

• **setSpeakerPhone**? : *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:80](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L80)*

#### Type declaration:

▸ (`flag`: boolean): *void*

**Parameters:**

Name | Type |
------ | ------ |
`flag` | boolean |

___

###  setState

• **setState**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:69](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L69)*

#### Type declaration:

▸ (`state`: any): *void*

**Parameters:**

Name | Type |
------ | ------ |
`state` | any |

___

###  setVideoDevice

• **setVideoDevice**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:65](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L65)*

#### Type declaration:

▸ (`deviceId`: string): *Promise‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

___

### `Optional` startScreenShare

• **startScreenShare**? : *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:75](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L75)*

#### Type declaration:

▸ (`opts?`: object): *Promise‹[IWebRTCCall](iwebrtccall.md)›*

**Parameters:**

Name | Type |
------ | ------ |
`opts?` | object |

___

###  state

• **state**: *string*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:37](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L37)*

___

### `Optional` stopScreenShare

• **stopScreenShare**? : *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:76](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L76)*

#### Type declaration:

▸ (): *void*

___

### `Optional` switchCamera

• **switchCamera**? : *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:79](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L79)*

#### Type declaration:

▸ (): *void*

___

###  toggleAudioMute

• **toggleAudioMute**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:60](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L60)*

#### Type declaration:

▸ (): *void*

___

###  toggleDeaf

• **toggleDeaf**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:68](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L68)*

#### Type declaration:

▸ (): *void*

___

###  toggleHold

• **toggleHold**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:55](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L55)*

#### Type declaration:

▸ (): *void*

___

###  toggleVideoMute

• **toggleVideoMute**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:64](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L64)*

#### Type declaration:

▸ (): *void*

___

###  transfer

• **transfer**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:51](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L51)*

#### Type declaration:

▸ (`destination`: string): *void*

**Parameters:**

Name | Type |
------ | ------ |
`destination` | string |

___

###  undeaf

• **undeaf**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:67](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L67)*

#### Type declaration:

▸ (): *void*

___

###  unhold

• **unhold**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:54](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L54)*

#### Type declaration:

▸ (): *void*

___

###  unmuteAudio

• **unmuteAudio**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:59](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L59)*

#### Type declaration:

▸ (): *void*

___

###  unmuteVideo

• **unmuteVideo**: *function*

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:63](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L63)*

#### Type declaration:

▸ (): *void*
