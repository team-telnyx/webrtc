**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / RTCPeerConnectionMock

# Class: RTCPeerConnectionMock

## Hierarchy

* **RTCPeerConnectionMock**

## Implements

* RTCPeerConnection

## Index

### Properties

* [canTrickleIceCandidates](rtcpeerconnectionmock.md#cantrickleicecandidates)
* [connectionState](rtcpeerconnectionmock.md#connectionstate)
* [currentLocalDescription](rtcpeerconnectionmock.md#currentlocaldescription)
* [currentRemoteDescription](rtcpeerconnectionmock.md#currentremotedescription)
* [iceConnectionState](rtcpeerconnectionmock.md#iceconnectionstate)
* [iceGatheringState](rtcpeerconnectionmock.md#icegatheringstate)
* [idpErrorInfo](rtcpeerconnectionmock.md#idperrorinfo)
* [idpLoginUrl](rtcpeerconnectionmock.md#idploginurl)
* [localDescription](rtcpeerconnectionmock.md#localdescription)
* [onconnectionstatechange](rtcpeerconnectionmock.md#onconnectionstatechange)
* [ondatachannel](rtcpeerconnectionmock.md#ondatachannel)
* [onicecandidate](rtcpeerconnectionmock.md#onicecandidate)
* [onicecandidateerror](rtcpeerconnectionmock.md#onicecandidateerror)
* [oniceconnectionstatechange](rtcpeerconnectionmock.md#oniceconnectionstatechange)
* [onicegatheringstatechange](rtcpeerconnectionmock.md#onicegatheringstatechange)
* [onnegotiationneeded](rtcpeerconnectionmock.md#onnegotiationneeded)
* [onsignalingstatechange](rtcpeerconnectionmock.md#onsignalingstatechange)
* [onstatsended](rtcpeerconnectionmock.md#onstatsended)
* [ontrack](rtcpeerconnectionmock.md#ontrack)
* [peerIdentity](rtcpeerconnectionmock.md#peeridentity)
* [pendingLocalDescription](rtcpeerconnectionmock.md#pendinglocaldescription)
* [pendingRemoteDescription](rtcpeerconnectionmock.md#pendingremotedescription)
* [remoteDescription](rtcpeerconnectionmock.md#remotedescription)
* [sctp](rtcpeerconnectionmock.md#sctp)
* [signalingState](rtcpeerconnectionmock.md#signalingstate)

### Methods

* [addEventListener](rtcpeerconnectionmock.md#addeventlistener)
* [addIceCandidate](rtcpeerconnectionmock.md#addicecandidate)
* [addTrack](rtcpeerconnectionmock.md#addtrack)
* [addTransceiver](rtcpeerconnectionmock.md#addtransceiver)
* [close](rtcpeerconnectionmock.md#close)
* [createAnswer](rtcpeerconnectionmock.md#createanswer)
* [createDataChannel](rtcpeerconnectionmock.md#createdatachannel)
* [createOffer](rtcpeerconnectionmock.md#createoffer)
* [dispatchEvent](rtcpeerconnectionmock.md#dispatchevent)
* [getConfiguration](rtcpeerconnectionmock.md#getconfiguration)
* [getIdentityAssertion](rtcpeerconnectionmock.md#getidentityassertion)
* [getReceivers](rtcpeerconnectionmock.md#getreceivers)
* [getSenders](rtcpeerconnectionmock.md#getsenders)
* [getStats](rtcpeerconnectionmock.md#getstats)
* [getTransceivers](rtcpeerconnectionmock.md#gettransceivers)
* [removeEventListener](rtcpeerconnectionmock.md#removeeventlistener)
* [removeTrack](rtcpeerconnectionmock.md#removetrack)
* [setConfiguration](rtcpeerconnectionmock.md#setconfiguration)
* [setIdentityProvider](rtcpeerconnectionmock.md#setidentityprovider)
* [setLocalDescription](rtcpeerconnectionmock.md#setlocaldescription)
* [setRemoteDescription](rtcpeerconnectionmock.md#setremotedescription)

## Properties

### canTrickleIceCandidates

•  **canTrickleIceCandidates**: boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:144](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L144)*

___

### connectionState

•  **connectionState**: RTCPeerConnectionState

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:145](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L145)*

___

### currentLocalDescription

•  **currentLocalDescription**: RTCSessionDescription

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:146](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L146)*

___

### currentRemoteDescription

•  **currentRemoteDescription**: RTCSessionDescription

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:147](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L147)*

___

### iceConnectionState

•  **iceConnectionState**: RTCIceConnectionState

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:148](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L148)*

___

### iceGatheringState

•  **iceGatheringState**: RTCIceGatheringState

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:149](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L149)*

___

### idpErrorInfo

•  **idpErrorInfo**: string

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:150](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L150)*

___

### idpLoginUrl

•  **idpLoginUrl**: string

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:151](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L151)*

___

### localDescription

•  **localDescription**: RTCSessionDescription

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:152](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L152)*

___

### onconnectionstatechange

•  **onconnectionstatechange**: (this: RTCPeerConnection, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:153](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L153)*

___

### ondatachannel

•  **ondatachannel**: (this: RTCPeerConnection, ev: RTCDataChannelEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:154](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L154)*

___

### onicecandidate

•  **onicecandidate**: (this: RTCPeerConnection, ev: RTCPeerConnectionIceEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:155](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L155)*

___

### onicecandidateerror

•  **onicecandidateerror**: (this: RTCPeerConnection, ev: RTCPeerConnectionIceErrorEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:159](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L159)*

___

### oniceconnectionstatechange

•  **oniceconnectionstatechange**: (this: RTCPeerConnection, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:163](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L163)*

___

### onicegatheringstatechange

•  **onicegatheringstatechange**: (this: RTCPeerConnection, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:164](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L164)*

___

### onnegotiationneeded

•  **onnegotiationneeded**: (this: RTCPeerConnection, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:165](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L165)*

___

### onsignalingstatechange

•  **onsignalingstatechange**: (this: RTCPeerConnection, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:166](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L166)*

___

### onstatsended

•  **onstatsended**: (this: RTCPeerConnection, ev: RTCStatsEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:167](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L167)*

___

### ontrack

•  **ontrack**: (this: RTCPeerConnection, ev: RTCTrackEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:168](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L168)*

___

### peerIdentity

•  **peerIdentity**: Promise<RTCIdentityAssertion\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:169](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L169)*

___

### pendingLocalDescription

•  **pendingLocalDescription**: RTCSessionDescription

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:170](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L170)*

___

### pendingRemoteDescription

•  **pendingRemoteDescription**: RTCSessionDescription

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:171](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L171)*

___

### remoteDescription

•  **remoteDescription**: RTCSessionDescription

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:172](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L172)*

___

### sctp

•  **sctp**: RTCSctpTransport

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:173](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L173)*

___

### signalingState

•  **signalingState**: RTCSignalingState

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:174](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L174)*

## Methods

### addEventListener

▸ **addEventListener**<K\>(`type`: K, `listener`: (this: RTCPeerConnection, ev: RTCPeerConnectionEventMap[K]) => void, `options?`: boolean \| AddEventListenerOptions): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:306](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L306)*

#### Type parameters:

Name | Type |
------ | ------ |
`K` | \"connectionstatechange\" \| \"datachannel\" \| \"icecandidate\" \| \"icecandidateerror\" \| \"iceconnectionstatechange\" \| \"icegatheringstatechange\" \| \"negotiationneeded\" \| \"signalingstatechange\" \| \"statsended\" \| \"track\" |

#### Parameters:

Name | Type |
------ | ------ |
`type` | K |
`listener` | (this: RTCPeerConnection, ev: RTCPeerConnectionEventMap[K]) => void |
`options?` | boolean \| AddEventListenerOptions |

**Returns:** void

▸ **addEventListener**(`type`: string, `listener`: EventListenerOrEventListenerObject, `options?`: boolean \| AddEventListenerOptions): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:326](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L326)*

#### Parameters:

Name | Type |
------ | ------ |
`type` | string |
`listener` | EventListenerOrEventListenerObject |
`options?` | boolean \| AddEventListenerOptions |

**Returns:** void

___

### addIceCandidate

▸ **addIceCandidate**(`candidate?`: RTCIceCandidateInit \| RTCIceCandidate): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:178](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L178)*

#### Parameters:

Name | Type |
------ | ------ |
`candidate?` | RTCIceCandidateInit \| RTCIceCandidate |

**Returns:** Promise<void\>

___

### addTrack

▸ **addTrack**(`track`: MediaStreamTrack, ...`streams`: MediaStream[]): RTCRtpSender

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:183](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L183)*

#### Parameters:

Name | Type |
------ | ------ |
`track` | MediaStreamTrack |
`...streams` | MediaStream[] |

**Returns:** RTCRtpSender

___

### addTransceiver

▸ **addTransceiver**(`trackOrKind`: string \| MediaStreamTrack, `init?`: RTCRtpTransceiverInit): RTCRtpTransceiver

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:187](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L187)*

#### Parameters:

Name | Type |
------ | ------ |
`trackOrKind` | string \| MediaStreamTrack |
`init?` | RTCRtpTransceiverInit |

**Returns:** RTCRtpTransceiver

___

### close

▸ **close**(): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:193](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L193)*

**Returns:** void

___

### createAnswer

▸ **createAnswer**(`options?`: RTCOfferOptions): Promise<RTCSessionDescriptionInit\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:196](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L196)*

#### Parameters:

Name | Type |
------ | ------ |
`options?` | RTCOfferOptions |

**Returns:** Promise<RTCSessionDescriptionInit\>

▸ **createAnswer**(`options?`: RTCAnswerOptions): Promise<RTCSessionDescriptionInit\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:197](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L197)*

#### Parameters:

Name | Type |
------ | ------ |
`options?` | RTCAnswerOptions |

**Returns:** Promise<RTCSessionDescriptionInit\>

▸ **createAnswer**(`successCallback`: RTCSessionDescriptionCallback, `failureCallback`: RTCPeerConnectionErrorCallback): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:198](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L198)*

#### Parameters:

Name | Type |
------ | ------ |
`successCallback` | RTCSessionDescriptionCallback |
`failureCallback` | RTCPeerConnectionErrorCallback |

**Returns:** Promise<void\>

___

### createDataChannel

▸ **createDataChannel**(`label`: string, `dataChannelDict?`: RTCDataChannelInit): RTCDataChannel

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:208](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L208)*

#### Parameters:

Name | Type |
------ | ------ |
`label` | string |
`dataChannelDict?` | RTCDataChannelInit |

**Returns:** RTCDataChannel

▸ **createDataChannel**(`label`: string, `dataChannelDict?`: RTCDataChannelInit): RTCDataChannel

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:212](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L212)*

#### Parameters:

Name | Type |
------ | ------ |
`label` | string |
`dataChannelDict?` | RTCDataChannelInit |

**Returns:** RTCDataChannel

___

### createOffer

▸ **createOffer**(`options?`: RTCOfferOptions): Promise<RTCSessionDescriptionInit\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:219](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L219)*

#### Parameters:

Name | Type |
------ | ------ |
`options?` | RTCOfferOptions |

**Returns:** Promise<RTCSessionDescriptionInit\>

▸ **createOffer**(`options?`: RTCOfferOptions): Promise<RTCSessionDescriptionInit\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:220](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L220)*

#### Parameters:

Name | Type |
------ | ------ |
`options?` | RTCOfferOptions |

**Returns:** Promise<RTCSessionDescriptionInit\>

▸ **createOffer**(`successCallback`: RTCSessionDescriptionCallback, `failureCallback`: RTCPeerConnectionErrorCallback, `options?`: RTCOfferOptions): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:221](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L221)*

#### Parameters:

Name | Type |
------ | ------ |
`successCallback` | RTCSessionDescriptionCallback |
`failureCallback` | RTCPeerConnectionErrorCallback |
`options?` | RTCOfferOptions |

**Returns:** Promise<void\>

___

### dispatchEvent

▸ **dispatchEvent**(`event`: Event): boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:362](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L362)*

#### Parameters:

Name | Type |
------ | ------ |
`event` | Event |

**Returns:** boolean

___

### getConfiguration

▸ **getConfiguration**(): RTCConfiguration

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:233](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L233)*

**Returns:** RTCConfiguration

___

### getIdentityAssertion

▸ **getIdentityAssertion**(): Promise<string\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:236](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L236)*

**Returns:** Promise<string\>

___

### getReceivers

▸ **getReceivers**(): RTCRtpReceiver[]

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:239](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L239)*

**Returns:** RTCRtpReceiver[]

___

### getSenders

▸ **getSenders**(): RTCRtpSender[]

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:242](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L242)*

**Returns:** RTCRtpSender[]

___

### getStats

▸ **getStats**(`selector?`: MediaStreamTrack): Promise<RTCStatsReport\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:245](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L245)*

#### Parameters:

Name | Type |
------ | ------ |
`selector?` | MediaStreamTrack |

**Returns:** Promise<RTCStatsReport\>

▸ **getStats**(`selector?`: MediaStreamTrack): Promise<RTCStatsReport\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:246](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L246)*

#### Parameters:

Name | Type |
------ | ------ |
`selector?` | MediaStreamTrack |

**Returns:** Promise<RTCStatsReport\>

▸ **getStats**(`selector`: MediaStreamTrack, `successCallback`: RTCStatsCallback, `failureCallback`: RTCPeerConnectionErrorCallback): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:247](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L247)*

#### Parameters:

Name | Type |
------ | ------ |
`selector` | MediaStreamTrack |
`successCallback` | RTCStatsCallback |
`failureCallback` | RTCPeerConnectionErrorCallback |

**Returns:** Promise<void\>

___

### getTransceivers

▸ **getTransceivers**(): RTCRtpTransceiver[]

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:259](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L259)*

**Returns:** RTCRtpTransceiver[]

___

### removeEventListener

▸ **removeEventListener**<K\>(`type`: K, `listener`: (this: RTCPeerConnection, ev: RTCPeerConnectionEventMap[K]) => void, `options?`: boolean \| EventListenerOptions): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:334](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L334)*

#### Type parameters:

Name | Type |
------ | ------ |
`K` | \"connectionstatechange\" \| \"datachannel\" \| \"icecandidate\" \| \"icecandidateerror\" \| \"iceconnectionstatechange\" \| \"icegatheringstatechange\" \| \"negotiationneeded\" \| \"signalingstatechange\" \| \"statsended\" \| \"track\" |

#### Parameters:

Name | Type |
------ | ------ |
`type` | K |
`listener` | (this: RTCPeerConnection, ev: RTCPeerConnectionEventMap[K]) => void |
`options?` | boolean \| EventListenerOptions |

**Returns:** void

▸ **removeEventListener**(`type`: string, `listener`: EventListenerOrEventListenerObject, `options?`: boolean \| EventListenerOptions): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:354](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L354)*

#### Parameters:

Name | Type |
------ | ------ |
`type` | string |
`listener` | EventListenerOrEventListenerObject |
`options?` | boolean \| EventListenerOptions |

**Returns:** void

___

### removeTrack

▸ **removeTrack**(`sender`: RTCRtpSender): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:262](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L262)*

#### Parameters:

Name | Type |
------ | ------ |
`sender` | RTCRtpSender |

**Returns:** void

▸ **removeTrack**(`sender`: RTCRtpSender): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:263](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L263)*

#### Parameters:

Name | Type |
------ | ------ |
`sender` | RTCRtpSender |

**Returns:** void

___

### setConfiguration

▸ **setConfiguration**(`configuration`: RTCConfiguration): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:267](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L267)*

#### Parameters:

Name | Type |
------ | ------ |
`configuration` | RTCConfiguration |

**Returns:** void

▸ **setConfiguration**(`configuration`: RTCConfiguration): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:268](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L268)*

#### Parameters:

Name | Type |
------ | ------ |
`configuration` | RTCConfiguration |

**Returns:** void

___

### setIdentityProvider

▸ **setIdentityProvider**(`provider`: string, `options?`: RTCIdentityProviderOptions): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:272](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L272)*

#### Parameters:

Name | Type |
------ | ------ |
`provider` | string |
`options?` | RTCIdentityProviderOptions |

**Returns:** void

___

### setLocalDescription

▸ **setLocalDescription**(`description`: RTCSessionDescriptionInit): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:278](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L278)*

#### Parameters:

Name | Type |
------ | ------ |
`description` | RTCSessionDescriptionInit |

**Returns:** Promise<void\>

▸ **setLocalDescription**(`description`: RTCSessionDescriptionInit): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:279](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L279)*

#### Parameters:

Name | Type |
------ | ------ |
`description` | RTCSessionDescriptionInit |

**Returns:** Promise<void\>

▸ **setLocalDescription**(`description`: RTCSessionDescriptionInit, `successCallback`: () => void, `failureCallback`: RTCPeerConnectionErrorCallback): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:280](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L280)*

#### Parameters:

Name | Type |
------ | ------ |
`description` | RTCSessionDescriptionInit |
`successCallback` | () => void |
`failureCallback` | RTCPeerConnectionErrorCallback |

**Returns:** Promise<void\>

___

### setRemoteDescription

▸ **setRemoteDescription**(`description`: RTCSessionDescriptionInit): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:292](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L292)*

#### Parameters:

Name | Type |
------ | ------ |
`description` | RTCSessionDescriptionInit |

**Returns:** Promise<void\>

▸ **setRemoteDescription**(`description`: RTCSessionDescriptionInit): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:293](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L293)*

#### Parameters:

Name | Type |
------ | ------ |
`description` | RTCSessionDescriptionInit |

**Returns:** Promise<void\>

▸ **setRemoteDescription**(`description`: RTCSessionDescriptionInit, `successCallback`: () => void, `failureCallback`: RTCPeerConnectionErrorCallback): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:294](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L294)*

#### Parameters:

Name | Type |
------ | ------ |
`description` | RTCSessionDescriptionInit |
`successCallback` | () => void |
`failureCallback` | RTCPeerConnectionErrorCallback |

**Returns:** Promise<void\>
