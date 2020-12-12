**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / IRelayCallingCollect

# Interface: IRelayCallingCollect

## Hierarchy

* **IRelayCallingCollect**

  ↳ [ICallingCollect](icallingcollect.md)

## Index

### Properties

* [digits](irelaycallingcollect.md#digits)
* [initial\_timeout](irelaycallingcollect.md#initial_timeout)
* [partial\_results](irelaycallingcollect.md#partial_results)
* [speech](irelaycallingcollect.md#speech)

## Properties

### digits

• `Optional` **digits**: { digit_timeout?: number ; max: number ; terminators?: string  }

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:277](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L277)*

#### Type declaration:

Name | Type |
------ | ------ |
`digit_timeout?` | number |
`max` | number |
`terminators?` | string |

___

### initial\_timeout

• `Optional` **initial\_timeout**: number

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:276](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L276)*

___

### partial\_results

• `Optional` **partial\_results**: boolean

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:288](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L288)*

___

### speech

• `Optional` **speech**: { end_silence_timeout?: number ; hints?: string[] ; language?: string ; speech_timeout?: number  }

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:282](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L282)*

#### Type declaration:

Name | Type |
------ | ------ |
`end_silence_timeout?` | number |
`hints?` | string[] |
`language?` | string |
`speech_timeout?` | number |
