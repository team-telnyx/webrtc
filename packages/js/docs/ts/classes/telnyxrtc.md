**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / TelnyxRTC

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
* [master\_nodeid](telnyxrtc.md#master_nodeid)
* [micId](telnyxrtc.md#micid)
* [micLabel](telnyxrtc.md#miclabel)
* [nodeid](telnyxrtc.md#nodeid)
* [options](telnyxrtc.md#options)
* [relayProtocol](telnyxrtc.md#relayprotocol)
* [ringbackFile](telnyxrtc.md#ringbackfile)
* [ringtoneFile](telnyxrtc.md#ringtonefile)
* [sessionid](telnyxrtc.md#sessionid)
* [signature](telnyxrtc.md#signature)
* [subscriptions](telnyxrtc.md#subscriptions)
* [timeoutErrorCode](telnyxrtc.md#timeouterrorcode)
* [uuid](telnyxrtc.md#uuid)

### Accessors

* [\_\_logger](telnyxrtc.md#__logger)
* [connected](telnyxrtc.md#connected)
* [iceServers](telnyxrtc.md#iceservers)
* [localElement](telnyxrtc.md#localelement)
* [mediaConstraints](telnyxrtc.md#mediaconstraints)
* [reconnectDelay](telnyxrtc.md#reconnectdelay)
* [remoteElement](telnyxrtc.md#remoteelement)
* [speaker](telnyxrtc.md#speaker)

### Methods

* [\_existsSubscription](telnyxrtc.md#_existssubscription)
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
* [off](telnyxrtc.md#off)
* [on](telnyxrtc.md#on)
* [telnyxStateCall](telnyxrtc.md#telnyxstatecall)
* [uuid](telnyxrtc.md#uuid)

## Constructors

### constructor

\+ **new TelnyxRTC**(`options`: ITelnyxRTCOptions): [TelnyxRTC](telnyxrtc.md)

*Overrides [BrowserSession](browsersession.md).[constructor](browsersession.md#constructor)*

*Defined in [src/TelnyxRTC.ts:4](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TelnyxRTC.ts#L4)*

Creates a new `TelnyxRTC` instance with the provided options.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`options` | ITelnyxRTCOptions | An object with options. |

**Returns:** [TelnyxRTC](telnyxrtc.md)

## Properties

### autoRecoverCalls

•  **autoRecoverCalls**: boolean = true

*Inherited from [BrowserSession](browsersession.md).[autoRecoverCalls](browsersession.md#autorecovercalls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:45](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L45)*

___

### calls

•  **calls**: { [callId:string]: IWebRTCCall;  }

*Inherited from [BrowserSession](browsersession.md).[calls](browsersession.md#calls)*

*Defined in [src/Modules/Verto/BrowserSession.ts:35](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L35)*

___

### camId

•  **camId**: string

*Inherited from [BrowserSession](browsersession.md).[camId](browsersession.md#camid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:41](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L41)*

___

### camLabel

•  **camLabel**: string

*Inherited from [BrowserSession](browsersession.md).[camLabel](browsersession.md#camlabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:43](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L43)*

___

### contexts

•  **contexts**: string[] = []

*Inherited from [BaseSession](basesession.md).[contexts](basesession.md#contexts)*

*Defined in [src/Modules/Verto/BaseSession.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L32)*

___

### master\_nodeid

•  **master\_nodeid**: string

*Inherited from [BaseSession](basesession.md).[master_nodeid](basesession.md#master_nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:29](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L29)*

___

### micId

•  **micId**: string

*Inherited from [BrowserSession](browsersession.md).[micId](browsersession.md#micid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:37](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L37)*

___

### micLabel

•  **micLabel**: string

*Inherited from [BrowserSession](browsersession.md).[micLabel](browsersession.md#miclabel)*

*Defined in [src/Modules/Verto/BrowserSession.ts:39](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L39)*

___

### nodeid

•  **nodeid**: string

*Inherited from [BaseSession](basesession.md).[nodeid](basesession.md#nodeid)*

*Defined in [src/Modules/Verto/BaseSession.ts:28](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L28)*

___

### options

•  **options**: ITelnyxRTCOptions

*Inherited from [BaseSession](basesession.md).[options](basesession.md#options)*

*Defined in [src/Modules/Verto/BaseSession.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L46)*

___

### relayProtocol

•  **relayProtocol**: string = VERTO\_PROTOCOL

*Inherited from [TelnyxRTC](telnyxrtc.md).[relayProtocol](telnyxrtc.md#relayprotocol)*

*Overrides [BaseSession](basesession.md).[relayProtocol](basesession.md#relayprotocol)*

*Defined in [src/Modules/Verto/index.ts:16](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L16)*

___

### ringbackFile

• `Optional` **ringbackFile**: string

*Inherited from [BrowserSession](browsersession.md).[ringbackFile](browsersession.md#ringbackfile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L49)*

___

### ringtoneFile

• `Optional` **ringtoneFile**: string

*Inherited from [BrowserSession](browsersession.md).[ringtoneFile](browsersession.md#ringtonefile)*

*Defined in [src/Modules/Verto/BrowserSession.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L47)*

___

### sessionid

•  **sessionid**: string = ""

*Inherited from [BaseSession](basesession.md).[sessionid](basesession.md#sessionid)*

*Defined in [src/Modules/Verto/BaseSession.ts:26](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L26)*

___

### signature

•  **signature**: string = null

*Inherited from [BaseSession](basesession.md).[signature](basesession.md#signature)*

*Defined in [src/Modules/Verto/BaseSession.ts:30](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L30)*

___

### subscriptions

•  **subscriptions**: { [channel:string]: any;  }

*Inherited from [BaseSession](basesession.md).[subscriptions](basesession.md#subscriptions)*

*Defined in [src/Modules/Verto/BaseSession.ts:27](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L27)*

___

### timeoutErrorCode

•  **timeoutErrorCode**: number = -329990

*Inherited from [TelnyxRTC](telnyxrtc.md).[timeoutErrorCode](telnyxrtc.md#timeouterrorcode)*

*Overrides [BaseSession](basesession.md).[timeoutErrorCode](basesession.md#timeouterrorcode)*

*Defined in [src/Modules/Verto/index.ts:18](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L18)*

___

### uuid

•  **uuid**: string = uuidv4()

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L25)*

## Accessors

### \_\_logger

• get **__logger**(): Logger

*Inherited from [BaseSession](basesession.md).[__logger](basesession.md#__logger)*

*Defined in [src/Modules/Verto/BaseSession.ts:59](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L59)*

**Returns:** Logger

___

### connected

• get **connected**(): boolean \| null

*Inherited from [BaseSession](basesession.md).[connected](basesession.md#connected)*

*Defined in [src/Modules/Verto/BaseSession.ts:76](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L76)*

`true` if the client is connected to the Telnyx RTC server

**`example`** 

```js
const client = new TelnyxRTC(options);
console.log(client.connected); // => false
```

**`readonly`** 

**Returns:** boolean \| null

___

### iceServers

• get **iceServers**(): false \| true \| RTCIceServer[]

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:598](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L598)*

**Returns:** false \| true \| RTCIceServer[]

• set **iceServers**(`servers`: RTCIceServer[] \| boolean): void

*Inherited from [BrowserSession](browsersession.md).[iceServers](browsersession.md#iceservers)*

*Defined in [src/Modules/Verto/BrowserSession.ts:588](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L588)*

#### Parameters:

Name | Type |
------ | ------ |
`servers` | RTCIceServer[] \| boolean |

**Returns:** void

___

### localElement

• get **localElement**(): [RTCElement](../README.md#rtcelement)

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:641](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L641)*

**Returns:** [RTCElement](../README.md#rtcelement)

• set **localElement**(`tag`: HTMLMediaElement \| string \| Function): void

*Inherited from [BrowserSession](browsersession.md).[localElement](browsersession.md#localelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:637](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L637)*

#### Parameters:

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement \| string \| Function |

**Returns:** void

___

### mediaConstraints

• get **mediaConstraints**(): object

*Inherited from [BrowserSession](browsersession.md).[mediaConstraints](browsersession.md#mediaconstraints)*

*Defined in [src/Modules/Verto/BrowserSession.ts:393](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L393)*

Audio and video constraints currently used by the client.

**`examples`** 

```js
const client = new TelnyxRTC(options);

console.log(client.mediaConstraints);
// => { audio: true, video: false }
```

**`readonly`** 

**Returns:** object

Name | Type |
------ | ------ |
`audio` | boolean \| MediaTrackConstraints |
`video` | boolean \| MediaTrackConstraints |

___

### reconnectDelay

• get **reconnectDelay**(): number

*Inherited from [BrowserSession](browsersession.md).[reconnectDelay](browsersession.md#reconnectdelay)*

*Overrides [BaseSession](basesession.md).[reconnectDelay](basesession.md#reconnectdelay)*

*Defined in [src/Modules/Verto/BrowserSession.ts:72](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L72)*

**Returns:** number

___

### remoteElement

• get **remoteElement**(): [RTCElement](../README.md#rtcelement)

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:649](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L649)*

**Returns:** [RTCElement](../README.md#rtcelement)

• set **remoteElement**(`tag`: HTMLMediaElement \| string \| Function): void

*Inherited from [BrowserSession](browsersession.md).[remoteElement](browsersession.md#remoteelement)*

*Defined in [src/Modules/Verto/BrowserSession.ts:645](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L645)*

#### Parameters:

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement \| string \| Function |

**Returns:** void

___

### speaker

• get **speaker**(): string \| null

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:633](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L633)*

Default audio output device, if set by client.

**`example`** 

```js
const client = new TelnyxRTC(options);

console.log(client.speaker);
// => "abc123xyz"
```

**Returns:** string \| null

• set **speaker**(`deviceId`: string): void

*Inherited from [BrowserSession](browsersession.md).[speaker](browsersession.md#speaker)*

*Defined in [src/Modules/Verto/BrowserSession.ts:617](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L617)*

Sets the default audio output device for subsequent calls.

**`example`** 

```js
let result = await client.getAudioOutDevices();

if (result.length) {
  client.speaker = result[1].deviceId;
}
```

#### Parameters:

Name | Type |
------ | ------ |
`deviceId` | string |

**Returns:** void

## Methods

### \_existsSubscription

▸ **_existsSubscription**(`protocol`: string, `channel?`: string): boolean

*Inherited from [BaseSession](basesession.md).[_existsSubscription](basesession.md#_existssubscription)*

*Defined in [src/Modules/Verto/BaseSession.ts:363](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L363)*

Check if a subscription for this protocol-channel already exists

#### Parameters:

Name | Type |
------ | ------ |
`protocol` | string |
`channel?` | string |

**Returns:** boolean

boolean

___

### broadcast

▸ **broadcast**(`params`: BroadcastParams): void

*Inherited from [TelnyxRTC](telnyxrtc.md).[broadcast](telnyxrtc.md#broadcast)*

*Overrides [BaseSession](basesession.md).[broadcast](basesession.md#broadcast)*

*Defined in [src/Modules/Verto/index.ts:93](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L93)*

#### Parameters:

Name | Type |
------ | ------ |
`params` | BroadcastParams |

**Returns:** void

___

### checkPermissions

▸ **checkPermissions**(`audio?`: boolean, `video?`: boolean): Promise<boolean\>

*Inherited from [BrowserSession](browsersession.md).[checkPermissions](browsersession.md#checkpermissions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:124](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L124)*

Checks if the browser has the permission to access mic and/or webcam

#### Parameters:

Name | Type | Default value | Description |
------ | ------ | ------ | ------ |
`audio` | boolean | true | Whether to check for microphone permissions. |
`video` | boolean | true | Whether to check for webcam permissions.  ## Examples  Checking for audio and video permissions:  ```js const client = new TelnyxRTC(options);  client.checkPermissions(); ```  Checking only for audio permissions:  ```js const client = new TelnyxRTC(options);  client.checkPermissions(true, false); ```  Checking only for video permissions:  ```js const client = new TelnyxRTC(options);  client.checkPermissions(false, true); ```  |

**Returns:** Promise<boolean\>

___

### connect

▸ **connect**(): Promise<void\>

*Inherited from [BrowserSession](browsersession.md).[connect](browsersession.md#connect)*

*Overrides [BaseSession](basesession.md).[connect](basesession.md#connect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:87](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L87)*

Creates a new connection for exchanging data with the WebRTC server

## Examples

```js
const client = new TelnyxRTC(options);

client.connect();
```

**Returns:** Promise<void\>

___

### disableMicrophone

▸ **disableMicrophone**(): void

*Inherited from [BrowserSession](browsersession.md).[disableMicrophone](browsersession.md#disablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:474](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L474)*

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

**Returns:** void

___

### disableWebcam

▸ **disableWebcam**(): void

*Inherited from [BrowserSession](browsersession.md).[disableWebcam](browsersession.md#disablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:566](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L566)*

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

**Returns:** void

___

### disconnect

▸ **disconnect**(): Promise<void\>

*Inherited from [BrowserSession](browsersession.md).[disconnect](browsersession.md#disconnect)*

*Overrides [BaseSession](basesession.md).[disconnect](basesession.md#disconnect)*

*Defined in [src/Modules/Verto/BrowserSession.ts:156](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L156)*

Disconnect all active calls

## Examples

```js
const client = new TelnyxRTC(options);

client.disconnect();
```

**Returns:** Promise<void\>

___

### enableMicrophone

▸ **enableMicrophone**(): void

*Inherited from [BrowserSession](browsersession.md).[enableMicrophone](browsersession.md#enablemicrophone)*

*Defined in [src/Modules/Verto/BrowserSession.ts:492](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L492)*

Enables use of the microphone in subsequent calls.

Note: This setting will be ignored if `audio: false` is
specified when creating a new call.

## Examples

```js
const client = new TelnyxRTC(options);

client.enableMicrophone();
```

**Returns:** void

___

### enableWebcam

▸ **enableWebcam**(): void

*Inherited from [BrowserSession](browsersession.md).[enableWebcam](browsersession.md#enablewebcam)*

*Defined in [src/Modules/Verto/BrowserSession.ts:584](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L584)*

Enables use of the webcam in subsequent calls.

Note: This setting will be ignored if `video: false` is
specified when creating a new call.

## Examples

```js
const client = new TelnyxRTC(options);

client.enableWebcam();
```

**Returns:** void

___

### execute

▸ **execute**(`msg`: BaseMessage): any

*Inherited from [BaseSession](basesession.md).[execute](basesession.md#execute)*

*Defined in [src/Modules/Verto/BaseSession.ts:88](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L88)*

Send a JSON object to the server.

#### Parameters:

Name | Type |
------ | ------ |
`msg` | BaseMessage |

**Returns:** any

Promise that will resolve/reject depending on the server response

___

### executeRaw

▸ **executeRaw**(`text`: string): void

*Inherited from [BaseSession](basesession.md).[executeRaw](basesession.md#executeraw)*

*Defined in [src/Modules/Verto/BaseSession.ts:112](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L112)*

Send raw text to the server.

#### Parameters:

Name | Type |
------ | ------ |
`text` | string |

**Returns:** void

void

___

### getAudioInDevices

▸ **getAudioInDevices**(): Promise<MediaDeviceInfo[]\>

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

**Returns:** Promise<MediaDeviceInfo[]\>

___

### getAudioOutDevices

▸ **getAudioOutDevices**(): Promise<MediaDeviceInfo[]\>

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

**Returns:** Promise<MediaDeviceInfo[]\>

___

### getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`: string): Promise<any[]\>

*Inherited from [BrowserSession](browsersession.md).[getDeviceResolutions](browsersession.md#getdeviceresolutions)*

*Defined in [src/Modules/Verto/BrowserSession.ts:371](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L371)*

Returns supported resolution for the given webcam.

**`examples`** 

If `deviceId` is `null`

1. if `deviceId` is `null` and you don't have a webcam connected to your computer,
it will throw an error with the message `"Requested device not found"`.

2. if `deviceId` is `null` and you have one or more webcam connected to your computer,
it will return a list of resolutions from the default device set up in your operating system.

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDeviceResolutions();
  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getDeviceResolutions().then((result) => {
  console.log(result);
});
```

If `deviceId` is **not** `null`

it will return a list of resolutions from the `deviceId` sent.

Using async/await:

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDeviceResolutions(deviceId);
  console.log(result);
}
```

Using ES6 `Promises`:

```js
client.getDeviceResolutions(deviceId).then((result) => {
  console.log(result);
});
```

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`deviceId` | string | the `deviceId` from your webcam.  |

**Returns:** Promise<any[]\>

___

### getDevices

▸ **getDevices**(): Promise<MediaDeviceInfo[]\>

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

**Returns:** Promise<MediaDeviceInfo[]\>

___

### getVideoDevices

▸ **getVideoDevices**(): Promise<MediaDeviceInfo[]\>

*Inherited from [BrowserSession](browsersession.md).[getVideoDevices](browsersession.md#getvideodevices)*

*Defined in [src/Modules/Verto/BrowserSession.ts:232](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L232)*

Return the device list supported by the browser

**Returns:** Promise<MediaDeviceInfo[]\>

___

### logout

▸ **logout**(): void

*Inherited from [BrowserSession](browsersession.md).[logout](browsersession.md#logout)*

*Defined in [src/Modules/Verto/BrowserSession.ts:141](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L141)*

Alias for .disconnect()

**`deprecated`** 

**Returns:** void

___

### newCall

▸ **newCall**(`options`: CallOptions): Call

*Inherited from [TelnyxRTC](telnyxrtc.md).[newCall](telnyxrtc.md#newcall)*

*Defined in [src/Modules/Verto/index.ts:83](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L83)*

Makes a new outbound call.

This method receives an object `options` with the following properties:

**`examples`** 

Making an outbound call to `+1 856-444-0362` using default values from the client:

```js
const call = client.newCall({
  destinationNumber: '+18564440362',
  callerNumber: '+15551231234'
});
```

You can omit `callerNumber` when dialing a SIP address:

```js
const call = client.newCall({
 destinationNumber: 'sip:example-sip-username@voip-provider.example.net'
});
```

If you are making calls from one Telnyx connection to another, you may specify just the SIP username:

```js
const call = client.newCall({
 destinationNumber: 'telnyx-sip-username' // This is equivalent to 'sip:telnyx-sip-username@sip.telnyx.com'
});
```

### Error handling

An error will be thrown if `destinationNumber` is not specified.

```js
const call = client.newCall().catch(console.error);
// => `destinationNumber is required`

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`options` | CallOptions | Options object for a new call. |

**Returns:** Call

The new outbound `Call` object.

___

### off

▸ **off**(`eventName`: string, `callback?`: Function): this

*Inherited from [BaseSession](basesession.md).[off](basesession.md#off)*

*Defined in [src/Modules/Verto/BaseSession.ts:256](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L256)*

Removes an event handler that were attached with .on().
If no handler parameter is passed, all listeners for that event will be removed.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback?` | Function | Function handler to be removed.  |

**Returns:** this

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

### on

▸ **on**(`eventName`: string, `callback`: Function): this

*Inherited from [BaseSession](basesession.md).[on](basesession.md#on)*

*Defined in [src/Modules/Verto/BaseSession.ts:222](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L222)*

Attaches an event handler for a specific type of event.

## Events
|   |   |
|---|---|
| `telnyx.ready` | The client is authenticated and available to use |
| `telnyx.error` | An error occurred at the session level |
| `telnyx.notification` | An update to the call or session |
| `telnyx.socket.open` | The WebSocket connection has been made |
| `telnyx.socket.close` | The WebSocket connection is set to close |
| `telnyx.socket.error` | An error occurred at the WebSocket level |
| `telnyx.socket.message` | The client has received a message through WebSockets |

**`examples`** 

Subscribe to the `telnyx.ready` and `telnyx.error` events.

```js
const client = new TelnyxRTC(options);

client.on('telnyx.ready', (client) => {
  // Your client is ready!
}).on('telnyx.error', (error) => {
  // Got an error...
})
```

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback` | Function | Function to call when the event comes. |

**Returns:** this

The client object itself.

___

### setAudioSettings

▸ **setAudioSettings**(`settings`: IAudioSettings): Promise<MediaTrackConstraints\>

*Inherited from [BrowserSession](browsersession.md).[setAudioSettings](browsersession.md#setaudiosettings)*

*Defined in [src/Modules/Verto/BrowserSession.ts:428](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L428)*

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`settings` | IAudioSettings | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `micId` and `micLabel`.  |

**Returns:** Promise<MediaTrackConstraints\>

`Promise<MediaTrackConstraints>` Audio constraints applied to the client.

___

### setVideoSettings

▸ **setVideoSettings**(`settings`: IVideoSettings): Promise<MediaTrackConstraints\>

*Inherited from [BrowserSession](browsersession.md).[setVideoSettings](browsersession.md#setvideosettings)*

*Defined in [src/Modules/Verto/BrowserSession.ts:525](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L525)*

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

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`settings` | IVideoSettings | (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object with the addition of `camId` and `camLabel`.  |

**Returns:** Promise<MediaTrackConstraints\>

`Promise<MediaTrackConstraints>` Video constraints applied to the client.

___

### speedTest

▸ **speedTest**(`bytes`: number): Promise<unknown\>

*Inherited from [BrowserSession](browsersession.md).[speedTest](browsersession.md#speedtest)*

*Defined in [src/Modules/Verto/BrowserSession.ts:163](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L163)*

#### Parameters:

Name | Type |
------ | ------ |
`bytes` | number |

**Returns:** Promise<unknown\>

___

### subscribe

▸ **subscribe**(`params`: SubscribeParams): Promise<any\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[subscribe](telnyxrtc.md#subscribe)*

*Overrides [BaseSession](basesession.md).[subscribe](basesession.md#subscribe)*

*Defined in [src/Modules/Verto/index.ts:97](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L97)*

#### Parameters:

Name | Type |
------ | ------ |
`params` | SubscribeParams |

**Returns:** Promise<any\>

___

### unsubscribe

▸ **unsubscribe**(`params`: SubscribeParams): Promise<any\>

*Inherited from [TelnyxRTC](telnyxrtc.md).[unsubscribe](telnyxrtc.md#unsubscribe)*

*Overrides [BaseSession](basesession.md).[unsubscribe](basesession.md#unsubscribe)*

*Defined in [src/Modules/Verto/index.ts:101](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L101)*

#### Parameters:

Name | Type |
------ | ------ |
`params` | SubscribeParams |

**Returns:** Promise<any\>

___

### validateDeviceId

▸ **validateDeviceId**(`id`: string, `label`: string, `kind`: MediaDeviceInfo[\"kind\"]): Promise<string\>

*Inherited from [BrowserSession](browsersession.md).[validateDeviceId](browsersession.md#validatedeviceid)*

*Defined in [src/Modules/Verto/BrowserSession.ts:308](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L308)*

#### Parameters:

Name | Type |
------ | ------ |
`id` | string |
`label` | string |
`kind` | MediaDeviceInfo[\"kind\"] |

**Returns:** Promise<string\>

___

### validateOptions

▸ **validateOptions**(): boolean

*Inherited from [TelnyxRTC](telnyxrtc.md).[validateOptions](telnyxrtc.md#validateoptions)*

*Overrides [BaseSession](basesession.md).[validateOptions](basesession.md#validateoptions)*

*Defined in [src/Modules/Verto/index.ts:20](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/index.ts#L20)*

**Returns:** boolean

___

### vertoBroadcast

▸ **vertoBroadcast**(`__namedParameters`: { data: object ; eventChannel: string = ""; nodeId: string  }): void

*Inherited from [BrowserSession](browsersession.md).[vertoBroadcast](browsersession.md#vertobroadcast)*

*Defined in [src/Modules/Verto/BrowserSession.ts:653](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L653)*

#### Parameters:

Name | Type |
------ | ------ |
`__namedParameters` | { data: object ; eventChannel: string = ""; nodeId: string  } |

**Returns:** void

___

### vertoSubscribe

▸ **vertoSubscribe**(`__namedParameters`: { eventChannel: string[] = []; handler: Function ; nodeId: string  }): Promise<any\>

*Inherited from [BrowserSession](browsersession.md).[vertoSubscribe](browsersession.md#vertosubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:668](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L668)*

#### Parameters:

Name | Type |
------ | ------ |
`__namedParameters` | { eventChannel: string[] = []; handler: Function ; nodeId: string  } |

**Returns:** Promise<any\>

___

### vertoUnsubscribe

▸ **vertoUnsubscribe**(`__namedParameters`: { eventChannel: string[] = []; nodeId: string  }): Promise<any\>

*Inherited from [BrowserSession](browsersession.md).[vertoUnsubscribe](browsersession.md#vertounsubscribe)*

*Defined in [src/Modules/Verto/BrowserSession.ts:699](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L699)*

#### Parameters:

Name | Type |
------ | ------ |
`__namedParameters` | { eventChannel: string[] = []; nodeId: string  } |

**Returns:** Promise<any\>

___

### off

▸ `Static`**off**(`eventName`: string): void

*Inherited from [BaseSession](basesession.md).[off](basesession.md#off)*

*Defined in [src/Modules/Verto/BaseSession.ts:445](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L445)*

#### Parameters:

Name | Type |
------ | ------ |
`eventName` | string |

**Returns:** void

___

### on

▸ `Static`**on**(`eventName`: string, `callback`: any): void

*Inherited from [BaseSession](basesession.md).[on](basesession.md#on)*

*Defined in [src/Modules/Verto/BaseSession.ts:441](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L441)*

#### Parameters:

Name | Type |
------ | ------ |
`eventName` | string |
`callback` | any |

**Returns:** void

___

### telnyxStateCall

▸ `Static`**telnyxStateCall**(`call`: Call): Call

*Inherited from [BrowserSession](browsersession.md).[telnyxStateCall](browsersession.md#telnyxstatecall)*

*Defined in [src/Modules/Verto/BrowserSession.ts:727](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BrowserSession.ts#L727)*

#### Parameters:

Name | Type |
------ | ------ |
`call` | Call |

**Returns:** Call

___

### uuid

▸ `Static`**uuid**(): string

*Inherited from [BaseSession](basesession.md).[uuid](basesession.md#uuid)*

*Defined in [src/Modules/Verto/BaseSession.ts:449](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L449)*

**Returns:** string
