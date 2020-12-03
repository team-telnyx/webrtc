[@telnyx/webrtc - v2.5.2](../README.md) › [ICallOptions](icalloptions.md)

# Interface: ICallOptions

## Hierarchy

* **ICallOptions**

## Index

### Properties

* [attach](icalloptions.md#optional-attach)
* [audio](icalloptions.md#optional-audio)
* [call_id](icalloptions.md#optional-call_id)
* [call_state](icalloptions.md#optional-call_state)
* [callerName](icalloptions.md#optional-callername)
* [callerNumber](icalloptions.md#optional-callernumber)
* [context](icalloptions.md#optional-context)
* [destination](icalloptions.md#destination)
* [device](icalloptions.md#optional-device)
* [id](icalloptions.md#optional-id)
* [localElement](icalloptions.md#optional-localelement)
* [localStream](icalloptions.md#optional-localstream)
* [node_id](icalloptions.md#optional-node_id)
* [peer](icalloptions.md#optional-peer)
* [remoteCallerName](icalloptions.md#optional-remotecallername)
* [remoteCallerNumber](icalloptions.md#optional-remotecallernumber)
* [remoteElement](icalloptions.md#optional-remoteelement)
* [remoteSdp](icalloptions.md#optional-remotesdp)
* [remoteStream](icalloptions.md#optional-remotestream)
* [screenShare](icalloptions.md#optional-screenshare)
* [useStereo](icalloptions.md#optional-usestereo)
* [userVariables](icalloptions.md#optional-uservariables)
* [video](icalloptions.md#optional-video)

## Properties

### `Optional` attach

• **attach**? : *boolean*

*Defined in [src/utils/interfaces.ts:39](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L39)*

___

### `Optional` audio

• **audio**? : *boolean | MediaTrackConstraints*

*Defined in [src/utils/interfaces.ts:37](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L37)*

___

### `Optional` call_id

• **call_id**? : *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:200](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L200)*

___

### `Optional` call_state

• **call_state**? : *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:201](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L201)*

___

### `Optional` callerName

• **callerName**? : *string*

*Defined in [src/utils/interfaces.ts:29](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L29)*

___

### `Optional` callerNumber

• **callerNumber**? : *string*

*Defined in [src/utils/interfaces.ts:30](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L30)*

___

### `Optional` context

• **context**? : *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:202](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L202)*

___

###  destination

• **destination**: *string*

*Defined in [src/utils/interfaces.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L25)*

___

### `Optional` device

• **device**? : *[ICallDevice](icalldevice.md)*

*Defined in [src/Modules/Verto/util/interfaces.ts:197](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L197)*

___

### `Optional` id

• **id**? : *string*

*Defined in [src/utils/interfaces.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L31)*

___

### `Optional` localElement

• **localElement**? : *HTMLMediaElement | string | Function*

*Defined in [src/utils/interfaces.ts:35](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L35)*

___

### `Optional` localStream

• **localStream**? : *MediaStream*

*Defined in [src/utils/interfaces.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L33)*

___

### `Optional` node_id

• **node_id**? : *string*

*Defined in [src/Modules/Verto/util/interfaces.ts:199](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L199)*

___

### `Optional` peer

• **peer**? : *[ICallPeer](icallpeer.md)*

*Defined in [src/Modules/Verto/util/interfaces.ts:198](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L198)*

___

### `Optional` remoteCallerName

• **remoteCallerName**? : *string*

*Defined in [src/utils/interfaces.ts:27](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L27)*

___

### `Optional` remoteCallerNumber

• **remoteCallerNumber**? : *string*

*Defined in [src/utils/interfaces.ts:28](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L28)*

___

### `Optional` remoteElement

• **remoteElement**? : *HTMLMediaElement | string | Function*

*Defined in [src/utils/interfaces.ts:36](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L36)*

___

### `Optional` remoteSdp

• **remoteSdp**? : *string*

*Defined in [src/utils/interfaces.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L32)*

___

### `Optional` remoteStream

• **remoteStream**? : *MediaStream*

*Defined in [src/utils/interfaces.ts:34](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L34)*

___

### `Optional` screenShare

• **screenShare**? : *boolean*

*Defined in [src/utils/interfaces.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L47)*

___

### `Optional` useStereo

• **useStereo**? : *boolean*

*Defined in [src/utils/interfaces.ts:40](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L40)*

___

### `Optional` userVariables

• **userVariables**? : *Object*

*Defined in [src/utils/interfaces.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L46)*

___

### `Optional` video

• **video**? : *boolean | MediaTrackConstraints*

*Defined in [src/utils/interfaces.ts:38](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L38)*
