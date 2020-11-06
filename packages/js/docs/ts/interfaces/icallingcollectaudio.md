[@telnyx/webrtc - v2.2.1](../README.md) › [ICallingCollectAudio](icallingcollectaudio.md)

# Interface: ICallingCollectAudio

## Hierarchy

  ↳ [ICallingCollect](icallingcollect.md)

  ↳ **ICallingCollectAudio**

## Index

### Properties

* [digits](icallingcollectaudio.md#optional-digits)
* [digits_max](icallingcollectaudio.md#optional-digits_max)
* [digits_terminators](icallingcollectaudio.md#optional-digits_terminators)
* [digits_timeout](icallingcollectaudio.md#optional-digits_timeout)
* [end_silence_timeout](icallingcollectaudio.md#optional-end_silence_timeout)
* [initial_timeout](icallingcollectaudio.md#optional-initial_timeout)
* [media](icallingcollectaudio.md#optional-media)
* [partial_results](icallingcollectaudio.md#optional-partial_results)
* [speech](icallingcollectaudio.md#optional-speech)
* [speech_hints](icallingcollectaudio.md#optional-speech_hints)
* [speech_language](icallingcollectaudio.md#optional-speech_language)
* [speech_timeout](icallingcollectaudio.md#optional-speech_timeout)
* [type](icallingcollectaudio.md#optional-type)
* [url](icallingcollectaudio.md#optional-url)
* [volume](icallingcollectaudio.md#optional-volume)

## Properties

### `Optional` digits

• **digits**? : *object*

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[digits](irelaycallingcollect.md#optional-digits)*

*Defined in [src/Modules/Verto/util/interfaces.ts:283](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L283)*

#### Type declaration:

___

### `Optional` digits_max

• **digits_max**? : *number*

*Inherited from [ICallingCollect](icallingcollect.md).[digits_max](icallingcollect.md#optional-digits_max)*

*Defined in [src/Modules/Verto/util/interfaces.ts:299](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L299)*

___

### `Optional` digits_terminators

• **digits_terminators**? : *string*

*Inherited from [ICallingCollect](icallingcollect.md).[digits_terminators](icallingcollect.md#optional-digits_terminators)*

*Defined in [src/Modules/Verto/util/interfaces.ts:300](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L300)*

___

### `Optional` digits_timeout

• **digits_timeout**? : *number*

*Inherited from [ICallingCollect](icallingcollect.md).[digits_timeout](icallingcollect.md#optional-digits_timeout)*

*Defined in [src/Modules/Verto/util/interfaces.ts:301](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L301)*

___

### `Optional` end_silence_timeout

• **end_silence_timeout**? : *number*

*Inherited from [ICallingCollect](icallingcollect.md).[end_silence_timeout](icallingcollect.md#optional-end_silence_timeout)*

*Defined in [src/Modules/Verto/util/interfaces.ts:302](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L302)*

___

### `Optional` initial_timeout

• **initial_timeout**? : *number*

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[initial_timeout](irelaycallingcollect.md#optional-initial_timeout)*

*Defined in [src/Modules/Verto/util/interfaces.ts:282](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L282)*

___

### `Optional` media

• **media**? : *([ICallingPlay](icallingplay.md) | [IRelayCallingPlay](irelaycallingplay.md))[]*

*Inherited from [ICallingCollect](icallingcollect.md).[media](icallingcollect.md#optional-media)*

*Defined in [src/Modules/Verto/util/interfaces.ts:307](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L307)*

___

### `Optional` partial_results

• **partial_results**? : *boolean*

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[partial_results](irelaycallingcollect.md#optional-partial_results)*

*Defined in [src/Modules/Verto/util/interfaces.ts:294](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L294)*

___

### `Optional` speech

• **speech**? : *object*

*Inherited from [IRelayCallingCollect](irelaycallingcollect.md).[speech](irelaycallingcollect.md#optional-speech)*

*Defined in [src/Modules/Verto/util/interfaces.ts:288](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L288)*

#### Type declaration:

___

### `Optional` speech_hints

• **speech_hints**? : *string[]*

*Inherited from [ICallingCollect](icallingcollect.md).[speech_hints](icallingcollect.md#optional-speech_hints)*

*Defined in [src/Modules/Verto/util/interfaces.ts:305](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L305)*

___

### `Optional` speech_language

• **speech_language**? : *string*

*Inherited from [ICallingCollect](icallingcollect.md).[speech_language](icallingcollect.md#optional-speech_language)*

*Defined in [src/Modules/Verto/util/interfaces.ts:304](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L304)*

___

### `Optional` speech_timeout

• **speech_timeout**? : *number*

*Inherited from [ICallingCollect](icallingcollect.md).[speech_timeout](icallingcollect.md#optional-speech_timeout)*

*Defined in [src/Modules/Verto/util/interfaces.ts:303](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L303)*

___

### `Optional` type

• **type**? : *string*

*Inherited from [ICallingCollect](icallingcollect.md).[type](icallingcollect.md#optional-type)*

*Defined in [src/Modules/Verto/util/interfaces.ts:298](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L298)*

___

### `Optional` url

• **url**? : *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:311](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L311)*

___

### `Optional` volume

• **volume**? : *number*

*Inherited from [ICallingCollect](icallingcollect.md).[volume](icallingcollect.md#optional-volume)*

*Defined in [src/Modules/Verto/util/interfaces.ts:306](https://github.com/team-telnyx/webrtc/blob/1cfde20/packages/js/src/Modules/Verto/util/interfaces.ts#L306)*
