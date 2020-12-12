**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / ICallingCollectRingtone

# Interface: ICallingCollectRingtone

## Hierarchy

* [ICallingCollect](icallingcollect.md)

  ↳ **ICallingCollectRingtone**

## Index

### Properties

* [digits](icallingcollectringtone.md#digits)
* [digits\_max](icallingcollectringtone.md#digits_max)
* [digits\_terminators](icallingcollectringtone.md#digits_terminators)
* [digits\_timeout](icallingcollectringtone.md#digits_timeout)
* [duration](icallingcollectringtone.md#duration)
* [end\_silence\_timeout](icallingcollectringtone.md#end_silence_timeout)
* [initial\_timeout](icallingcollectringtone.md#initial_timeout)
* [media](icallingcollectringtone.md#media)
* [name](icallingcollectringtone.md#name)
* [partial\_results](icallingcollectringtone.md#partial_results)
* [speech](icallingcollectringtone.md#speech)
* [speech\_hints](icallingcollectringtone.md#speech_hints)
* [speech\_language](icallingcollectringtone.md#speech_language)
* [speech\_timeout](icallingcollectringtone.md#speech_timeout)
* [type](icallingcollectringtone.md#type)
* [volume](icallingcollectringtone.md#volume)

## Properties

### digits

• `Optional` **digits**: { digit_timeout?: number ; max: number ; terminators?: string  }

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[digits](irelaycallingcollect.md#digits)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:277](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L277)*

#### Type declaration:

Name | Type |
------ | ------ |
`digit_timeout?` | number |
`max` | number |
`terminators?` | string |

___

### digits\_max

• `Optional` **digits\_max**: number

*Inherited from [ICallingCollect](icallingcollect.md).[digits_max](icallingcollect.md#digits_max)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:293](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L293)*

___

### digits\_terminators

• `Optional` **digits\_terminators**: string

*Inherited from [ICallingCollect](icallingcollect.md).[digits_terminators](icallingcollect.md#digits_terminators)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:294](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L294)*

___

### digits\_timeout

• `Optional` **digits\_timeout**: number

*Inherited from [ICallingCollect](icallingcollect.md).[digits_timeout](icallingcollect.md#digits_timeout)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:295](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L295)*

___

### duration

• `Optional` **duration**: number

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:316](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L316)*

___

### end\_silence\_timeout

• `Optional` **end\_silence\_timeout**: number

*Inherited from [ICallingCollect](icallingcollect.md).[end_silence_timeout](icallingcollect.md#end_silence_timeout)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:296](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L296)*

___

### initial\_timeout

• `Optional` **initial\_timeout**: number

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[initial_timeout](irelaycallingcollect.md#initial_timeout)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:276](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L276)*

___

### media

• `Optional` **media**: ([IRelayCallingPlay](irelaycallingplay.md) \| [ICallingPlay](icallingplay.md))[]

*Inherited from [ICallingCollect](icallingcollect.md).[media](icallingcollect.md#media)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:301](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L301)*

___

### name

•  **name**: string

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:315](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L315)*

___

### partial\_results

• `Optional` **partial\_results**: boolean

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[partial_results](irelaycallingcollect.md#partial_results)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:288](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L288)*

___

### speech

• `Optional` **speech**: { end_silence_timeout?: number ; hints?: string[] ; language?: string ; speech_timeout?: number  }

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[speech](irelaycallingcollect.md#speech)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:282](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L282)*

#### Type declaration:

Name | Type |
------ | ------ |
`end_silence_timeout?` | number |
`hints?` | string[] |
`language?` | string |
`speech_timeout?` | number |

___

### speech\_hints

• `Optional` **speech\_hints**: string[]

*Inherited from [ICallingCollect](icallingcollect.md).[speech_hints](icallingcollect.md#speech_hints)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:299](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L299)*

___

### speech\_language

• `Optional` **speech\_language**: string

*Inherited from [ICallingCollect](icallingcollect.md).[speech_language](icallingcollect.md#speech_language)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:298](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L298)*

___

### speech\_timeout

• `Optional` **speech\_timeout**: number

*Inherited from [ICallingCollect](icallingcollect.md).[speech_timeout](icallingcollect.md#speech_timeout)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:297](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L297)*

___

### type

• `Optional` **type**: string

*Inherited from [ICallingCollect](icallingcollect.md).[type](icallingcollect.md#type)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:292](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L292)*

___

### volume

• `Optional` **volume**: number

*Inherited from [ICallingCollect](icallingcollect.md).[volume](icallingcollect.md#volume)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:300](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L300)*
