**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / ICallingCollect

# Interface: ICallingCollect

## Hierarchy

* [IRelayCallingCollect](irelaycallingcollect.md)

  ↳ **ICallingCollect**

  ↳↳ [ICallingCollectAudio](icallingcollectaudio.md)

  ↳↳ [ICallingCollectTTS](icallingcollecttts.md)

  ↳↳ [ICallingCollectRingtone](icallingcollectringtone.md)

## Index

### Properties

* [digits](icallingcollect.md#digits)
* [digits\_max](icallingcollect.md#digits_max)
* [digits\_terminators](icallingcollect.md#digits_terminators)
* [digits\_timeout](icallingcollect.md#digits_timeout)
* [end\_silence\_timeout](icallingcollect.md#end_silence_timeout)
* [initial\_timeout](icallingcollect.md#initial_timeout)
* [media](icallingcollect.md#media)
* [partial\_results](icallingcollect.md#partial_results)
* [speech](icallingcollect.md#speech)
* [speech\_hints](icallingcollect.md#speech_hints)
* [speech\_language](icallingcollect.md#speech_language)
* [speech\_timeout](icallingcollect.md#speech_timeout)
* [type](icallingcollect.md#type)
* [volume](icallingcollect.md#volume)

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

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:293](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L293)*

___

### digits\_terminators

• `Optional` **digits\_terminators**: string

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:294](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L294)*

___

### digits\_timeout

• `Optional` **digits\_timeout**: number

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:295](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L295)*

___

### end\_silence\_timeout

• `Optional` **end\_silence\_timeout**: number

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:296](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L296)*

___

### initial\_timeout

• `Optional` **initial\_timeout**: number

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[initial_timeout](irelaycallingcollect.md#initial_timeout)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:276](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L276)*

___

### media

• `Optional` **media**: ([IRelayCallingPlay](irelaycallingplay.md) \| [ICallingPlay](icallingplay.md))[]

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:301](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L301)*

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

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:299](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L299)*

___

### speech\_language

• `Optional` **speech\_language**: string

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:298](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L298)*

___

### speech\_timeout

• `Optional` **speech\_timeout**: number

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:297](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L297)*

___

### type

• `Optional` **type**: string

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:292](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L292)*

___

### volume

• `Optional` **volume**: number

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:300](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L300)*
