**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / MediaStreamMock

# Class: MediaStreamMock

## Hierarchy

* **MediaStreamMock**

## Implements

* MediaStream

## Index

### Properties

* [\_tracks](mediastreammock.md#_tracks)
* [active](mediastreammock.md#active)
* [id](mediastreammock.md#id)
* [onactive](mediastreammock.md#onactive)
* [onaddtrack](mediastreammock.md#onaddtrack)
* [oninactive](mediastreammock.md#oninactive)
* [onremovetrack](mediastreammock.md#onremovetrack)

### Methods

* [addEventListener](mediastreammock.md#addeventlistener)
* [addTrack](mediastreammock.md#addtrack)
* [clone](mediastreammock.md#clone)
* [dispatchEvent](mediastreammock.md#dispatchevent)
* [getAudioTracks](mediastreammock.md#getaudiotracks)
* [getTrackById](mediastreammock.md#gettrackbyid)
* [getTracks](mediastreammock.md#gettracks)
* [getVideoTracks](mediastreammock.md#getvideotracks)
* [removeEventListener](mediastreammock.md#removeeventlistener)
* [removeTrack](mediastreammock.md#removetrack)
* [stop](mediastreammock.md#stop)

## Properties

### \_tracks

•  **\_tracks**: MediaStreamTrack[] = []

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:4](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L4)*

___

### active

•  **active**: boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:5](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L5)*

___

### id

•  **id**: string

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:6](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L6)*

___

### onactive

•  **onactive**: (this: MediaStream, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:8](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L8)*

___

### onaddtrack

•  **onaddtrack**: (this: MediaStream, ev: MediaStreamTrackEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:10](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L10)*

___

### oninactive

•  **oninactive**: (this: MediaStream, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:12](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L12)*

___

### onremovetrack

•  **onremovetrack**: (this: MediaStream, ev: MediaStreamTrackEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:14](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L14)*

## Methods

### addEventListener

▸ **addEventListener**(`type`: any, `listener`: any, `options?`: any): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:36](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L36)*

#### Parameters:

Name | Type |
------ | ------ |
`type` | any |
`listener` | any |
`options?` | any |

**Returns:** void

___

### addTrack

▸ **addTrack**(`track`: MediaStreamTrack): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:16](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L16)*

#### Parameters:

Name | Type |
------ | ------ |
`track` | MediaStreamTrack |

**Returns:** void

___

### clone

▸ **clone**(): MediaStream

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:20](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L20)*

**Returns:** MediaStream

___

### dispatchEvent

▸ **dispatchEvent**(`event`: Event): boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L44)*

#### Parameters:

Name | Type |
------ | ------ |
`event` | Event |

**Returns:** boolean

___

### getAudioTracks

▸ **getAudioTracks**(): MediaStreamTrack[]

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:56](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L56)*

**Returns:** MediaStreamTrack[]

___

### getTrackById

▸ **getTrackById**(`trackId`: any): MediaStreamTrack

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:24](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L24)*

#### Parameters:

Name | Type |
------ | ------ |
`trackId` | any |

**Returns:** MediaStreamTrack

___

### getTracks

▸ **getTracks**(): MediaStreamTrack[]

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L48)*

**Returns:** MediaStreamTrack[]

___

### getVideoTracks

▸ **getVideoTracks**(): MediaStreamTrack[]

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L52)*

**Returns:** MediaStreamTrack[]

___

### removeEventListener

▸ **removeEventListener**(`type`: any, `listener`: any, `options?`: any): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:40](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L40)*

#### Parameters:

Name | Type |
------ | ------ |
`type` | any |
`listener` | any |
`options?` | any |

**Returns:** void

___

### removeTrack

▸ **removeTrack**(`track`: any): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:28](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L28)*

#### Parameters:

Name | Type |
------ | ------ |
`track` | any |

**Returns:** void

___

### stop

▸ **stop**(): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L32)*

**Returns:** void
