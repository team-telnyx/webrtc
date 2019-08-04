[telnyx-rtc](../README.md) › [ICall](icall.md)

# Interface: ICall

## Hierarchy

* **ICall**

## Index

### Properties

* [isHeld](icall.md#optional-isheld)
* [isMuted](icall.md#optional-ismuted)
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

### `Optional` isHeld

• **isHeld**? : *Boolean*

*Defined in [utils/interfaces.ts:52](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L52)*

___

### `Optional` isMuted

• **isMuted**? : *Boolean*

*Defined in [utils/interfaces.ts:53](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L53)*

___

###  state

• **state**: *[CallState](../README.md#callstate)*

*Defined in [utils/interfaces.ts:51](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L51)*

## Methods

###  answer

▸ **answer**(): *void*

*Defined in [utils/interfaces.ts:55](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L55)*

**Returns:** *void*

___

###  dtmf

▸ **dtmf**(`input`: string): *void*

*Defined in [utils/interfaces.ts:60](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L60)*

**Parameters:**

Name | Type |
------ | ------ |
`input` | string |

**Returns:** *void*

___

###  hangup

▸ **hangup**(): *void*

*Defined in [utils/interfaces.ts:54](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L54)*

**Returns:** *void*

___

###  hold

▸ **hold**(): *void*

*Defined in [utils/interfaces.ts:56](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L56)*

**Returns:** *void*

___

###  mute

▸ **mute**(): *void*

*Defined in [utils/interfaces.ts:58](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L58)*

**Returns:** *void*

___

###  setAudioOutDevice

▸ **setAudioOutDevice**(`sinkId`: string, `callback?`: Function): *Promise‹undefined›*

*Defined in [utils/interfaces.ts:62](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L62)*

**Parameters:**

Name | Type |
------ | ------ |
`sinkId` | string |
`callback?` | Function |

**Returns:** *Promise‹undefined›*

___

###  transfer

▸ **transfer**(`input`: string): *void*

*Defined in [utils/interfaces.ts:61](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`input` | string |

**Returns:** *void*

___

###  unhold

▸ **unhold**(): *void*

*Defined in [utils/interfaces.ts:57](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L57)*

**Returns:** *void*

___

###  unmute

▸ **unmute**(): *void*

*Defined in [utils/interfaces.ts:59](https://github.com/team-telnyx/telnyx-webrtc-sdk/blob/abc8c08/src/utils/interfaces.ts#L59)*

**Returns:** *void*
