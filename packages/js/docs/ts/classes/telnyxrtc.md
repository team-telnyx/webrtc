[@telnyx/webrtc - v2.1.0](../README.md) › [TelnyxRTC](telnyxrtc.md)

# Class: TelnyxRTC

## Hierarchy

* Verto

  ↳ **TelnyxRTC**

## Index

### Constructors

* [constructor](telnyxrtc.md#constructor)

### Properties

* [autoRecoverCalls](telnyxrtc.md#autorecovercalls)
* [calls](telnyxrtc.md#calls)
* [camId](telnyxrtc.md#camid)
* [camLabel](telnyxrtc.md#camlabel)
* [contexts](telnyxrtc.md#contexts)
* [expiresAt](telnyxrtc.md#expiresat)
* [master_nodeid](telnyxrtc.md#master_nodeid)
* [micId](telnyxrtc.md#micid)
* [micLabel](telnyxrtc.md#miclabel)
* [nodeid](telnyxrtc.md#nodeid)
* [options](telnyxrtc.md#options)
* [relayProtocol](telnyxrtc.md#relayprotocol)
* [ringbackFile](telnyxrtc.md#optional-ringbackfile)
* [ringtoneFile](telnyxrtc.md#optional-ringtonefile)
* [sessionid](telnyxrtc.md#sessionid)
* [signature](telnyxrtc.md#signature)
* [subscriptions](telnyxrtc.md#subscriptions)
* [timeoutErrorCode](telnyxrtc.md#timeouterrorcode)
* [uuid](telnyxrtc.md#uuid)

### Accessors

* [__logger](telnyxrtc.md#__logger)
* [audioInDevices](telnyxrtc.md#audioindevices)
* [audioOutDevices](telnyxrtc.md#audiooutdevices)
* [connected](telnyxrtc.md#connected)
* [devices](telnyxrtc.md#devices)
* [expired](telnyxrtc.md#expired)
* [iceServers](telnyxrtc.md#iceservers)
* [localElement](telnyxrtc.md#localelement)
* [mediaConstraints](telnyxrtc.md#mediaconstraints)
* [reconnectDelay](telnyxrtc.md#reconnectdelay)
* [remoteElement](telnyxrtc.md#remoteelement)
* [speaker](telnyxrtc.md#speaker)
* [videoDevices](telnyxrtc.md#videodevices)

### Methods

* [_existsSubscription](telnyxrtc.md#_existssubscription)
* [broadcast](telnyxrtc.md#broadcast)
* [checkPermissions](telnyxrtc.md#checkpermissions)
* [connect](telnyxrtc.md#connect)
* [disableMicrophone](telnyxrtc.md#disablemicrophone)
* [disableWebcam](telnyxrtc.md#disablewebcam)
* [disconnect](telnyxrtc.md#disconnect)
* [enableMicrophone](telnyxrtc.md#enablemicrophone)
* [enableWebcam](telnyxrtc.md#enablewebcam)
* [execute](telnyxrtc.md#execute)
* [executeRaw](telnyxrtc.md#executeraw)
* [getAudioInDevices](telnyxrtc.md#getaudioindevices)
* [getAudioOutDevices](telnyxrtc.md#getaudiooutdevices)
* [getDeviceResolutions](telnyxrtc.md#getdeviceresolutions)
* [getDevices](telnyxrtc.md#getdevices)
* [getVideoDevices](telnyxrtc.md#getvideodevices)
* [logout](telnyxrtc.md#logout)
* [newCall](telnyxrtc.md#newcall)
* [off](telnyxrtc.md#off)
* [on](telnyxrtc.md#on)
* [refreshDevices](telnyxrtc.md#refreshdevices)
* [refreshToken](telnyxrtc.md#refreshtoken)
* [setAudioSettings](telnyxrtc.md#setaudiosettings)
* [setVideoSettings](telnyxrtc.md#setvideosettings)
* [speedTest](telnyxrtc.md#speedtest)
* [subscribe](telnyxrtc.md#subscribe)
* [unsubscribe](telnyxrtc.md#unsubscribe)
* [validateDeviceId](telnyxrtc.md#validatedeviceid)
* [validateOptions](telnyxrtc.md#validateoptions)
* [vertoBroadcast](telnyxrtc.md#vertobroadcast)
* [vertoSubscribe](telnyxrtc.md#vertosubscribe)
* [vertoUnsubscribe](telnyxrtc.md#vertounsubscribe)
* [off](telnyxrtc.md#static-off)
* [on](telnyxrtc.md#static-on)
* [telnyxStateCall](telnyxrtc.md#static-telnyxstatecall)
* [uuid](telnyxrtc.md#static-uuid)

## Constructors

###  constructor

\+ **new TelnyxRTC**(`options`: [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)): *[TelnyxRTC](telnyxrtc.md)*

*Inherited from [BrowserSession](browsersession.md).[constructor](browsersession.md#constructor)*

*Overrides [BaseSession](basesession.md).[constructor](basesession.md#constructor)*

*Defined in [src/Modules/Verto/BrowserSession.ts:52](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L52)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) |

**Returns:** *[TelnyxRTC](telnyxrtc.md)*

## Properties

###  autoRecoverCalls

• **autoRecoverCalls**: *boolean* = true

*Inherited from [BrowserSession](browsersession.md).[autoRecoverCalls](browsersession.md#autorecovercalls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:32](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L32)*

___

###  calls

• **calls**: *object*

*Inherited from [BrowserSession](browsersession.md).[calls](browsersession.md#calls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:22](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L22)*

#### Type declaration:

* \[ **callId**: *string*\]: [IWebRTCCall](../interfaces/iwebrtccall.md)

___

###  camId

• **camId**: *string*

*Inherited from [BrowserSession](browsersession.md).[camId](browsersession.md#camid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:28](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L28)*

___

###  camLabel

• **camLabel**: *string*

*Inherited from [BrowserSession](browsersession.md).[camLabel](browsersession.md#camlabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:30](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L30)*

___

###  contexts

• **contexts**: *string[]* =  []

*Inherited from [BaseSession](basesession.md).[contexts](basesession.md#contexts)*

*Defined in [src/Modules/Verto/BaseSession.ts:28](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L28)*

___

###  expiresAt

• **expiresAt**: *number* = 0

*Inherited from [BaseSession](basesession.md).[expiresAt](basesession.md#expiresat)*

*Defined in [src/Modules/Verto/BaseSession.ts:25](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L25)*

___

###  master_nodeid

• **master_nodeid**: *string*

*Inherited from [BaseSession](basesession.md).[master_nodeid](basesession.md#master_nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:24](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L24)*

___

###  micId

• **micId**: *string*

*Inherited from [BrowserSession](browsersession.md).[micId](browsersession.md#micid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:24](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L24)*

___

###  micLabel

• **micLabel**: *string*

*Inherited from [BrowserSession](browsersession.md).[micLabel](browsersession.md#miclabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:26](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L26)*

___

###  nodeid

• **nodeid**: *string*

*Inherited from [BaseSession](basesession.md).[nodeid](basesession.md#nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:23](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L23)*

___

###  options

• **options**: *[ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)*

*Inherited from [BaseSession](basesession.md).[options](basesession.md#options)*

*Defined in [src/Modules/Verto/BaseSession.ts:42](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L42)*

___

###  relayProtocol

• **relayProtocol**: *string* =  VERTO_PROTOCOL

*Inherited from void*

*Overrides [BaseSession](basesession.md).[relayProtocol](basesession.md#relayprotocol)*

*Defined in [src/Modules/Verto/index.ts:15](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/index.ts#L15)*

___

### `Optional` ringbackFile

• **ringbackFile**? : *string*

*Inherited from [BrowserSession](browsersession.md).[ringbackFile](browsersession.md#optional-ringbackfile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:36](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L36)*

___

### `Optional` ringtoneFile

• **ringtoneFile**? : *string*

*Inherited from [BrowserSession](browsersession.md).[ringtoneFile](browsersession.md#optional-ringtonefile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:34](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L34)*

___

###  sessionid

• **sessionid**: *string* = ""

*Inherited from [BaseSession](basesession.md).[sessionid](basesession.md#sessionid)*

*Defined in [src/Modules/Verto/BaseSession.ts:21](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L21)*

___

###  signature

• **signature**: *string* =  null

*Inherited from [BaseSession](basesession.md).[signature](basesession.md#signature)*

*Defined in [src/Modules/Verto/BaseSession.ts:26](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L26)*

___

###  subscriptions

• **subscriptions**: *object*

*Inherited from [BaseSession](basesession.md).[subscriptions](basesession.md#subscriptions)*

*Defined in [src/Modules/Verto/BaseSession.ts:22](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L22)*

#### Type declaration:

* \[ **channel**: *string*\]: any

___

###  timeoutErrorCode

• **timeoutErrorCode**: *number* =  -329990

*Inherited from void*

*Overrides [BaseSession](basesession.md).[timeoutErrorCode](basesession.md#timeouterrorcode)*

*Defined in [src/Modules/Verto/index.ts:17](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/index.ts#L17)*

___

###  uuid

• **uuid**: *string* =  uuidv4()

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:20](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L20)*

## Accessors

###  __logger

• **get __logger**(): *Logger*

*Inherited from [BaseSession](basesession.md).[__logger](basesession.md#__logger)*

*Defined in [src/Modules/Verto/BaseSession.ts:56](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L56)*

**Returns:** *Logger*

___

###  audioInDevices

• **get audioInDevices**(): *object*

*Inherited from [BrowserSession](browsersession.md).[audioInDevices](browsersession.md#audioindevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:229](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L229)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

___

###  audioOutDevices

• **get audioOutDevices**(): *object*

*Inherited from [BrowserSession](browsersession.md).[audioOutDevices](browsersession.md#audiooutdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:237](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L237)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

___

###  connected

• **get connected**(): *boolean*

*Inherited from [BaseSession](basesession.md).[connected](basesession.md#connected)*

*Defined in [src/Modules/Verto/BaseSession.ts:60](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L60)*

**Returns:** *boolean*

___

###  devices

• **get devices**(): *[ICacheDevices](../interfaces/icachedevices.md)*

*Inherited from [BrowserSession](browsersession.md).[devices](browsersession.md#devices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:203](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L203)*

**`deprecated`** 

**Returns:** *[ICacheDevices](../interfaces/icachedevices.md)*

___

###  expired

• **get expired**(): *boolean*

*Inherited from [BaseSession](basesession.md).[expired](basesession.md#expired)*

*Defined in [src/Modules/Verto/BaseSession.ts:64](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L64)*

**Returns:** *boolean*

___

###  iceServers

• **get iceServers**(): *false | true | RTCIceServer[]*

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:288](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L288)*

**Returns:** *false | true | RTCIceServer[]*

• **set iceServers**(`servers`: RTCIceServer[] | boolean): *void*

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:280](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L280)*

**Parameters:**

Name | Type |
------ | ------ |
`servers` | RTCIceServer[] &#124; boolean |

**Returns:** *void*

___

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:304](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L304)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:300](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L300)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  mediaConstraints

• **get mediaConstraints**(): *object*

*Inherited from [BrowserSession](browsersession.md).[mediaConstraints](browsersession.md#mediaconstraints)*

*Defined in [src/Modules/Verto/BrowserSession.ts:242](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L242)*

**Returns:** *object*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Inherited from [BrowserSession](browsersession.md).[reconnectDelay](browsersession.md#reconnectdelay)*

*Overrides [BaseSession](basesession.md).[reconnectDelay](basesession.md#reconnectdelay)*

*Defined in [src/Modules/Verto/BrowserSession.ts:61](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L61)*

**Returns:** *number*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:312](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L312)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:308](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L308)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  speaker

• **get speaker**(): *string*

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:296](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L296)*

**Returns:** *string*

• **set speaker**(`deviceId`: string): *void*

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:292](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L292)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *void*

___

###  videoDevices

• **get videoDevices**(): *object*

*Inherited from [BrowserSession](browsersession.md).[videoDevices](browsersession.md#videodevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:221](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L221)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

## Methods

###  _existsSubscription

▸ **_existsSubscription**(`protocol`: string, `channel?`: string): *boolean*

*Inherited from [BaseSession](basesession.md).[_existsSubscription](basesession.md#_existssubscription)*

*Defined in [src/Modules/Verto/BaseSession.ts:335](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L335)*

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

*Inherited from void*

*Overrides [BaseSession](basesession.md).[broadcast](basesession.md#broadcast)*

*Defined in [src/Modules/Verto/index.ts:33](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/index.ts#L33)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [BroadcastParams](../interfaces/broadcastparams.md) |

**Returns:** *void*

___

###  checkPermissions

▸ **checkPermissions**(`audio`: boolean, `video`: boolean): *Promise‹boolean›*

*Inherited from [BrowserSession](browsersession.md).[checkPermissions](browsersession.md#checkpermissions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:73](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L73)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:65](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L65)*

**Returns:** *Promise‹void›*

___

###  disableMicrophone

▸ **disableMicrophone**(): *void*

*Inherited from [BrowserSession](browsersession.md).[disableMicrophone](browsersession.md#disablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:255](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L255)*

**Returns:** *void*

___

###  disableWebcam

▸ **disableWebcam**(): *void*

*Inherited from [BrowserSession](browsersession.md).[disableWebcam](browsersession.md#disablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:272](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L272)*

**Returns:** *void*

___

###  disconnect

▸ **disconnect**(): *Promise‹void›*

*Inherited from [BrowserSession](browsersession.md).[disconnect](browsersession.md#disconnect)*

*Overrides [BaseSession](basesession.md).[disconnect](basesession.md#disconnect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:94](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L94)*

Disconnect all active calls

**Returns:** *Promise‹void›*

___

###  enableMicrophone

▸ **enableMicrophone**(): *void*

*Inherited from [BrowserSession](browsersession.md).[enableMicrophone](browsersession.md#enablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:259](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L259)*

**Returns:** *void*

___

###  enableWebcam

▸ **enableWebcam**(): *void*

*Inherited from [BrowserSession](browsersession.md).[enableWebcam](browsersession.md#enablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:276](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L276)*

**Returns:** *void*

___

###  execute

▸ **execute**(`msg`: BaseMessage): *any*

*Inherited from [BaseSession](basesession.md).[execute](basesession.md#execute)*

*Defined in [src/Modules/Verto/BaseSession.ts:76](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L76)*

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

*Defined in [src/Modules/Verto/BaseSession.ts:99](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L99)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:153](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L153)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getAudioOutDevices

▸ **getAudioOutDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getAudioOutDevices](browsersession.md#getaudiooutdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:163](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L163)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`: string): *Promise‹any[]›*

*Inherited from [BrowserSession](browsersession.md).[getDeviceResolutions](browsersession.md#getdeviceresolutions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:210](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L210)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:133](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L133)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getVideoDevices

▸ **getVideoDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getVideoDevices](browsersession.md#getvideodevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:143](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L143)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  logout

▸ **logout**(): *void*

*Inherited from [BrowserSession](browsersession.md).[logout](browsersession.md#logout)*

*Defined in [src/Modules/Verto/BrowserSession.ts:87](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L87)*

Alias for .disconnect()

**`deprecated`** 

**Returns:** *void*

___

###  newCall

▸ **newCall**(`options`: [CallOptions](../interfaces/calloptions.md)): *[Call](call.md)‹›*

*Inherited from void*

*Defined in [src/Modules/Verto/index.ts:23](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/index.ts#L23)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *[Call](call.md)‹›*

___

###  off

▸ **off**(`eventName`: string, `callback?`: Function): *this*

*Inherited from [BaseSession](basesession.md).[off](basesession.md#off)*

*Defined in [src/Modules/Verto/BaseSession.ts:178](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L178)*

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

*Defined in [src/Modules/Verto/BaseSession.ts:169](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L169)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:178](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L178)*

Refresh the device list doing an enumerateDevices

**`deprecated`** 

**Returns:** *Promise‹[ICacheDevices](../interfaces/icachedevices.md)›*

___

###  refreshToken

▸ **refreshToken**(`token`: string): *Promise‹void›*

*Inherited from [BaseSession](basesession.md).[refreshToken](basesession.md#refreshtoken)*

*Defined in [src/Modules/Verto/BaseSession.ts:187](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L187)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:246](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L246)*

**Parameters:**

Name | Type |
------ | ------ |
`settings` | [IAudioSettings](../interfaces/iaudiosettings.md) |

**Returns:** *Promise‹MediaTrackConstraints›*

___

###  setVideoSettings

▸ **setVideoSettings**(`settings`: [IVideoSettings](../interfaces/ivideosettings.md)): *Promise‹MediaTrackConstraints›*

*Inherited from [BrowserSession](browsersession.md).[setVideoSettings](browsersession.md#setvideosettings)*

*Defined in [src/Modules/Verto/BrowserSession.ts:263](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L263)*

**Parameters:**

Name | Type |
------ | ------ |
`settings` | [IVideoSettings](../interfaces/ivideosettings.md) |

**Returns:** *Promise‹MediaTrackConstraints›*

___

###  speedTest

▸ **speedTest**(`bytes`: number): *Promise‹unknown›*

*Inherited from [BrowserSession](browsersession.md).[speedTest](browsersession.md#speedtest)*

*Defined in [src/Modules/Verto/BrowserSession.ts:101](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L101)*

**Parameters:**

Name | Type |
------ | ------ |
`bytes` | number |

**Returns:** *Promise‹unknown›*

___

###  subscribe

▸ **subscribe**(`params`: [SubscribeParams](../interfaces/subscribeparams.md)): *Promise‹any›*

*Inherited from void*

*Overrides [BaseSession](basesession.md).[subscribe](basesession.md#subscribe)*

*Defined in [src/Modules/Verto/index.ts:37](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/index.ts#L37)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [SubscribeParams](../interfaces/subscribeparams.md) |

**Returns:** *Promise‹any›*

___

###  unsubscribe

▸ **unsubscribe**(`params`: [SubscribeParams](../interfaces/subscribeparams.md)): *Promise‹any›*

*Inherited from void*

*Overrides [BaseSession](basesession.md).[unsubscribe](basesession.md#unsubscribe)*

*Defined in [src/Modules/Verto/index.ts:41](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/index.ts#L41)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [SubscribeParams](../interfaces/subscribeparams.md) |

**Returns:** *Promise‹any›*

___

###  validateDeviceId

▸ **validateDeviceId**(`id`: string, `label`: string, `kind`: MediaDeviceInfo["kind"]): *Promise‹string›*

*Inherited from [BrowserSession](browsersession.md).[validateDeviceId](browsersession.md#validatedeviceid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:170](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L170)*

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

*Inherited from void*

*Overrides [BaseSession](basesession.md).[validateOptions](basesession.md#validateoptions)*

*Defined in [src/Modules/Verto/index.ts:19](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/index.ts#L19)*

**Returns:** *boolean*

___

###  vertoBroadcast

▸ **vertoBroadcast**(`__namedParameters`: object): *void*

*Inherited from [BrowserSession](browsersession.md).[vertoBroadcast](browsersession.md#vertobroadcast)*

*Defined in [src/Modules/Verto/BrowserSession.ts:316](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L316)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *void*

___

###  vertoSubscribe

▸ **vertoSubscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BrowserSession](browsersession.md).[vertoSubscribe](browsersession.md#vertosubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:327](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L327)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

###  vertoUnsubscribe

▸ **vertoUnsubscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BrowserSession](browsersession.md).[vertoUnsubscribe](browsersession.md#vertounsubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:345](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L345)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

### `Static` off

▸ **off**(`eventName`: string): *void*

*Inherited from [BaseSession](basesession.md).[off](basesession.md#static-off)*

*Defined in [src/Modules/Verto/BaseSession.ts:429](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L429)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |

**Returns:** *void*

___

### `Static` on

▸ **on**(`eventName`: string, `callback`: any): *void*

*Inherited from [BaseSession](basesession.md).[on](basesession.md#static-on)*

*Defined in [src/Modules/Verto/BaseSession.ts:425](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L425)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:361](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BrowserSession.ts#L361)*

**Parameters:**

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** *[Call](call.md)‹›*

___

### `Static` uuid

▸ **uuid**(): *string*

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#static-uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:433](https://github.com/team-telnyx/webrtc/blob/649bf48/src/Modules/Verto/BaseSession.ts#L433)*

**Returns:** *string*
