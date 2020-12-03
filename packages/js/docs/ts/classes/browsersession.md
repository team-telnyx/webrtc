[@telnyx/webrtc - v2.5.1](../README.md) › [BrowserSession](browsersession.md)

# Class: BrowserSession

## Hierarchy

* [BaseSession](basesession.md)

  ↳ **BrowserSession**

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

*Defined in [src/Modules/Verto/BrowserSession.ts:66](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L66)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) |

**Returns:** *[BrowserSession](browsersession.md)*

## Properties

###  autoRecoverCalls

• **autoRecoverCalls**: *boolean* = true

*Defined in [src/Modules/Verto/BrowserSession.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L46)*

___

###  calls

• **calls**: *object*

*Defined in [src/Modules/Verto/BrowserSession.ts:36](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L36)*

#### Type declaration:

* \[ **callId**: *string*\]: [IWebRTCCall](../interfaces/iwebrtccall.md)

___

###  camId

• **camId**: *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:42](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L42)*

___

###  camLabel

• **camLabel**: *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L44)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:38](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L38)*

___

###  micLabel

• **micLabel**: *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:40](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L40)*

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

• **relayProtocol**: *string* =  null

*Inherited from [BaseSession](basesession.md).[relayProtocol](basesession.md#relayprotocol)*

*Defined in [src/Modules/Verto/BaseSession.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L32)*

___

### `Optional` ringbackFile

• **ringbackFile**? : *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:50](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L50)*

___

### `Optional` ringtoneFile

• **ringtoneFile**? : *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L48)*

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

• **timeoutErrorCode**: *number* =  -32000

*Inherited from [BaseSession](basesession.md).[timeoutErrorCode](basesession.md#timeouterrorcode)*

*Defined in [src/Modules/Verto/BaseSession.ts:34](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L34)*

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

###  audioInDevices

• **get audioInDevices**(): *object*

*Defined in [src/Modules/Verto/BrowserSession.ts:427](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L427)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

___

###  audioOutDevices

• **get audioOutDevices**(): *object*

*Defined in [src/Modules/Verto/BrowserSession.ts:437](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L437)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

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

###  devices

• **get devices**(): *[ICacheDevices](../interfaces/icachedevices.md)*

*Defined in [src/Modules/Verto/BrowserSession.ts:348](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L348)*

**`deprecated`** 

**Returns:** *[ICacheDevices](../interfaces/icachedevices.md)*

___

###  expired

• **get expired**(): *boolean*

*Inherited from [BaseSession](basesession.md).[expired](basesession.md#expired)*

*Defined in [src/Modules/Verto/BaseSession.ts:81](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L81)*

**Returns:** *boolean*

___

###  iceServers

• **get iceServers**(): *false | true | RTCIceServer[]*

*Defined in [src/Modules/Verto/BrowserSession.ts:612](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L612)*

**Returns:** *false | true | RTCIceServer[]*

• **set iceServers**(`servers`: RTCIceServer[] | boolean): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:602](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L602)*

**Parameters:**

Name | Type |
------ | ------ |
`servers` | RTCIceServer[] &#124; boolean |

**Returns:** *void*

___

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Defined in [src/Modules/Verto/BrowserSession.ts:628](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L628)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:624](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L624)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  mediaConstraints

• **get mediaConstraints**(): *object*

*Defined in [src/Modules/Verto/BrowserSession.ts:444](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L444)*

**Returns:** *object*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Overrides [BaseSession](basesession.md).[reconnectDelay](basesession.md#reconnectdelay)*

*Defined in [src/Modules/Verto/BrowserSession.ts:75](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L75)*

**Returns:** *number*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Defined in [src/Modules/Verto/BrowserSession.ts:636](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L636)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`tag`: HTMLMediaElement | string | Function): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:632](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L632)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *void*

___

###  speaker

• **get speaker**(): *string*

*Defined in [src/Modules/Verto/BrowserSession.ts:620](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L620)*

**Returns:** *string*

• **set speaker**(`deviceId`: string): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:616](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L616)*

**Parameters:**

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** *void*

___

###  videoDevices

• **get videoDevices**(): *object*

*Defined in [src/Modules/Verto/BrowserSession.ts:417](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L417)*

**`deprecated`** 

**Returns:** *object*

* \[ **deviceId**: *string*\]: MediaDeviceInfo

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

*Inherited from [BaseSession](basesession.md).[broadcast](basesession.md#broadcast)*

*Defined in [src/Modules/Verto/BaseSession.ts:140](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L140)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:127](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L127)*

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

*Overrides [BaseSession](basesession.md).[connect](basesession.md#connect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:90](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L90)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:522](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L522)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:580](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L580)*

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

*Overrides [BaseSession](basesession.md).[disconnect](basesession.md#disconnect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:159](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L159)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:540](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L540)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:598](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L598)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:267](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L267)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:304](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L304)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:406](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L406)*

Returns supported resolution for the given webcam.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`deviceId` | string | the `deviceId` from your webcam.  ## Examples  If `deviceId` is `null`  1. if `deviceId` is `null` and you don't have a webcam connected to your computer, it will throw an error with the message `"Requested device not found"`.  2. if `deviceId` is `null` and you have one or more webcam connected to your computer, it will return a list of resolutions from the default device set up in your operating system.  Using async/await:  ```js async function() {   const client = new TelnyxRTC(options);   let result = await client.getDeviceResolutions();   console.log(result); } ```  Using ES6 `Promises`:  ```js client.getDeviceResolutions().then((result) => {   console.log(result); }); ```  If `deviceId` is **not** `null`  it will return a list of resolutions from the `deviceId` sent.  Using async/await:  ```js async function() {   const client = new TelnyxRTC(options);   let result = await client.getDeviceResolutions(deviceId);   console.log(result); } ```  Using ES6 `Promises`:  ```js client.getDeviceResolutions(deviceId).then((result) => {   console.log(result); });  |

**Returns:** *Promise‹any[]›*

___

###  getDevices

▸ **getDevices**(): *Promise‹MediaDeviceInfo[]›*

*Defined in [src/Modules/Verto/BrowserSession.ts:225](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L225)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:235](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L235)*

Return the device list supported by the browser

**Returns:** *Promise‹MediaDeviceInfo[]›*

___

###  logout

▸ **logout**(): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:144](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L144)*

Alias for .disconnect()

**`deprecated`** 

**Returns:** *void*

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

###  refreshDevices

▸ **refreshDevices**(): *Promise‹[ICacheDevices](../interfaces/icachedevices.md)›*

*Defined in [src/Modules/Verto/BrowserSession.ts:323](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L323)*

Refresh the device list doing an enumerateDevices

**`deprecated`** 

**Returns:** *Promise‹[ICacheDevices](../interfaces/icachedevices.md)›*

___

###  setAudioSettings

▸ **setAudioSettings**(`settings`: [IAudioSettings](../interfaces/iaudiosettings.md)): *Promise‹MediaTrackConstraints›*

*Defined in [src/Modules/Verto/BrowserSession.ts:476](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L476)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:544](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L544)*

**Parameters:**

Name | Type |
------ | ------ |
`settings` | [IVideoSettings](../interfaces/ivideosettings.md) |

**Returns:** *Promise‹MediaTrackConstraints›*

___

###  speedTest

▸ **speedTest**(`bytes`: number): *Promise‹unknown›*

*Defined in [src/Modules/Verto/BrowserSession.ts:166](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L166)*

**Parameters:**

Name | Type |
------ | ------ |
`bytes` | number |

**Returns:** *Promise‹unknown›*

___

###  subscribe

▸ **subscribe**(`__namedParameters`: object): *Promise‹any›*

*Inherited from [BaseSession](basesession.md).[subscribe](basesession.md#subscribe)*

*Defined in [src/Modules/Verto/BaseSession.ts:147](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L147)*

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

*Defined in [src/Modules/Verto/BaseSession.ts:171](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L171)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:311](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L311)*

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

*Defined in [src/Modules/Verto/BaseSession.ts:131](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L131)*

Validates the options passed in.
TelnyxRTC requires (login and password) OR login_token
Verto requires host, login, passwd OR password

**Returns:** *boolean*

boolean

___

###  vertoBroadcast

▸ **vertoBroadcast**(`__namedParameters`: object): *void*

*Defined in [src/Modules/Verto/BrowserSession.ts:640](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L640)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *void*

___

###  vertoSubscribe

▸ **vertoSubscribe**(`__namedParameters`: object): *Promise‹any›*

*Defined in [src/Modules/Verto/BrowserSession.ts:655](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L655)*

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

___

###  vertoUnsubscribe

▸ **vertoUnsubscribe**(`__namedParameters`: object): *Promise‹any›*

*Defined in [src/Modules/Verto/BrowserSession.ts:686](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L686)*

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

*Defined in [src/Modules/Verto/BrowserSession.ts:714](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L714)*

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
