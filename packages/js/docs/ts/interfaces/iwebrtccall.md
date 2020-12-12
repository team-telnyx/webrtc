**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / IWebRTCCall

# Interface: IWebRTCCall

## Hierarchy

* **IWebRTCCall**

## Implemented by

* [Call](../classes/call.md)
* [Call](../classes/call.md)

## Index

### Properties

* [\_addChannel](iwebrtccall.md#_addchannel)
* [answer](iwebrtccall.md#answer)
* [cause](iwebrtccall.md#cause)
* [causeCode](iwebrtccall.md#causecode)
* [channels](iwebrtccall.md#channels)
* [deaf](iwebrtccall.md#deaf)
* [direction](iwebrtccall.md#direction)
* [dtmf](iwebrtccall.md#dtmf)
* [extension](iwebrtccall.md#extension)
* [handleConferenceUpdate](iwebrtccall.md#handleconferenceupdate)
* [handleMessage](iwebrtccall.md#handlemessage)
* [hangup](iwebrtccall.md#hangup)
* [hold](iwebrtccall.md#hold)
* [id](iwebrtccall.md#id)
* [invite](iwebrtccall.md#invite)
* [localStream](iwebrtccall.md#localstream)
* [message](iwebrtccall.md#message)
* [muteAudio](iwebrtccall.md#muteaudio)
* [muteVideo](iwebrtccall.md#mutevideo)
* [options](iwebrtccall.md#options)
* [prevState](iwebrtccall.md#prevstate)
* [remoteStream](iwebrtccall.md#remotestream)
* [replace](iwebrtccall.md#replace)
* [role](iwebrtccall.md#role)
* [setAudioInDevice](iwebrtccall.md#setaudioindevice)
* [setAudioOutDevice](iwebrtccall.md#setaudiooutdevice)
* [setSpeakerPhone](iwebrtccall.md#setspeakerphone)
* [setState](iwebrtccall.md#setstate)
* [setVideoDevice](iwebrtccall.md#setvideodevice)
* [startScreenShare](iwebrtccall.md#startscreenshare)
* [state](iwebrtccall.md#state)
* [stopScreenShare](iwebrtccall.md#stopscreenshare)
* [switchCamera](iwebrtccall.md#switchcamera)
* [toggleAudioMute](iwebrtccall.md#toggleaudiomute)
* [toggleDeaf](iwebrtccall.md#toggledeaf)
* [toggleHold](iwebrtccall.md#togglehold)
* [toggleVideoMute](iwebrtccall.md#togglevideomute)
* [transfer](iwebrtccall.md#transfer)
* [undeaf](iwebrtccall.md#undeaf)
* [unhold](iwebrtccall.md#unhold)
* [unmuteAudio](iwebrtccall.md#unmuteaudio)
* [unmuteVideo](iwebrtccall.md#unmutevideo)

## Properties

### \_addChannel

•  **\_addChannel**: (laChannel: any) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:76](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L76)*

___

### answer

•  **answer**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:53](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L53)*

___

### cause

•  **cause**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:45](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L45)*

___

### causeCode

•  **causeCode**: number

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L46)*

___

### channels

•  **channels**: string[]

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L47)*

___

### deaf

•  **deaf**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:70](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L70)*

___

### direction

•  **direction**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:43](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L43)*

___

### dtmf

•  **dtmf**: (dtmf: string) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:60](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L60)*

___

### extension

•  **extension**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L49)*

___

### handleConferenceUpdate

•  **handleConferenceUpdate**: (packet: any, pvtData: any) => Promise<string\>

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:77](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L77)*

___

### handleMessage

•  **handleMessage**: (msg: any) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:75](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L75)*

___

### hangup

•  **hangup**: (params: any, execute: boolean) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L54)*

___

### hold

•  **hold**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:57](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L57)*

___

### id

•  **id**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:40](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L40)*

___

### invite

•  **invite**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L52)*

___

### localStream

•  **localStream**: MediaStream

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:50](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L50)*

___

### message

•  **message**: (to: string, body: string) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:61](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L61)*

___

### muteAudio

•  **muteAudio**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:62](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L62)*

___

### muteVideo

•  **muteVideo**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:66](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L66)*

___

### options

•  **options**: [CallOptions](calloptions.md)

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L44)*

___

### prevState

•  **prevState**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:42](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L42)*

___

### remoteStream

•  **remoteStream**: MediaStream

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:51](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L51)*

___

### replace

•  **replace**: (replaceCallID: string) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:56](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L56)*

___

### role

•  **role**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L48)*

___

### setAudioInDevice

•  **setAudioInDevice**: (deviceId: string) => Promise<void\>

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:65](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L65)*

___

### setAudioOutDevice

• `Optional` **setAudioOutDevice**: (deviceId: string) => Promise<boolean\>

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:81](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L81)*

___

### setSpeakerPhone

• `Optional` **setSpeakerPhone**: (flag: boolean) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:84](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L84)*

___

### setState

•  **setState**: (state: any) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:73](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L73)*

___

### setVideoDevice

•  **setVideoDevice**: (deviceId: string) => Promise<void\>

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:69](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L69)*

___

### startScreenShare

• `Optional` **startScreenShare**: (opts?: object) => Promise<[IWebRTCCall](iwebrtccall.md)\>

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:79](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L79)*

___

### state

•  **state**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:41](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L41)*

___

### stopScreenShare

• `Optional` **stopScreenShare**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:80](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L80)*

___

### switchCamera

• `Optional` **switchCamera**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:83](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L83)*

___

### toggleAudioMute

•  **toggleAudioMute**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:64](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L64)*

___

### toggleDeaf

•  **toggleDeaf**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:72](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L72)*

___

### toggleHold

•  **toggleHold**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:59](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L59)*

___

### toggleVideoMute

•  **toggleVideoMute**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:68](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L68)*

___

### transfer

•  **transfer**: (destination: string) => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:55](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L55)*

___

### undeaf

•  **undeaf**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:71](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L71)*

___

### unhold

•  **unhold**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:58](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L58)*

___

### unmuteAudio

•  **unmuteAudio**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:63](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L63)*

___

### unmuteVideo

•  **unmuteVideo**: () => void

*Defined in [packages/js/src/Modules/Verto/webrtc/interfaces.ts:67](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/interfaces.ts#L67)*
