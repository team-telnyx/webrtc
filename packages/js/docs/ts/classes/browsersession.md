[@telnyx/webrtc - v2.2.1](../README.md) › [BrowserSession](browsersession.md)

# Class: BrowserSession

## Hierarchy

* [BaseSession](basesession.md)

  ↳ **BrowserSession**

  ↳ [Verto](verto.md)

## Index

### Constructors

* [constructor](browsersession.md#constructor)

### Properties

* [autoRecoverCalls](browsersession.md#autorecovercalls)
* [calls](browsersession.md#calls)
* [camId](browsersession.md#camid)
* [camLabel](browsersession.md#camlabel)
* [contexts](browsersession.md#contexts)
* [expiresAt](browsersession.md#expiresat)
* [master_nodeid](browsersession.md#master_nodeid)
* [micId](browsersession.md#micid)
* [micLabel](browsersession.md#miclabel)
* [nodeid](browsersession.md#nodeid)
* [options](browsersession.md#options)
* [relayProtocol](browsersession.md#relayprotocol)
* [ringbackFile](browsersession.md#optional-ringbackfile)
* [ringtoneFile](browsersession.md#optional-ringtonefile)
* [sessionid](browsersession.md#sessionid)
* [signature](browsersession.md#signature)
* [subscriptions](browsersession.md#subscriptions)
* [timeoutErrorCode](browsersession.md#timeouterrorcode)
* [uuid](browsersession.md#uuid)

### Accessors

* [__logger](browsersession.md#__logger)
* [audioInDevices](browsersession.md#audioindevices)
* [audioOutDevices](browsersession.md#audiooutdevices)
* [connected](browsersession.md#connected)
* [devices](browsersession.md#devices)
* [expired](browsersession.md#expired)
* [iceServers](browsersession.md#iceservers)
* [localElement](browsersession.md#localelement)
* [mediaConstraints](browsersession.md#mediaconstraints)
* [reconnectDelay](browsersession.md#reconnectdelay)
* [remoteElement](browsersession.md#remoteelement)
* [speaker](browsersession.md#speaker)
* [videoDevices](browsersession.md#videodevices)

### Methods

* [_existsSubscription](browsersession.md#_existssubscription)
* [broadcast](browsersession.md#broadcast)
* [checkPermissions](browsersession.md#checkpermissions)
* [connect](browsersession.md#connect)
* [disableMicrophone](browsersession.md#disablemicrophone)
* [disableWebcam](browsersession.md#disablewebcam)
* [disconnect](browsersession.md#disconnect)
* [enableMicrophone](browsersession.md#enablemicrophone)
* [enableWebcam](browsersession.md#enablewebcam)
* [execute](browsersession.md#execute)
* [executeRaw](browsersession.md#executeraw)
* [getAudioInDevices](browsersession.md#getaudioindevices)
* [getAudioOutDevices](browsersession.md#getaudiooutdevices)
* [getDeviceResolutions](browsersession.md#getdeviceresolutions)
* [getDevices](browsersession.md#getdevices)
* [getVideoDevices](browsersession.md#getvideodevices)
* [logout](browsersession.md#logout)
* [off](browsersession.md#off)
* [on](browsersession.md#on)
* [refreshDevices](browsersession.md#refreshdevices)
* [refreshToken](browsersession.md#refreshtoken)
* [setAudioSettings](browsersession.md#setaudiosettings)
* [setVideoSettings](browsersession.md#setvideosettings)
* [speedTest](browsersession.md#speedtest)
* [subscribe](browsersession.md#subscribe)
* [unsubscribe](browsersession.md#unsubscribe)
* [validateDeviceId](browsersession.md#validatedeviceid)
* [validateOptions](browsersession.md#validateoptions)
* [vertoBroadcast](browsersession.md#vertobroadcast)
* [vertoSubscribe](browsersession.md#vertosubscribe)
* [vertoUnsubscribe](browsersession.md#vertounsubscribe)
* [off](browsersession.md#static-off)
* [on](browsersession.md#static-on)
* [telnyxStateCall](browsersession.md#static-telnyxstatecall)
* [uuid](browsersession.md#static-uuid)

## Constructors

###  constructor

\+ **new BrowserSession**(`options`: [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)): *[BrowserSession](browsersession.md)*

*Overrides [BaseSession](basesession.md).[constructor](basesession.md#constructor)*

*Defined in [src/Modules/Verto/BrowserSession.ts:66](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L66)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) |

**Returns:** *[BrowserSession](browsersession.md)*

## Properties

###  autoRecoverCalls

• **autoRecoverCalls**: *boolean* = true

*Defined in [src/Modules/Verto/BrowserSession.ts:46](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L46)*

___

###  calls

• **calls**: *object*

*Defined in [src/Modules/Verto/BrowserSession.ts:36](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L36)*

#### Type declaration:

* \[ **callId**: *string*\]: [IWebRTCCall](../interfaces/iwebrtccall.md)

___

###  camId

• **camId**: *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:42](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L42)*

___

###  camLabel

• **camLabel**: *string*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:38](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L38)*

___

###  micLabel

• **micLabel**: *string*

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

• **relayProtocol**: *string* =  null

*Inherited from [BaseSession](basesession.md).[relayProtocol](basesession.md#relayprotocol)*

*Defined in [src/Modules/Verto/BaseSession.ts:37](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L37)*

___

### `Optional` ringbackFile

• **ringbackFile**? : *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:50](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L50)*

___

### `Optional` ringtoneFile

• **ringtoneFile**? : *string*

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

• **timeoutErrorCode**: *number* =  -32000

*Inherited from [BaseSession](basesession.md).[timeoutErrorCode](basesession.md#timeouterrorcode)*

*Defined in [src/Modules/Verto/BaseSession.ts:39](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L39)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:259](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L259)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

___

###  audioOutDevices

• **get audioOutDevices**(): *object*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:334](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L334)*

**Returns:** *false | true | RTCIceServer[]*

• **set iceServers**(`servers`: RTCIceServer[] | boolean): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:324](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L324)*

**Parameters:**

Name | Type |
------ | ------ |
`servers` | RTCIceServer[] &#124; boolean |

**Returns:** *void*

___

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Defined in [src/Modules/Verto/BrowserSession.ts:350](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L350)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:346](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L346)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  mediaConstraints

• **get mediaConstraints**(): *object*

*Defined in [src/Modules/Verto/BrowserSession.ts:276](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L276)*

**Returns:** *object*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Overrides [BaseSession](basesession.md).[reconnectDelay](basesession.md#reconnectdelay)*

*Defined in [src/Modules/Verto/BrowserSession.ts:75](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L75)*

**Returns:** *number*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Defined in [src/Modules/Verto/BrowserSession.ts:358](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L358)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:354](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L354)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  speaker

• **get speaker**(): *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:342](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L342)*

**Returns:** *string*

• **set speaker**(`deviceId`: string): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:338](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L338)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *void*

___

###  videoDevices

• **get videoDevices**(): *object*

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

*Inherited from [BaseSession](basesession.md).[broadcast](basesession.md#broadcast)*

*Defined in [src/Modules/Verto/BaseSession.ts:133](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L133)*

Broadcast a message in a protocol - channel

**`todo`** Implement it

**Parameters:**

Name | Type |
------ | ------ |
`params` | [BroadcastParams](../interfaces/broadcastparams.md) |

**Returns:** *void*

void

___

###  checkPermissions

▸ **checkPermissions**(`audio`: boolean, `video`: boolean): *Promise‹boolean›*

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

*Overrides [BaseSession](basesession.md).[connect](basesession.md#connect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:79](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L79)*

**Returns:** *Promise‹void›*

___

###  disableMicrophone

▸ **disableMicrophone**(): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:294](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L294)*

**Returns:** *void*

___

###  disableWebcam

▸ **disableWebcam**(): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:316](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L316)*

**Returns:** *void*

___

###  disconnect

▸ **disconnect**(): *Promise‹void›*

*Overrides [BaseSession](basesession.md).[disconnect](basesession.md#disconnect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:111](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L111)*

Disconnect all active calls

**Returns:** *Promise‹void›*

___

###  enableMicrophone

▸ **enableMicrophone**(): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:298](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L298)*

**Returns:** *void*

___

###  enableWebcam

▸ **enableWebcam**(): *void*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:177](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L177)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getAudioOutDevices

▸ **getAudioOutDevices**(): *Promise‹MediaDeviceInfo[]›*

*Defined in [src/Modules/Verto/BrowserSession.ts:187](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L187)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`: string): *Promise‹any[]›*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:157](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L157)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getVideoDevices

▸ **getVideoDevices**(): *Promise‹MediaDeviceInfo[]›*

*Defined in [src/Modules/Verto/BrowserSession.ts:167](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L167)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  logout

▸ **logout**(): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:104](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L104)*

Alias for .disconnect()

**`deprecated`** 

**Returns:** *void*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:280](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L280)*

**Parameters:**

Name | Type |
------ | ------ |
`settings` | [IAudioSettings](../interfaces/iaudiosettings.md) |

**Returns:** *Promise‹MediaTrackConstraints›*

___

###  setVideoSettings

▸ **setVideoSettings**(`settings`: [IVideoSettings](../interfaces/ivideosettings.md)): *Promise‹MediaTrackConstraints›*

*Defined in [src/Modules/Verto/BrowserSession.ts:302](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L302)*

**Parameters:**

Name | Type |
------ | ------ |
`settings` | [IVideoSettings](../interfaces/ivideosettings.md) |

**Returns:** *Promise‹MediaTrackConstraints›*

___

###  speedTest

▸ **speedTest**(`bytes`: number): *Promise‹unknown›*

*Defined in [src/Modules/Verto/BrowserSession.ts:118](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L118)*

**Parameters:**

Name | Type |
------ | ------ |
`bytes` | number |

**Returns:** *Promise‹unknown›*

___

###  subscribe

▸ **subscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BaseSession](basesession.md).[subscribe](basesession.md#subscribe)*

*Defined in [src/Modules/Verto/BaseSession.ts:140](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L140)*

Subscribe to Blade protocol channels

**`async`** 

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

Result of the ADD subscription

___

###  unsubscribe

▸ **unsubscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BaseSession](basesession.md).[unsubscribe](basesession.md#unsubscribe)*

*Defined in [src/Modules/Verto/BaseSession.ts:164](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L164)*

Unsubscribe from Blade protocol channels

**`async`** 

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

Result of the REMOVE subscription

___

###  validateDeviceId

▸ **validateDeviceId**(`id`: string, `label`: string, `kind`: MediaDeviceInfo["kind"]): *Promise‹string›*

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

*Inherited from [BaseSession](basesession.md).[validateOptions](basesession.md#validateoptions)*

*Defined in [src/Modules/Verto/BaseSession.ts:124](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BaseSession.ts#L124)*

Validates the options passed in.
TelnyxRTC requires (login and password) OR login_token
Verto requires host, login, passwd OR password

**Returns:** *boolean*

boolean

___

###  vertoBroadcast

▸ **vertoBroadcast**(`__namedParameters`: object): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:362](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L362)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *void*

___

###  vertoSubscribe

▸ **vertoSubscribe**(`__namedParameters`: object): *Promise‹any›*

*Defined in [src/Modules/Verto/BrowserSession.ts:377](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/BrowserSession.ts#L377)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

###  vertoUnsubscribe

▸ **vertoUnsubscribe**(`__namedParameters`: object): *Promise‹any›*

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
