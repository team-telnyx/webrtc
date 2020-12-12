**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / ICall

# Interface: ICall

## Hierarchy

* **ICall**

## Index

### Properties

* [isHeld](icall.md#isheld)
* [isMuted](icall.md#ismuted)
* [state](icall.md#state)

### Methods

* [answer](icall.md#answer)
* [dtmf](icall.md#dtmf)
* [hangup](icall.md#hangup)
* [hold](icall.md#hold)
* [mute](icall.md#mute)
* [setAudioOutDevice](icall.md#setaudiooutdevice)
* [transfer](icall.md#transfer)
* [unhold](icall.md#unhold)
* [unmute](icall.md#unmute)

## Properties

### isHeld

• `Optional` **isHeld**: Boolean

*Defined in [src/utils/interfaces.ts:53](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L53)*

___

### isMuted

• `Optional` **isMuted**: Boolean

*Defined in [src/utils/interfaces.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L54)*

___

### state

•  **state**: [CallState](../README.md#callstate)

*Defined in [src/utils/interfaces.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L52)*

## Methods

### answer

▸ **answer**(): void

*Defined in [src/utils/interfaces.ts:56](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L56)*

**Returns:** void

___

### dtmf

▸ **dtmf**(`input`: string): void

*Defined in [src/utils/interfaces.ts:61](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L61)*

#### Parameters:

Name | Type |
------ | ------ |
`input` | string |

**Returns:** void

___

### hangup

▸ **hangup**(): void

*Defined in [src/utils/interfaces.ts:55](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L55)*

**Returns:** void

___

### hold

▸ **hold**(): void

*Defined in [src/utils/interfaces.ts:57](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L57)*

**Returns:** void

___

### mute

▸ **mute**(): void

*Defined in [src/utils/interfaces.ts:59](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L59)*

**Returns:** void

___

### setAudioOutDevice

▸ **setAudioOutDevice**(`sinkId`: string, `callback?`: Function): Promise<undefined\>

*Defined in [src/utils/interfaces.ts:63](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L63)*

#### Parameters:

Name | Type |
------ | ------ |
`sinkId` | string |
`callback?` | Function |

**Returns:** Promise<undefined\>

___

### transfer

▸ **transfer**(`input`: string): void

*Defined in [src/utils/interfaces.ts:62](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L62)*

#### Parameters:

Name | Type |
------ | ------ |
`input` | string |

**Returns:** void

___

### unhold

▸ **unhold**(): void

*Defined in [src/utils/interfaces.ts:58](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L58)*

**Returns:** void

___

### unmute

▸ **unmute**(): void

*Defined in [src/utils/interfaces.ts:60](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L60)*

**Returns:** void
