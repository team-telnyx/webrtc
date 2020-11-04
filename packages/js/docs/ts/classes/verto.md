[@telnyx/webrtc - v2.2.1](../README.md) › [Verto](verto.md)

# Class: Verto

## Hierarchy

  ↳ [BrowserSession](browsersession.md)

  ↳ **Verto**

## Index

### Constructors

* [constructor](verto.md#constructor)

### Properties

* [autoRecoverCalls](verto.md#autorecovercalls)
* [calls](verto.md#calls)
* [camId](verto.md#camid)
* [camLabel](verto.md#camlabel)
* [contexts](verto.md#contexts)
* [expiresAt](verto.md#expiresat)
* [master_nodeid](verto.md#master_nodeid)
* [micId](verto.md#micid)
* [micLabel](verto.md#miclabel)
* [nodeid](verto.md#nodeid)
* [options](verto.md#options)
* [relayProtocol](verto.md#relayprotocol)
* [ringbackFile](verto.md#optional-ringbackfile)
* [ringtoneFile](verto.md#optional-ringtonefile)
* [sessionid](verto.md#sessionid)
* [signature](verto.md#signature)
* [subscriptions](verto.md#subscriptions)
* [timeoutErrorCode](verto.md#timeouterrorcode)
* [uuid](verto.md#uuid)

### Accessors

* [__logger](verto.md#__logger)
* [audioInDevices](verto.md#audioindevices)
* [audioOutDevices](verto.md#audiooutdevices)
* [connected](verto.md#connected)
* [devices](verto.md#devices)
* [expired](verto.md#expired)
* [iceServers](verto.md#iceservers)
* [localElement](verto.md#localelement)
* [mediaConstraints](verto.md#mediaconstraints)
* [reconnectDelay](verto.md#reconnectdelay)
* [remoteElement](verto.md#remoteelement)
* [speaker](verto.md#speaker)
* [videoDevices](verto.md#videodevices)

### Methods

* [_existsSubscription](verto.md#_existssubscription)
* [broadcast](verto.md#broadcast)
* [checkPermissions](verto.md#checkpermissions)
* [connect](verto.md#connect)
* [disableMicrophone](verto.md#disablemicrophone)
* [disableWebcam](verto.md#disablewebcam)
* [disconnect](verto.md#disconnect)
* [enableMicrophone](verto.md#enablemicrophone)
* [enableWebcam](verto.md#enablewebcam)
* [execute](verto.md#execute)
* [executeRaw](verto.md#executeraw)
* [getAudioInDevices](verto.md#getaudioindevices)
* [getAudioOutDevices](verto.md#getaudiooutdevices)
* [getDeviceResolutions](verto.md#getdeviceresolutions)
* [getDevices](verto.md#getdevices)
* [getVideoDevices](verto.md#getvideodevices)
* [logout](verto.md#logout)
* [newCall](verto.md#newcall)
* [off](verto.md#off)
* [on](verto.md#on)
* [refreshDevices](verto.md#refreshdevices)
* [refreshToken](verto.md#refreshtoken)
* [setAudioSettings](verto.md#setaudiosettings)
* [setVideoSettings](verto.md#setvideosettings)
* [speedTest](verto.md#speedtest)
* [subscribe](verto.md#subscribe)
* [unsubscribe](verto.md#unsubscribe)
* [validateDeviceId](verto.md#validatedeviceid)
* [validateOptions](verto.md#validateoptions)
* [vertoBroadcast](verto.md#vertobroadcast)
* [vertoSubscribe](verto.md#vertosubscribe)
* [vertoUnsubscribe](verto.md#vertounsubscribe)
* [off](verto.md#static-off)
* [on](verto.md#static-on)
* [telnyxStateCall](verto.md#static-telnyxstatecall)
* [uuid](verto.md#static-uuid)

## Constructors

###  constructor

\+ **new Verto**(`options`: [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)): *[Verto](verto.md)*

*Inherited from [BrowserSession](browsersession.md).[constructor](browsersession.md#constructor)*

*Overrides [BaseSession](basesession.md).[constructor](basesession.md#constructor)*

*Defined in [src/Modules/Verto/BrowserSession.ts:66](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L66)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) |

**Returns:** *[Verto](verto.md)*

## Properties

###  autoRecoverCalls

• **autoRecoverCalls**: *boolean* = true

*Inherited from [BrowserSession](browsersession.md).[autoRecoverCalls](browsersession.md#autorecovercalls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:46](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L46)*

___

###  calls

• **calls**: *object*

*Inherited from [BrowserSession](browsersession.md).[calls](browsersession.md#calls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:36](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L36)*

#### Type declaration:

* \[ **callId**: *string*\]: [IWebRTCCall](../interfaces/iwebrtccall.md)

___

###  camId

• **camId**: *string*

*Inherited from [BrowserSession](browsersession.md).[camId](browsersession.md#camid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:42](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L42)*

___

###  camLabel

• **camLabel**: *string*

*Inherited from [BrowserSession](browsersession.md).[camLabel](browsersession.md#camlabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:44](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L44)*

___

###  contexts

• **contexts**: *string[]* =  []

*Inherited from [BaseSession](basesession.md).[contexts](basesession.md#contexts)*

*Defined in [src/Modules/Verto/BaseSession.ts:38](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L38)*

___

###  expiresAt

• **expiresAt**: *number* = 0

*Inherited from [BaseSession](basesession.md).[expiresAt](basesession.md#expiresat)*

*Defined in [src/Modules/Verto/BaseSession.ts:35](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L35)*

___

###  master_nodeid

• **master_nodeid**: *string*

*Inherited from [BaseSession](basesession.md).[master_nodeid](basesession.md#master_nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:34](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L34)*

___

###  micId

• **micId**: *string*

*Inherited from [BrowserSession](browsersession.md).[micId](browsersession.md#micid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:38](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L38)*

___

###  micLabel

• **micLabel**: *string*

*Inherited from [BrowserSession](browsersession.md).[micLabel](browsersession.md#miclabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:40](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L40)*

___

###  nodeid

• **nodeid**: *string*

*Inherited from [BaseSession](basesession.md).[nodeid](basesession.md#nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:33](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L33)*

___

###  options

• **options**: *[ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)*

*Inherited from [BaseSession](basesession.md).[options](basesession.md#options)*

*Defined in [src/Modules/Verto/BaseSession.ts:52](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L52)*

___

###  relayProtocol

• **relayProtocol**: *string* =  VERTO_PROTOCOL

*Overrides [BaseSession](basesession.md).[relayProtocol](basesession.md#relayprotocol)*

*Defined in [src/TelnyxRTC.ts:18](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/TelnyxRTC.ts#L18)*

___

### `Optional` ringbackFile

• **ringbackFile**? : *string*

*Inherited from [BrowserSession](browsersession.md).[ringbackFile](browsersession.md#optional-ringbackfile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:50](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L50)*

___

### `Optional` ringtoneFile

• **ringtoneFile**? : *string*

*Inherited from [BrowserSession](browsersession.md).[ringtoneFile](browsersession.md#optional-ringtonefile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:48](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L48)*

___

###  sessionid

• **sessionid**: *string* = ""

*Inherited from [BaseSession](basesession.md).[sessionid](basesession.md#sessionid)*

*Defined in [src/Modules/Verto/BaseSession.ts:31](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L31)*

___

###  signature

• **signature**: *string* =  null

*Inherited from [BaseSession](basesession.md).[signature](basesession.md#signature)*

*Defined in [src/Modules/Verto/BaseSession.ts:36](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L36)*

___

###  subscriptions

• **subscriptions**: *object*

*Inherited from [BaseSession](basesession.md).[subscriptions](basesession.md#subscriptions)*

*Defined in [src/Modules/Verto/BaseSession.ts:32](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L32)*

#### Type declaration:

* \[ **channel**: *string*\]: any

___

###  timeoutErrorCode

• **timeoutErrorCode**: *number* =  -329990

*Overrides [BaseSession](basesession.md).[timeoutErrorCode](basesession.md#timeouterrorcode)*

*Defined in [src/TelnyxRTC.ts:20](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/TelnyxRTC.ts#L20)*

___

###  uuid

• **uuid**: *string* =  uuidv4()

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:30](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L30)*

## Accessors

###  __logger

• **get __logger**(): *Logger*

*Inherited from [BaseSession](basesession.md).[__logger](basesession.md#__logger)*

*Defined in [src/Modules/Verto/BaseSession.ts:66](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L66)*

**Returns:** *Logger*

___

###  audioInDevices

• **get audioInDevices**(): *object*

*Inherited from [BrowserSession](browsersession.md).[audioInDevices](browsersession.md#audioindevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:259](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L259)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

___

###  audioOutDevices

• **get audioOutDevices**(): *object*

*Inherited from [BrowserSession](browsersession.md).[audioOutDevices](browsersession.md#audiooutdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:269](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L269)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

___

###  connected

• **get connected**(): *boolean*

*Inherited from [BaseSession](basesession.md).[connected](basesession.md#connected)*

*Defined in [src/Modules/Verto/BaseSession.ts:70](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L70)*

**Returns:** *boolean*

___

###  devices

• **get devices**(): *[ICacheDevices](../interfaces/icachedevices.md)*

*Inherited from [BrowserSession](browsersession.md).[devices](browsersession.md#devices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:231](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L231)*

**`deprecated`** 

**Returns:** *[ICacheDevices](../interfaces/icachedevices.md)*

___

###  expired

• **get expired**(): *boolean*

*Inherited from [BaseSession](basesession.md).[expired](basesession.md#expired)*

*Defined in [src/Modules/Verto/BaseSession.ts:74](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L74)*

**Returns:** *boolean*

___

###  iceServers

• **get iceServers**(): *false | true | RTCIceServer[]*

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:334](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L334)*

**Returns:** *false | true | RTCIceServer[]*

• **set iceServers**(`servers`: RTCIceServer[] | boolean): *void*

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:324](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L324)*

**Parameters:**

Name | Type |
------ | ------ |
`servers` | RTCIceServer[] &#124; boolean |

**Returns:** *void*

___

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:350](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L350)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:346](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L346)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  mediaConstraints

• **get mediaConstraints**(): *object*

*Inherited from [BrowserSession](browsersession.md).[mediaConstraints](browsersession.md#mediaconstraints)*

*Defined in [src/Modules/Verto/BrowserSession.ts:276](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L276)*

**Returns:** *object*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Inherited from [BrowserSession](browsersession.md).[reconnectDelay](browsersession.md#reconnectdelay)*

*Overrides [BaseSession](basesession.md).[reconnectDelay](basesession.md#reconnectdelay)*

*Defined in [src/Modules/Verto/BrowserSession.ts:75](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L75)*

**Returns:** *number*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:358](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L358)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:354](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L354)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  speaker

• **get speaker**(): *string*

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:342](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L342)*

**Returns:** *string*

• **set speaker**(`deviceId`: string): *void*

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:338](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L338)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *void*

___

###  videoDevices

• **get videoDevices**(): *object*

*Inherited from [BrowserSession](browsersession.md).[videoDevices](browsersession.md#videodevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:249](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L249)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

## Methods

###  _existsSubscription

▸ **_existsSubscription**(`protocol`: string, `channel?`: string): *boolean*

*Inherited from [BaseSession](basesession.md).[_existsSubscription](basesession.md#_existssubscription)*

*Defined in [src/Modules/Verto/BaseSession.ts:376](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L376)*

Check if a subscription for this protocol-channel already exists

**Parameters:**

Name | Type |
------ | ------ |
`protocol` | string |
`channel?` | string |

**Returns:** *boolean*

boolean

___

###  broadcast

▸ **broadcast**(`params`: [BroadcastParams](../interfaces/broadcastparams.md)): *void*

*Overrides [BaseSession](basesession.md).[broadcast](basesession.md#broadcast)*

*Defined in [src/TelnyxRTC.ts:38](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/TelnyxRTC.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [BroadcastParams](../interfaces/broadcastparams.md) |

**Returns:** *void*

___

###  checkPermissions

▸ **checkPermissions**(`audio`: boolean, `video`: boolean): *Promise‹boolean›*

*Inherited from [BrowserSession](browsersession.md).[checkPermissions](browsersession.md#checkpermissions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:87](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L87)*

Check if the browser has the permission to access mic and/or webcam

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`audio` | boolean | true |
`video` | boolean | true |

**Returns:** *Promise‹boolean›*

___

###  connect

▸ **connect**(): *Promise‹void›*

*Inherited from [BrowserSession](browsersession.md).[connect](browsersession.md#connect)*

*Overrides [BaseSession](basesession.md).[connect](basesession.md#connect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:79](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L79)*

**Returns:** *Promise‹void›*

___

###  disableMicrophone

▸ **disableMicrophone**(): *void*

*Inherited from [BrowserSession](browsersession.md).[disableMicrophone](browsersession.md#disablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:294](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L294)*

**Returns:** *void*

___

###  disableWebcam

▸ **disableWebcam**(): *void*

*Inherited from [BrowserSession](browsersession.md).[disableWebcam](browsersession.md#disablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:316](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L316)*

**Returns:** *void*

___

###  disconnect

▸ **disconnect**(): *Promise‹void›*

*Inherited from [BrowserSession](browsersession.md).[disconnect](browsersession.md#disconnect)*

*Overrides [BaseSession](basesession.md).[disconnect](basesession.md#disconnect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:111](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L111)*

Disconnect all active calls

**Returns:** *Promise‹void›*

___

###  enableMicrophone

▸ **enableMicrophone**(): *void*

*Inherited from [BrowserSession](browsersession.md).[enableMicrophone](browsersession.md#enablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:298](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L298)*

**Returns:** *void*

___

###  enableWebcam

▸ **enableWebcam**(): *void*

*Inherited from [BrowserSession](browsersession.md).[enableWebcam](browsersession.md#enablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:320](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L320)*

**Returns:** *void*

___

###  execute

▸ **execute**(`msg`: BaseMessage): *any*

*Inherited from [BaseSession](basesession.md).[execute](basesession.md#execute)*

*Defined in [src/Modules/Verto/BaseSession.ts:86](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L86)*

Send a JSON object to the server.

**Parameters:**

Name | Type |
------ | ------ |
`msg` | BaseMessage |

**Returns:** *any*

Promise that will resolve/reject depending on the server response

___

###  executeRaw

▸ **executeRaw**(`text`: string): *void*

*Inherited from [BaseSession](basesession.md).[executeRaw](basesession.md#executeraw)*

*Defined in [src/Modules/Verto/BaseSession.ts:110](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L110)*

Send raw text to the server.

**Parameters:**

Name | Type |
------ | ------ |
`text` | string |

**Returns:** *void*

void

___

###  getAudioInDevices

▸ **getAudioInDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getAudioInDevices](browsersession.md#getaudioindevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:177](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L177)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getAudioOutDevices

▸ **getAudioOutDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getAudioOutDevices](browsersession.md#getaudiooutdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:187](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L187)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`: string): *Promise‹any[]›*

*Inherited from [BrowserSession](browsersession.md).[getDeviceResolutions](browsersession.md#getdeviceresolutions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:238](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L238)*

Return supported resolution for the given webcam.

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *Promise‹any[]›*

___

###  getDevices

▸ **getDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getDevices](browsersession.md#getdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:157](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L157)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getVideoDevices

▸ **getVideoDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getVideoDevices](browsersession.md#getvideodevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:167](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L167)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  logout

▸ **logout**(): *void*

*Inherited from [BrowserSession](browsersession.md).[logout](browsersession.md#logout)*

*Defined in [src/Modules/Verto/BrowserSession.ts:104](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L104)*

Alias for .disconnect()

**`deprecated`** 

**Returns:** *void*

___

###  newCall

▸ **newCall**(`options`: [CallOptions](../interfaces/calloptions.md)): *[Call](call.md)‹›*

*Defined in [src/TelnyxRTC.ts:26](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/TelnyxRTC.ts#L26)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *[Call](call.md)‹›*

___

###  off

▸ **off**(`eventName`: string, `callback?`: Function): *this*

*Inherited from [BaseSession](basesession.md).[off](basesession.md#off)*

*Defined in [src/Modules/Verto/BaseSession.ts:201](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L201)*

Detach a listener from the global session level

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |
`callback?` | Function |

**Returns:** *this*

void

___

###  on

▸ **on**(`eventName`: string, `callback`: Function): *this*

*Inherited from [BaseSession](basesession.md).[on](basesession.md#on)*

*Defined in [src/Modules/Verto/BaseSession.ts:192](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L192)*

Attach a listener to the global session level

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |
`callback` | Function |

**Returns:** *this*

void

___

###  refreshDevices

▸ **refreshDevices**(): *Promise‹[ICacheDevices](../interfaces/icachedevices.md)›*

*Inherited from [BrowserSession](browsersession.md).[refreshDevices](browsersession.md#refreshdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:206](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L206)*

Refresh the device list doing an enumerateDevices

**`deprecated`** 

**Returns:** *Promise‹[ICacheDevices](../interfaces/icachedevices.md)›*

___

###  refreshToken

▸ **refreshToken**(`token`: string): *Promise‹void›*

*Inherited from [BaseSession](basesession.md).[refreshToken](basesession.md#refreshtoken)*

*Defined in [src/Modules/Verto/BaseSession.ts:210](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L210)*

Refresh the

**Parameters:**

Name | Type |
------ | ------ |
`token` | string |

**Returns:** *Promise‹void›*

void

___

###  setAudioSettings

▸ **setAudioSettings**(`settings`: [IAudioSettings](../interfaces/iaudiosettings.md)): *Promise‹MediaTrackConstraints›*

*Inherited from [BrowserSession](browsersession.md).[setAudioSettings](browsersession.md#setaudiosettings)*

*Defined in [src/Modules/Verto/BrowserSession.ts:280](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L280)*

**Parameters:**

Name | Type |
------ | ------ |
`settings` | [IAudioSettings](../interfaces/iaudiosettings.md) |

**Returns:** *Promise‹MediaTrackConstraints›*

___

###  setVideoSettings

▸ **setVideoSettings**(`settings`: [IVideoSettings](../interfaces/ivideosettings.md)): *Promise‹MediaTrackConstraints›*

*Inherited from [BrowserSession](browsersession.md).[setVideoSettings](browsersession.md#setvideosettings)*

*Defined in [src/Modules/Verto/BrowserSession.ts:302](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L302)*

**Parameters:**

Name | Type |
------ | ------ |
`settings` | [IVideoSettings](../interfaces/ivideosettings.md) |

**Returns:** *Promise‹MediaTrackConstraints›*

___

###  speedTest

▸ **speedTest**(`bytes`: number): *Promise‹unknown›*

*Inherited from [BrowserSession](browsersession.md).[speedTest](browsersession.md#speedtest)*

*Defined in [src/Modules/Verto/BrowserSession.ts:118](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L118)*

**Parameters:**

Name | Type |
------ | ------ |
`bytes` | number |

**Returns:** *Promise‹unknown›*

___

###  subscribe

▸ **subscribe**(`params`: [SubscribeParams](../interfaces/subscribeparams.md)): *Promise‹any›*

*Overrides [BaseSession](basesession.md).[subscribe](basesession.md#subscribe)*

*Defined in [src/TelnyxRTC.ts:42](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/TelnyxRTC.ts#L42)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [SubscribeParams](../interfaces/subscribeparams.md) |

**Returns:** *Promise‹any›*

___

###  unsubscribe

▸ **unsubscribe**(`params`: [SubscribeParams](../interfaces/subscribeparams.md)): *Promise‹any›*

*Overrides [BaseSession](basesession.md).[unsubscribe](basesession.md#unsubscribe)*

*Defined in [src/TelnyxRTC.ts:46](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/TelnyxRTC.ts#L46)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [SubscribeParams](../interfaces/subscribeparams.md) |

**Returns:** *Promise‹any›*

___

###  validateDeviceId

▸ **validateDeviceId**(`id`: string, `label`: string, `kind`: MediaDeviceInfo["kind"]): *Promise‹string›*

*Inherited from [BrowserSession](browsersession.md).[validateDeviceId](browsersession.md#validatedeviceid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:194](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L194)*

**Parameters:**

Name | Type |
------ | ------ |
`id` | string |
`label` | string |
`kind` | MediaDeviceInfo["kind"] |

**Returns:** *Promise‹string›*

___

###  validateOptions

▸ **validateOptions**(): *boolean*

*Overrides [BaseSession](basesession.md).[validateOptions](basesession.md#validateoptions)*

*Defined in [src/TelnyxRTC.ts:22](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/TelnyxRTC.ts#L22)*

**Returns:** *boolean*

___

###  vertoBroadcast

▸ **vertoBroadcast**(`__namedParameters`: object): *void*

*Inherited from [BrowserSession](browsersession.md).[vertoBroadcast](browsersession.md#vertobroadcast)*

*Defined in [src/Modules/Verto/BrowserSession.ts:362](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L362)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *void*

___

###  vertoSubscribe

▸ **vertoSubscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BrowserSession](browsersession.md).[vertoSubscribe](browsersession.md#vertosubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:377](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L377)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

###  vertoUnsubscribe

▸ **vertoUnsubscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BrowserSession](browsersession.md).[vertoUnsubscribe](browsersession.md#vertounsubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:408](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L408)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

### `Static` off

▸ **off**(`eventName`: string): *void*

*Inherited from [BaseSession](basesession.md).[off](basesession.md#static-off)*

*Defined in [src/Modules/Verto/BaseSession.ts:483](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L483)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |

**Returns:** *void*

___

### `Static` on

▸ **on**(`eventName`: string, `callback`: any): *void*

*Inherited from [BaseSession](basesession.md).[on](basesession.md#static-on)*

*Defined in [src/Modules/Verto/BaseSession.ts:479](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L479)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |
`callback` | any |

**Returns:** *void*

___

### `Static` telnyxStateCall

▸ **telnyxStateCall**(`call`: [Call](call.md)): *[Call](call.md)‹›*

*Inherited from [BrowserSession](browsersession.md).[telnyxStateCall](browsersession.md#static-telnyxstatecall)*

*Defined in [src/Modules/Verto/BrowserSession.ts:436](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L436)*

**Parameters:**

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** *[Call](call.md)‹›*

___

### `Static` uuid

▸ **uuid**(): *string*

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#static-uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:487](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L487)*

**Returns:** *string*
