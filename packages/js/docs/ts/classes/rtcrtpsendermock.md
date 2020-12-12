**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / RTCRtpSenderMock

# Class: RTCRtpSenderMock

## Hierarchy

* **RTCRtpSenderMock**

## Implements

* RTCRtpSender

## Index

### Properties

* [dtmf](rtcrtpsendermock.md#dtmf)
* [rtcpTransport](rtcrtpsendermock.md#rtcptransport)
* [track](rtcrtpsendermock.md#track)
* [transport](rtcrtpsendermock.md#transport)

### Methods

* [getParameters](rtcrtpsendermock.md#getparameters)
* [getStats](rtcrtpsendermock.md#getstats)
* [replaceTrack](rtcrtpsendermock.md#replacetrack)
* [setParameters](rtcrtpsendermock.md#setparameters)
* [setStreams](rtcrtpsendermock.md#setstreams)

## Properties

### dtmf

•  **dtmf**: RTCDTMFSender

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:116](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L116)*

___

### rtcpTransport

•  **rtcpTransport**: RTCDtlsTransport

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:117](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L117)*

___

### track

•  **track**: MediaStreamTrack

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:118](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L118)*

___

### transport

•  **transport**: RTCDtlsTransport

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:119](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L119)*

## Methods

### getParameters

▸ **getParameters**(): RTCRtpSendParameters

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:120](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L120)*

**Returns:** RTCRtpSendParameters

▸ **getParameters**(): RTCRtpParameters

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:121](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L121)*

**Returns:** RTCRtpParameters

___

### getStats

▸ **getStats**(): Promise<RTCStatsReport\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:125](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L125)*

**Returns:** Promise<RTCStatsReport\>

___

### replaceTrack

▸ **replaceTrack**(`withTrack`: MediaStreamTrack): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:128](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L128)*

#### Parameters:

Name | Type |
------ | ------ |
`withTrack` | MediaStreamTrack |

**Returns:** Promise<void\>

▸ **replaceTrack**(`withTrack`: MediaStreamTrack): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:129](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L129)*

#### Parameters:

Name | Type |
------ | ------ |
`withTrack` | MediaStreamTrack |

**Returns:** Promise<void\>

___

### setParameters

▸ **setParameters**(`parameters`: RTCRtpSendParameters): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:133](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L133)*

#### Parameters:

Name | Type |
------ | ------ |
`parameters` | RTCRtpSendParameters |

**Returns:** Promise<void\>

▸ **setParameters**(`parameters?`: RTCRtpParameters): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:134](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L134)*

#### Parameters:

Name | Type |
------ | ------ |
`parameters?` | RTCRtpParameters |

**Returns:** Promise<void\>

___

### setStreams

▸ **setStreams**(...`streams`: MediaStream[]): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:138](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L138)*

#### Parameters:

Name | Type |
------ | ------ |
`...streams` | MediaStream[] |

**Returns:** void
