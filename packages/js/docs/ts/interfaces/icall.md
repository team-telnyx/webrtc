[@telnyx/webrtc - v2.2.1](../README.md) › [ICall](icall.md)

# Interface: ICall

## Hierarchy

* **ICall**

## Index

### Properties

* [active](icall.md#active)
* [answered](icall.md#answered)
* [busy](icall.md#busy)
* [connect](icall.md#connect)
* [connectAsync](icall.md#connectasync)
* [context](icall.md#context)
* [detect](icall.md#detect)
* [detectAnsweringMachine](icall.md#detectansweringmachine)
* [detectAnsweringMachineAsync](icall.md#detectansweringmachineasync)
* [detectAsync](icall.md#detectasync)
* [detectDigit](icall.md#detectdigit)
* [detectDigitAsync](icall.md#detectdigitasync)
* [detectFax](icall.md#detectfax)
* [detectFaxAsync](icall.md#detectfaxasync)
* [detectHuman](icall.md#optional-detecthuman)
* [detectHumanAsync](icall.md#optional-detecthumanasync)
* [detectMachine](icall.md#optional-detectmachine)
* [detectMachineAsync](icall.md#optional-detectmachineasync)
* [dial](icall.md#dial)
* [ended](icall.md#ended)
* [failed](icall.md#failed)
* [faxReceive](icall.md#faxreceive)
* [faxReceiveAsync](icall.md#faxreceiveasync)
* [faxSend](icall.md#faxsend)
* [faxSendAsync](icall.md#faxsendasync)
* [from](icall.md#from)
* [id](icall.md#id)
* [isHeld](icall.md#optional-isheld)
* [isMuted](icall.md#optional-ismuted)
* [nodeId](icall.md#nodeid)
* [off](icall.md#off)
* [on](icall.md#on)
* [play](icall.md#play)
* [playAsync](icall.md#playasync)
* [playAudio](icall.md#playaudio)
* [playAudioAsync](icall.md#playaudioasync)
* [playSilence](icall.md#playsilence)
* [playSilenceAsync](icall.md#playsilenceasync)
* [playTTS](icall.md#playtts)
* [playTTSAsync](icall.md#playttsasync)
* [prevState](icall.md#prevstate)
* [prompt](icall.md#prompt)
* [promptAsync](icall.md#promptasync)
* [promptAudio](icall.md#promptaudio)
* [promptAudioAsync](icall.md#promptaudioasync)
* [promptTTS](icall.md#prompttts)
* [promptTTSAsync](icall.md#promptttsasync)
* [record](icall.md#record)
* [recordAsync](icall.md#recordasync)
* [sendDigits](icall.md#senddigits)
* [sendDigitsAsync](icall.md#senddigitsasync)
* [state](icall.md#state)
* [tag](icall.md#optional-tag)
* [tap](icall.md#tap)
* [tapAsync](icall.md#tapasync)
* [timeout](icall.md#timeout)
* [to](icall.md#to)
* [type](icall.md#type)
* [waitFor](icall.md#waitfor)
* [waitForAnswered](icall.md#waitforanswered)
* [waitForEnded](icall.md#waitforended)
* [waitForEnding](icall.md#waitforending)
* [waitForRinging](icall.md#waitforringing)

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

###  active

• **active**: *boolean*

*Defined in [src/Modules/Verto/util/interfaces.ts:117](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L117)*

___

###  answered

• **answered**: *boolean*

*Defined in [src/Modules/Verto/util/interfaces.ts:119](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L119)*

___

###  busy

• **busy**: *boolean*

*Defined in [src/Modules/Verto/util/interfaces.ts:121](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L121)*

___

###  connect

• **connect**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:129](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L129)*

___

###  connectAsync

• **connectAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:130](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L130)*

___

###  context

• **context**: *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:111](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L111)*

___

###  detect

• **detect**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:154](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L154)*

___

###  detectAnsweringMachine

• **detectAnsweringMachine**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:156](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L156)*

___

###  detectAnsweringMachineAsync

• **detectAnsweringMachineAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:157](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L157)*

___

###  detectAsync

• **detectAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:155](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L155)*

___

###  detectDigit

• **detectDigit**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:164](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L164)*

___

###  detectDigitAsync

• **detectDigitAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:165](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L165)*

___

###  detectFax

• **detectFax**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:162](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L162)*

___

###  detectFaxAsync

• **detectFaxAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:163](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L163)*

___

### `Optional` detectHuman

• **detectHuman**? : *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:158](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L158)*

___

### `Optional` detectHumanAsync

• **detectHumanAsync**? : *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:159](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L159)*

___

### `Optional` detectMachine

• **detectMachine**? : *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:160](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L160)*

___

### `Optional` detectMachineAsync

• **detectMachineAsync**? : *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:161](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L161)*

___

###  dial

• **dial**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:124](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L124)*

___

###  ended

• **ended**: *boolean*

*Defined in [src/Modules/Verto/util/interfaces.ts:120](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L120)*

___

###  failed

• **failed**: *boolean*

*Defined in [src/Modules/Verto/util/interfaces.ts:118](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L118)*

___

###  faxReceive

• **faxReceive**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:150](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L150)*

___

###  faxReceiveAsync

• **faxReceiveAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:151](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L151)*

___

###  faxSend

• **faxSend**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:152](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L152)*

___

###  faxSendAsync

• **faxSendAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:153](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L153)*

___

###  from

• **from**: *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:115](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L115)*

___

###  id

• **id**: *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:106](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L106)*

___

### `Optional` isHeld

• **isHeld**? : *Boolean*

*Defined in [src/utils/interfaces.ts:53](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L53)*

___

### `Optional` isMuted

• **isMuted**? : *Boolean*

*Defined in [src/utils/interfaces.ts:54](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L54)*

___

###  nodeId

• **nodeId**: *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:108](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L108)*

___

###  off

• **off**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:123](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L123)*

___

###  on

• **on**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:122](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L122)*

___

###  play

• **play**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:131](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L131)*

___

###  playAsync

• **playAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:132](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L132)*

___

###  playAudio

• **playAudio**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:133](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L133)*

___

###  playAudioAsync

• **playAudioAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:134](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L134)*

___

###  playSilence

• **playSilence**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:135](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L135)*

___

###  playSilenceAsync

• **playSilenceAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:136](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L136)*

___

###  playTTS

• **playTTS**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:137](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L137)*

___

###  playTTSAsync

• **playTTSAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:138](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L138)*

___

###  prevState

• **prevState**: *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:110](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L110)*

___

###  prompt

• **prompt**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:139](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L139)*

___

###  promptAsync

• **promptAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:140](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L140)*

___

###  promptAudio

• **promptAudio**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:141](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L141)*

___

###  promptAudioAsync

• **promptAudioAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:142](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L142)*

___

###  promptTTS

• **promptTTS**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:143](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L143)*

___

###  promptTTSAsync

• **promptTTSAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:144](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L144)*

___

###  record

• **record**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:126](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L126)*

___

###  recordAsync

• **recordAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:127](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L127)*

___

###  sendDigits

• **sendDigits**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:168](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L168)*

___

###  sendDigitsAsync

• **sendDigitsAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:169](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L169)*

___

###  state

• **state**: *string*

*Defined in [src/utils/interfaces.ts:52](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L52)*

*Defined in [src/Modules/Verto/util/interfaces.ts:109](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L109)*

___

### `Optional` tag

• **tag**? : *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:107](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L107)*

___

###  tap

• **tap**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:166](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L166)*

___

###  tapAsync

• **tapAsync**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:167](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L167)*

___

###  timeout

• **timeout**: *number*

*Defined in [src/Modules/Verto/util/interfaces.ts:116](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L116)*

___

###  to

• **to**: *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:114](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L114)*

___

###  type

• **type**: *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:113](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L113)*

___

###  waitFor

• **waitFor**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:145](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L145)*

___

###  waitForAnswered

• **waitForAnswered**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:147](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L147)*

___

###  waitForEnded

• **waitForEnded**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:149](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L149)*

___

###  waitForEnding

• **waitForEnding**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:148](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L148)*

___

###  waitForRinging

• **waitForRinging**: *Function*

*Defined in [src/Modules/Verto/util/interfaces.ts:146](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/util/interfaces.ts#L146)*

## Methods

###  answer

▸ **answer**(): *void*

*Defined in [src/utils/interfaces.ts:56](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L56)*

**Returns:** *void*

___

###  dtmf

▸ **dtmf**(`input`: string): *void*

*Defined in [src/utils/interfaces.ts:61](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`input` | string |

**Returns:** *void*

___

###  hangup

▸ **hangup**(): *void*

*Defined in [src/utils/interfaces.ts:55](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L55)*

**Returns:** *void*

___

###  hold

▸ **hold**(): *void*

*Defined in [src/utils/interfaces.ts:57](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L57)*

**Returns:** *void*

___

###  mute

▸ **mute**(): *void*

*Defined in [src/utils/interfaces.ts:59](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L59)*

**Returns:** *void*

___

###  setAudioOutDevice

▸ **setAudioOutDevice**(`sinkId`: string, `callback?`: Function): *Promise‹undefined›*

*Defined in [src/utils/interfaces.ts:63](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L63)*

**Parameters:**

Name | Type |
------ | ------ |
`sinkId` | string |
`callback?` | Function |

**Returns:** *Promise‹undefined›*

___

###  transfer

▸ **transfer**(`input`: string): *void*

*Defined in [src/utils/interfaces.ts:62](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L62)*

**Parameters:**

Name | Type |
------ | ------ |
`input` | string |

**Returns:** *void*

___

###  unhold

▸ **unhold**(): *void*

*Defined in [src/utils/interfaces.ts:58](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L58)*

**Returns:** *void*

___

###  unmute

▸ **unmute**(): *void*

*Defined in [src/utils/interfaces.ts:60](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/utils/interfaces.ts#L60)*

**Returns:** *void*
