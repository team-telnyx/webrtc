[@telnyx/webrtc - v2.2.2](../README.md) › [TelnyxRTC](telnyxrtc.md)

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
* [connected](telnyxrtc.md#connected)
* [expired](telnyxrtc.md#expired)
* [iceServers](telnyxrtc.md#iceservers)
* [localElement](telnyxrtc.md#localelement)
* [mediaConstraints](telnyxrtc.md#mediaconstraints)
* [reconnectDelay](telnyxrtc.md#reconnectdelay)
* [remoteElement](telnyxrtc.md#remoteelement)
* [speaker](telnyxrtc.md#speaker)

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

*Overrides [BrowserSession](browsersession.md).[constructor](browsersession.md#constructor)*

*Defined in [src/TelnyxRTC.ts:4](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TelnyxRTC.ts#L4)*

Creates a new `TelnyxRTC` instance with the provided options.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) | An object with options. |

**Returns:** *[TelnyxRTC](telnyxrtc.md)*

## Properties

###  autoRecoverCalls

• **autoRecoverCalls**: *boolean* = true

*Inherited from [BrowserSession](browsersession.md).[autoRecoverCalls](browsersession.md#autorecovercalls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:45](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L45)*

___

###  calls

• **calls**: *object*

*Inherited from [BrowserSession](browsersession.md).[calls](browsersession.md#calls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:35](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L35)*

#### Type declaration:

* \[ **callId**: *string*\]: [IWebRTCCall](../interfaces/iwebrtccall.md)

___

###  camId

• **camId**: *string*

*Inherited from [BrowserSession](browsersession.md).[camId](browsersession.md#camid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:41](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L41)*

___

###  camLabel

• **camLabel**: *string*

*Inherited from [BrowserSession](browsersession.md).[camLabel](browsersession.md#camlabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:43](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L43)*

___

###  contexts

• **contexts**: *string[]* =  []

*Inherited from [BaseSession](basesession.md).[contexts](basesession.md#contexts)*

*Defined in [src/Modules/Verto/BaseSession.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L33)*

___

###  expiresAt

• **expiresAt**: *number* = 0

*Inherited from [BaseSession](basesession.md).[expiresAt](basesession.md#expiresat)*

*Defined in [src/Modules/Verto/BaseSession.ts:30](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L30)*

___

###  master_nodeid

• **master_nodeid**: *string*

*Inherited from [BaseSession](basesession.md).[master_nodeid](basesession.md#master_nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:29](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L29)*

___

###  micId

• **micId**: *string*

*Inherited from [BrowserSession](browsersession.md).[micId](browsersession.md#micid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:37](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L37)*

___

###  micLabel

• **micLabel**: *string*

*Inherited from [BrowserSession](browsersession.md).[micLabel](browsersession.md#miclabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:39](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L39)*

___

###  nodeid

• **nodeid**: *string*

*Inherited from [BaseSession](basesession.md).[nodeid](basesession.md#nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:28](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L28)*

___

###  options

• **options**: *[ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)*

*Inherited from [BaseSession](basesession.md).[options](basesession.md#options)*

*Defined in [src/Modules/Verto/BaseSession.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L47)*

___

###  relayProtocol

• **relayProtocol**: *string* =  VERTO_PROTOCOL

*Inherited from void*

*Overrides [BaseSession](basesession.md).[relayProtocol](basesession.md#relayprotocol)*

*Defined in [src/Modules/Verto/index.ts:16](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L16)*

___

### `Optional` ringbackFile

• **ringbackFile**? : *string*

*Inherited from [BrowserSession](browsersession.md).[ringbackFile](browsersession.md#optional-ringbackfile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L49)*

___

### `Optional` ringtoneFile

• **ringtoneFile**? : *string*

*Inherited from [BrowserSession](browsersession.md).[ringtoneFile](browsersession.md#optional-ringtonefile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L47)*

___

###  sessionid

• **sessionid**: *string* = ""

*Inherited from [BaseSession](basesession.md).[sessionid](basesession.md#sessionid)*

*Defined in [src/Modules/Verto/BaseSession.ts:26](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L26)*

___

###  signature

• **signature**: *string* =  null

*Inherited from [BaseSession](basesession.md).[signature](basesession.md#signature)*

*Defined in [src/Modules/Verto/BaseSession.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L31)*

___

###  subscriptions

• **subscriptions**: *object*

*Inherited from [BaseSession](basesession.md).[subscriptions](basesession.md#subscriptions)*

*Defined in [src/Modules/Verto/BaseSession.ts:27](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L27)*

#### Type declaration:

* \[ **channel**: *string*\]: any

___

###  timeoutErrorCode

• **timeoutErrorCode**: *number* =  -329990

*Inherited from void*

*Overrides [BaseSession](basesession.md).[timeoutErrorCode](basesession.md#timeouterrorcode)*

*Defined in [src/Modules/Verto/index.ts:18](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L18)*

___

###  uuid

• **uuid**: *string* =  uuidv4()

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L25)*

## Accessors

###  __logger

• **get __logger**(): *Logger*

*Inherited from [BaseSession](basesession.md).[__logger](basesession.md#__logger)*

*Defined in [src/Modules/Verto/BaseSession.ts:60](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L60)*

**Returns:** *Logger*

___

###  connected

• **get connected**(): *boolean | null*

*Inherited from [BaseSession](basesession.md).[connected](basesession.md#connected)*

*Defined in [src/Modules/Verto/BaseSession.ts:77](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L77)*

`true` if the client is connected to the Telnyx RTC server

**`example`** 

```js
const client = new TelnyxRTC(options);
console.log(client.connected); // => false
```

**`readonly`** 

**`type`** {boolean | null}

**Returns:** *boolean | null*

___

###  expired

• **get expired**(): *boolean*

*Inherited from [BaseSession](basesession.md).[expired](basesession.md#expired)*

*Defined in [src/Modules/Verto/BaseSession.ts:81](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L81)*

**Returns:** *boolean*

___

###  iceServers

• **get iceServers**(): *false | true | RTCIceServer[]*

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:580](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L580)*

**Returns:** *false | true | RTCIceServer[]*

• **set iceServers**(`servers`: RTCIceServer[] | boolean): *void*

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:570](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L570)*

**Parameters:**

Name | Type |
------ | ------ |
`servers` | RTCIceServer[] &#124; boolean |

**Returns:** *void*

___

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:596](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L596)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:592](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L592)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  mediaConstraints

• **get mediaConstraints**(): *object*

*Inherited from [BrowserSession](browsersession.md).[mediaConstraints](browsersession.md#mediaconstraints)*

*Defined in [src/Modules/Verto/BrowserSession.ts:378](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L378)*

**Returns:** *object*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Inherited from [BrowserSession](browsersession.md).[reconnectDelay](browsersession.md#reconnectdelay)*

*Overrides [BaseSession](basesession.md).[reconnectDelay](basesession.md#reconnectdelay)*

*Defined in [src/Modules/Verto/BrowserSession.ts:72](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L72)*

**Returns:** *number*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:604](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L604)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:600](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L600)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  speaker

• **get speaker**(): *string*

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:588](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L588)*

**Returns:** *string*

• **set speaker**(`deviceId`: string): *void*

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:584](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L584)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *void*

## Methods

###  _existsSubscription

▸ **_existsSubscription**(`protocol`: string, `channel?`: string): *boolean*

*Inherited from [BaseSession](basesession.md).[_existsSubscription](basesession.md#_existssubscription)*

*Defined in [src/Modules/Verto/BaseSession.ts:362](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L362)*

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

*Defined in [src/Modules/Verto/index.ts:34](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L34)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [BroadcastParams](../interfaces/broadcastparams.md) |

**Returns:** *void*

___

###  checkPermissions

▸ **checkPermissions**(`audio`: boolean, `video`: boolean): *Promise‹boolean›*

*Inherited from [BrowserSession](browsersession.md).[checkPermissions](browsersession.md#checkpermissions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:124](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L124)*

Checks if the browser has the permission to access mic and/or webcam

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`audio` | boolean | true | Whether to check for microphone permissions. |
`video` | boolean | true | Whether to check for webcam permissions.  ## Examples  Checking for audio and video permissions:  ```js const client = new TelnyxRTC(options);  client.checkPermissions(); ```  Checking only for audio permissions:  ```js const client = new TelnyxRTC(options);  client.checkPermissions(true, false); ```  Checking only for video permissions:  ```js const client = new TelnyxRTC(options);  client.checkPermissions(false, true); ```  |

**Returns:** *Promise‹boolean›*

___

###  connect

▸ **connect**(): *Promise‹void›*

*Inherited from [BrowserSession](browsersession.md).[connect](browsersession.md#connect)*

*Overrides [BaseSession](basesession.md).[connect](basesession.md#connect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:87](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L87)*

Creates a new connection for exchanging data with the WebRTC server

## Examples

```js
const client = new TelnyxRTC(options);

client.connect();
```

**Returns:** *Promise‹void›*

___

###  disableMicrophone

▸ **disableMicrophone**(): *void*

*Inherited from [BrowserSession](browsersession.md).[disableMicrophone](browsersession.md#disablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:456](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L456)*

Disables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: true` is
specified when creating a new call.

## Examples

```js
const client = new TelnyxRTC(options);

client.disableMicrophone();
```

Keep in mind that new calls will fail if both the
microphone and webcam is disabled. Make sure that the
webcam is manually enabled, or `video: true` is
specified before disabling the microphone.

```js
const client = new TelnyxRTC({
  ...options,
  video: true
});

client.disableMicrophone();
```

**Returns:** *void*

___

###  disableWebcam

▸ **disableWebcam**(): *void*

*Inherited from [BrowserSession](browsersession.md).[disableWebcam](browsersession.md#disablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:548](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L548)*

Disables use of the webcam in subsequent calls.

Note: This method will disable the video even if `video: true` is specified.

## Examples

```js
const client = new TelnyxRTC(options);

client.disableWebcam();
```

```js
const client = new TelnyxRTC({
  ...options,
  video: true
});

client.disableWebcam();
```

**Returns:** *void*

___

###  disconnect

▸ **disconnect**(): *Promise‹void›*

*Inherited from [BrowserSession](browsersession.md).[disconnect](browsersession.md#disconnect)*

*Overrides [BaseSession](basesession.md).[disconnect](basesession.md#disconnect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:156](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L156)*

Disconnect all active calls

## Examples

```js
const client = new TelnyxRTC(options);

client.disconnect();
```

**Returns:** *Promise‹void›*

___

###  enableMicrophone

▸ **enableMicrophone**(): *void*

*Inherited from [BrowserSession](browsersession.md).[enableMicrophone](browsersession.md#enablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:474](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L474)*

Enables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: false` is
specified when creating a new call.

## Examples

```js
const client = new TelnyxRTC(options);

client.enableMicrophone();
```

**Returns:** *void*

___

###  enableWebcam

▸ **enableWebcam**(): *void*

*Inherited from [BrowserSession](browsersession.md).[enableWebcam](browsersession.md#enablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:566](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L566)*

Enables use of the webcam in subsequent calls.

Note: This setting will be ignored if `video: false` is
specified when creating a new call.

## Examples

```js
const client = new TelnyxRTC(options);

client.enableWebcam();
```

**Returns:** *void*

___

###  execute

▸ **execute**(`msg`: BaseMessage): *any*

*Inherited from [BaseSession](basesession.md).[execute](basesession.md#execute)*

*Defined in [src/Modules/Verto/BaseSession.ts:93](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L93)*

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

*Defined in [src/Modules/Verto/BaseSession.ts:117](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L117)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:264](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L264)*

Return the audio output devices supported by the browser.

## Examples

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);

  let result = await client.getAudioInDevices();

  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getAudioInDevices().then((result) => {
  console.log(result);
});
```

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getAudioOutDevices

▸ **getAudioOutDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getAudioOutDevices](browsersession.md#getaudiooutdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:301](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L301)*

Returns the audio output devices supported by the browser.

Browser Compatibility Note: Firefox has yet to fully implement
audio output devices. As of v63, this feature is behind the
user preference `media.setsinkid.enabled`.
See: https://bugzilla.mozilla.org/show_bug.cgi?id=1152401#c98

## Examples

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);

  let result = await client.getAudioOutDevices();

  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getAudioOutDevices().then((result) => {
  console.log(result);
});
```

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`: string): *Promise‹any[]›*

*Inherited from [BrowserSession](browsersession.md).[getDeviceResolutions](browsersession.md#getdeviceresolutions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:370](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L370)*

Returns supported resolution for the given webcam.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`deviceId` | string | the `deviceId` from your webcam.  ## Examples  If `deviceId` is `null`  1. if `deviceId` is `null` and you don't have a webcam connected to your computer, it will throw an error with the message `"Requested device not found"`.  2. if `deviceId` is `null` and you have one or more webcam connected to your computer, it will return a list of resolutions from the default device set up in your operating system.  Using async/await:  ```js async function() {   const client = new TelnyxRTC(options);   let result = await client.getDeviceResolutions();   console.log(result); } ```  Using ES6 `Promises`:  ```js client.getDeviceResolutions().then((result) => {   console.log(result); }); ```  If `deviceId` is **not** `null`  it will return a list of resolutions from the `deviceId` sent.  Using async/await:  ```js async function() {   const client = new TelnyxRTC(options);   let result = await client.getDeviceResolutions(deviceId);   console.log(result); } ```  Using ES6 `Promises`:  ```js client.getDeviceResolutions(deviceId).then((result) => {   console.log(result); });  |

**Returns:** *Promise‹any[]›*

___

###  getDevices

▸ **getDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getDevices](browsersession.md#getdevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:222](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L222)*

Returns a list of devices supported by the browser

## Examples

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDevices();
  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getDevices().then((result) => {
  console.log(result);
});
```

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  getVideoDevices

▸ **getVideoDevices**(): *Promise‹MediaDeviceInfo[]›*

*Inherited from [BrowserSession](browsersession.md).[getVideoDevices](browsersession.md#getvideodevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:232](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L232)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  logout

▸ **logout**(): *void*

*Inherited from [BrowserSession](browsersession.md).[logout](browsersession.md#logout)*

*Defined in [src/Modules/Verto/BrowserSession.ts:141](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L141)*

Alias for .disconnect()

**`deprecated`** 

**Returns:** *void*

___

###  newCall

▸ **newCall**(`options`: [CallOptions](../interfaces/calloptions.md)): *[Call](call.md)‹›*

*Inherited from void*

*Defined in [src/Modules/Verto/index.ts:24](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L24)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *[Call](call.md)‹›*

___

###  off

▸ **off**(`eventName`: string, `callback?`: Function): *this*

*Inherited from [BaseSession](basesession.md).[off](basesession.md#off)*

*Defined in [src/Modules/Verto/BaseSession.ts:251](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L251)*

Removes an event handler that were attached with .on().
If no handler parameter is passed, all listeners for that event will be removed.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback?` | Function | Function handler to be removed.  |

**Returns:** *this*

The client object itself.

Note: a handler will be removed from the stack by reference
so make sure to use the same reference in both `.on()` and `.off()` methods.

## Examples

Subscribe to the `telnyx.error` and then, remove the event handler.

```js
const errorHandler = (error) => {
 // Log the error..
}

const client = new TelnyxRTC(options);

client.on('telnyx.error', errorHandler)

 // .. later
client.off('telnyx.error', errorHandler)
```

___

###  on

▸ **on**(`eventName`: string, `callback`: Function): *this*

*Inherited from [BaseSession](basesession.md).[on](basesession.md#on)*

*Defined in [src/Modules/Verto/BaseSession.ts:217](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L217)*

Attaches an event handler for a specific type of event.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback` | Function | Function to call when the event comes.  |

**Returns:** *this*

The client object itself.

## Examples

Subscribe to the `telnyx.ready` and `telnyx.error` events.

```js
const client = new TelnyxRTC(options);

client.on('telnyx.ready', (client) => {
  // Your client is ready!
}).on('telnyx.error', (error) => {
  // Got an error...
})
```

___

###  setAudioSettings

▸ **setAudioSettings**(`settings`: [IAudioSettings](../interfaces/iaudiosettings.md)): *Promise‹MediaTrackConstraints›*

*Inherited from [BrowserSession](browsersession.md).[setAudioSettings](browsersession.md#setaudiosettings)*

*Defined in [src/Modules/Verto/BrowserSession.ts:410](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L410)*

Sets the default `audio` constraints for your client. [See here](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_audio_tracks) for further details.

Note: It's a common behaviour, in WebRTC applications,
to persist devices user's selection to then reuse them across visits.
Due to a Webkit’s security protocols, Safari generates random `deviceId` on each page load.
To avoid this issue you can specify two additional properties
`micId` and `micLabel` in the constraints input parameter.
The client will use these values to assure the microphone you want to use is available
by matching both id and label with the device list retrieved from the browser.

**`examples`** 

Set microphone by `id` and `label` with the `echoCancellation` flag turned off:

```js
// within an async function
const constraints = await client.setAudioSettings({
 micId: '772e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
 micLabel: 'Internal Microphone (Built-in)',
 echoCancellation: false
})
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`settings` | [IAudioSettings](../interfaces/iaudiosettings.md) | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `micId` and `micLabel`.  |

**Returns:** *Promise‹MediaTrackConstraints›*

`Promise<MediaTrackConstraints>` Audio constraints applied to the client.

___

###  setVideoSettings

▸ **setVideoSettings**(`settings`: [IVideoSettings](../interfaces/ivideosettings.md)): *Promise‹MediaTrackConstraints›*

*Inherited from [BrowserSession](browsersession.md).[setVideoSettings](browsersession.md#setvideosettings)*

*Defined in [src/Modules/Verto/BrowserSession.ts:507](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L507)*

Sets the default `video` constraints for your client. [See here](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_video_tracks) for further details.

Note: It's a common behaviour, in WebRTC applications,
to persist devices user's selection to then reuse them across visits.
Due to a Webkit’s security protocols, Safari generates random `deviceId` on each page load.
To avoid this issue you can specify two additional properties
`camId` and `camLabel` in the constraints input parameter.
The client will use these values to assure the webcam you want to use is available
by matching both `id` and `label` with the device list retrieved from the browser.

**`examples`** 

Set webcam by `id` and `label` with 720p resolution.

```js
// within an async function
const constraints = await client.setVideoSettings({
 camId: '882e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
 camLabel: 'Default WebCam (Built-in)',
 width: 1080,
 height: 720
})
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`settings` | [IVideoSettings](../interfaces/ivideosettings.md) | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `camId` and `camLabel`.  |

**Returns:** *Promise‹MediaTrackConstraints›*

`Promise<MediaTrackConstraints>` Video constraints applied to the client.

___

###  speedTest

▸ **speedTest**(`bytes`: number): *Promise‹unknown›*

*Inherited from [BrowserSession](browsersession.md).[speedTest](browsersession.md#speedtest)*

*Defined in [src/Modules/Verto/BrowserSession.ts:163](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L163)*

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

*Defined in [src/Modules/Verto/index.ts:38](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L38)*

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

*Defined in [src/Modules/Verto/index.ts:42](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L42)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | [SubscribeParams](../interfaces/subscribeparams.md) |

**Returns:** *Promise‹any›*

___

###  validateDeviceId

▸ **validateDeviceId**(`id`: string, `label`: string, `kind`: MediaDeviceInfo["kind"]): *Promise‹string›*

*Inherited from [BrowserSession](browsersession.md).[validateDeviceId](browsersession.md#validatedeviceid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:308](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L308)*

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

*Defined in [src/Modules/Verto/index.ts:20](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L20)*

**Returns:** *boolean*

___

###  vertoBroadcast

▸ **vertoBroadcast**(`__namedParameters`: object): *void*

*Inherited from [BrowserSession](browsersession.md).[vertoBroadcast](browsersession.md#vertobroadcast)*

*Defined in [src/Modules/Verto/BrowserSession.ts:608](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L608)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *void*

___

###  vertoSubscribe

▸ **vertoSubscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BrowserSession](browsersession.md).[vertoSubscribe](browsersession.md#vertosubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:623](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L623)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

###  vertoUnsubscribe

▸ **vertoUnsubscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BrowserSession](browsersession.md).[vertoUnsubscribe](browsersession.md#vertounsubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:654](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L654)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

### `Static` off

▸ **off**(`eventName`: string): *void*

*Inherited from [BaseSession](basesession.md).[off](basesession.md#static-off)*

*Defined in [src/Modules/Verto/BaseSession.ts:444](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L444)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |

**Returns:** *void*

___

### `Static` on

▸ **on**(`eventName`: string, `callback`: any): *void*

*Inherited from [BaseSession](basesession.md).[on](basesession.md#static-on)*

*Defined in [src/Modules/Verto/BaseSession.ts:440](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L440)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:682](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L682)*

**Parameters:**

Name | Type |
------ | ------ |
`call` | [Call](call.md) |

**Returns:** *[Call](call.md)‹›*

___

### `Static` uuid

▸ **uuid**(): *string*

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#static-uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:448](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L448)*

**Returns:** *string*
