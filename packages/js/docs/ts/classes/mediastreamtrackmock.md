**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / MediaStreamTrackMock

# Class: MediaStreamTrackMock

## Hierarchy

* **MediaStreamTrackMock**

## Implements

* MediaStreamTrack

## Index

### Properties

* [enabled](mediastreamtrackmock.md#enabled)
* [id](mediastreamtrackmock.md#id)
* [isolated](mediastreamtrackmock.md#isolated)
* [kind](mediastreamtrackmock.md#kind)
* [label](mediastreamtrackmock.md#label)
* [muted](mediastreamtrackmock.md#muted)
* [onended](mediastreamtrackmock.md#onended)
* [onisolationchange](mediastreamtrackmock.md#onisolationchange)
* [onmute](mediastreamtrackmock.md#onmute)
* [onoverconstrained](mediastreamtrackmock.md#onoverconstrained)
* [onunmute](mediastreamtrackmock.md#onunmute)
* [readonly](mediastreamtrackmock.md#readonly)
* [readyState](mediastreamtrackmock.md#readystate)
* [remote](mediastreamtrackmock.md#remote)

### Methods

* [addEventListener](mediastreamtrackmock.md#addeventlistener)
* [applyConstraints](mediastreamtrackmock.md#applyconstraints)
* [clone](mediastreamtrackmock.md#clone)
* [dispatchEvent](mediastreamtrackmock.md#dispatchevent)
* [getCapabilities](mediastreamtrackmock.md#getcapabilities)
* [getConstraints](mediastreamtrackmock.md#getconstraints)
* [getSettings](mediastreamtrackmock.md#getsettings)
* [removeEventListener](mediastreamtrackmock.md#removeeventlistener)
* [stop](mediastreamtrackmock.md#stop)

## Properties

### enabled

•  **enabled**: boolean = true

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:62](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L62)*

___

### id

•  **id**: string = uuidv4()

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:63](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L63)*

___

### isolated

•  **isolated**: boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:64](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L64)*

___

### kind

•  **kind**: string

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:65](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L65)*

___

### label

•  **label**: string = "Track Label"

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:66](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L66)*

___

### muted

•  **muted**: boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:67](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L67)*

___

### onended

•  **onended**: (this: MediaStreamTrack, ev: MediaStreamErrorEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:71](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L71)*

___

### onisolationchange

•  **onisolationchange**: (this: MediaStreamTrack, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:72](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L72)*

___

### onmute

•  **onmute**: (this: MediaStreamTrack, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:73](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L73)*

___

### onoverconstrained

•  **onoverconstrained**: (this: MediaStreamTrack, ev: MediaStreamErrorEvent) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:74](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L74)*

___

### onunmute

•  **onunmute**: (this: MediaStreamTrack, ev: Event) => any

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:75](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L75)*

___

### readonly

•  **readonly**: boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:68](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L68)*

___

### readyState

•  **readyState**: MediaStreamTrackState

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:69](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L69)*

___

### remote

•  **remote**: boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:70](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L70)*

## Methods

### addEventListener

▸ **addEventListener**(`type`: any, `listener`: any, `options?`: any): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:102](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L102)*

#### Parameters:

Name | Type |
------ | ------ |
`type` | any |
`listener` | any |
`options?` | any |

**Returns:** void

___

### applyConstraints

▸ **applyConstraints**(`constraints`: any): Promise<void\>

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:77](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L77)*

#### Parameters:

Name | Type |
------ | ------ |
`constraints` | any |

**Returns:** Promise<void\>

___

### clone

▸ **clone**(): MediaStreamTrack

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:81](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L81)*

**Returns:** MediaStreamTrack

___

### dispatchEvent

▸ **dispatchEvent**(`event`: Event): boolean

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:110](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L110)*

#### Parameters:

Name | Type |
------ | ------ |
`event` | Event |

**Returns:** boolean

___

### getCapabilities

▸ **getCapabilities**(): MediaTrackCapabilities

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:85](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L85)*

**Returns:** MediaTrackCapabilities

___

### getConstraints

▸ **getConstraints**(): MediaTrackConstraints

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:89](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L89)*

**Returns:** MediaTrackConstraints

___

### getSettings

▸ **getSettings**(): MediaTrackSettings

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:93](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L93)*

**Returns:** MediaTrackSettings

___

### removeEventListener

▸ **removeEventListener**(`type`: any, `listener`: any, `options?`: any): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:106](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L106)*

#### Parameters:

Name | Type |
------ | ------ |
`type` | any |
`listener` | any |
`options?` | any |

**Returns:** void

___

### stop

▸ **stop**(): void

*Defined in [packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts:97](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/tests/setup/webrtcMocks.ts#L97)*

**Returns:** void
