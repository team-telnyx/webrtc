**[@telnyx/webrtc](README.md)**

> Globals

# @telnyx/webrtc

## Index

### Classes

* [BaseClient](classes/baseclient.md)
* [BaseSession](classes/basesession.md)
* [BrowserSession](classes/browsersession.md)
* [TelnyxRTC](classes/telnyxrtc.md)

### Interfaces

* [ICall](interfaces/icall.md)
* [ICallOptions](interfaces/icalloptions.md)
* [IClientOptions](interfaces/iclientoptions.md)
* [ICredentials](interfaces/icredentials.md)
* [MessageEvents](interfaces/messageevents.md)
* [TypedEventEmitter](interfaces/typedeventemitter.md)

### Type aliases

* [Arguments](README.md#arguments)
* [CallState](README.md#callstate)
* [Env](README.md#env)
* [Module](README.md#module)
* [RTCElement](README.md#rtcelement)

### Variables

* [KEEPALIVE\_INTERVAL](README.md#keepalive_interval)
* [REGISTRAR\_SERVER](README.md#registrar_server)

### Functions

* [getElement](README.md#getelement)

### Object literals

* [STUN\_SERVER](README.md#stun_server)
* [TURN\_SERVER](README.md#turn_server)

## Type aliases

### Arguments

Ƭ  **Arguments**<T\>: [T] *extends* [(...args: *infer* U) => any] ? U : [T] *extends* [void] ? [] : [T]

*Defined in [src/TypedEmitter.ts:6](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L6)*

**`author`** andywer

**`license`** MIT
https://github.com/andywer/typed-emitter

#### Type parameters:

Name |
------ |
`T` |

___

### CallState

Ƭ  **CallState**: \"new\" \| \"ringing\" \| \"connecting\" \| \"active\" \| \"held\" \| \"done\"

*Defined in [src/utils/types.ts:1](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/types.ts#L1)*

___

### Env

Ƭ  **Env**: \"production\" \| \"development\"

*Defined in [src/utils/types.ts:8](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/types.ts#L8)*

___

### Module

Ƭ  **Module**: \"verto\" \| \"telnyx\_rtc\"

*Defined in [src/utils/types.ts:9](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/types.ts#L9)*

___

### RTCElement

Ƭ  **RTCElement**: HTMLMediaElement \| string \| Function

*Defined in [src/utils/types.ts:10](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/types.ts#L10)*

## Variables

### KEEPALIVE\_INTERVAL

• `Const` **KEEPALIVE\_INTERVAL**: number = 10 * 1000

*Defined in [src/Modules/Verto/BaseSession.ts:22](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L22)*

___

### REGISTRAR\_SERVER

• `Const` **REGISTRAR\_SERVER**: \"sip:sip.telnyx.com:7443\" = "sip:sip.telnyx.com:7443"

*Defined in [src/BaseClient.ts:18](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L18)*

## Functions

### getElement

▸ `Const`**getElement**(`element`: [RTCElement](README.md#rtcelement)): HTMLMediaElement

*Defined in [src/BaseClient.ts:20](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L20)*

#### Parameters:

Name | Type |
------ | ------ |
`element` | [RTCElement](README.md#rtcelement) |

**Returns:** HTMLMediaElement

## Object literals

### STUN\_SERVER

▪ `Const` **STUN\_SERVER**: object

*Defined in [src/BaseClient.ts:12](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L12)*

#### Properties:

Name | Type | Value |
------ | ------ | ------ |
`urls` | string | "stun:stun.telnyx.com:3843" |

___

### TURN\_SERVER

▪ `Const` **TURN\_SERVER**: object

*Defined in [src/BaseClient.ts:13](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L13)*

#### Properties:

Name | Type | Value |
------ | ------ | ------ |
`credential` | string | "turnpassword" |
`urls` | string | "turn:turn.telnyx.com:3478?transport=tcp" |
`username` | string | "turnuser" |
