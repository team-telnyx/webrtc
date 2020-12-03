[@telnyx/webrtc - v2.5.1](README.md)

# @telnyx/webrtc - v2.5.1

## Index

### Enumerations

* [CallConnectState](enums/callconnectstate.md)
* [CallDetectState](enums/calldetectstate.md)
* [CallDetectType](enums/calldetecttype.md)
* [CallFaxState](enums/callfaxstate.md)
* [CallMethod](enums/callmethod.md)
* [CallNotification](enums/callnotification.md)
* [CallPlayState](enums/callplaystate.md)
* [CallPlayType](enums/callplaytype.md)
* [CallPromptState](enums/callpromptstate.md)
* [CallRecordState](enums/callrecordstate.md)
* [CallState](enums/callstate.md)
* [CallTapState](enums/calltapstate.md)
* [CallType](enums/calltype.md)
* [ConferenceAction](enums/conferenceaction.md)
* [DeviceType](enums/devicetype.md)
* [Direction](enums/direction.md)
* [DisconnectReason](enums/disconnectreason.md)
* [DisconnectSource](enums/disconnectsource.md)
* [MessageNotification](enums/messagenotification.md)
* [PeerType](enums/peertype.md)
* [Role](enums/role.md)
* [SendDigitsState](enums/senddigitsstate.md)
* [State](enums/state.md)
* [VertoMethod](enums/vertomethod.md)

### Classes

* [BaseCall](classes/basecall.md)
* [BaseClient](classes/baseclient.md)
* [BaseRequest](classes/baserequest.md)
* [BaseSession](classes/basesession.md)
* [BrowserSession](classes/browsersession.md)
* [Call](classes/call.md)
* [Connection](classes/connection.md)
* [Peer](classes/peer.md)
* [TelnyxRTC](classes/telnyxrtc.md)

### Interfaces

* [BroadcastParams](interfaces/broadcastparams.md)
* [CallOptions](interfaces/calloptions.md)
* [DeepArray](interfaces/deeparray.md)
* [IAudioSettings](interfaces/iaudiosettings.md)
* [IBladeConnectRequest](interfaces/ibladeconnectrequest.md)
* [IBladeConnectResult](interfaces/ibladeconnectresult.md)
* [IBladeExecuteRequest](interfaces/ibladeexecuterequest.md)
* [IBladeExecuteResult](interfaces/ibladeexecuteresult.md)
* [IBladeResultError](interfaces/ibladeresulterror.md)
* [IBladeSubscriptionRequest](interfaces/ibladesubscriptionrequest.md)
* [ICacheDevices](interfaces/icachedevices.md)
* [ICall](interfaces/icall.md)
* [ICallDevice](interfaces/icalldevice.md)
* [ICallOptions](interfaces/icalloptions.md)
* [ICallPeer](interfaces/icallpeer.md)
* [ICallingCollect](interfaces/icallingcollect.md)
* [ICallingCollectAudio](interfaces/icallingcollectaudio.md)
* [ICallingCollectRingtone](interfaces/icallingcollectringtone.md)
* [ICallingCollectTTS](interfaces/icallingcollecttts.md)
* [ICallingConnectParams](interfaces/icallingconnectparams.md)
* [ICallingDetect](interfaces/icallingdetect.md)
* [ICallingPlay](interfaces/icallingplay.md)
* [ICallingPlayParams](interfaces/icallingplayparams.md)
* [ICallingPlayRingtone](interfaces/icallingplayringtone.md)
* [ICallingPlayTTS](interfaces/icallingplaytts.md)
* [ICallingRecord](interfaces/icallingrecord.md)
* [ICallingTapDevice](interfaces/icallingtapdevice.md)
* [ICallingTapFlat](interfaces/icallingtapflat.md)
* [ICallingTapTap](interfaces/icallingtaptap.md)
* [ICantinaAuthParams](interfaces/icantinaauthparams.md)
* [ICantinaUser](interfaces/icantinauser.md)
* [IChromeRTCConfiguration](interfaces/ichromertcconfiguration.md)
* [IClientOptions](interfaces/iclientoptions.md)
* [ICredentials](interfaces/icredentials.md)
* [IMakeCallParams](interfaces/imakecallparams.md)
* [IMessage](interfaces/imessage.md)
* [IMessageOptions](interfaces/imessageoptions.md)
* [IRelayCallingCollect](interfaces/irelaycallingcollect.md)
* [IRelayCallingDetect](interfaces/irelaycallingdetect.md)
* [IRelayCallingPlay](interfaces/irelaycallingplay.md)
* [IRelayCallingRecord](interfaces/irelaycallingrecord.md)
* [IRelayCallingTapDevice](interfaces/irelaycallingtapdevice.md)
* [IRelayCallingTapTap](interfaces/irelaycallingtaptap.md)
* [IRelayConsumerParams](interfaces/irelayconsumerparams.md)
* [ISubscription](interfaces/isubscription.md)
* [ITelnyxRTCOptions](interfaces/itelnyxrtcoptions.md)
* [IVideoSettings](interfaces/ivideosettings.md)
* [IWebRTCCall](interfaces/iwebrtccall.md)
* [MessageEvents](interfaces/messageevents.md)
* [StringStringMap](interfaces/stringstringmap.md)
* [StringTMap](interfaces/stringtmap.md)
* [SubscribeParams](interfaces/subscribeparams.md)

### Type aliases

* [Env](README.md#env)
* [Module](README.md#module)
* [RTCElement](README.md#rtcelement)

### Variables

* [CALL_STATES](README.md#const-call_states)
* [DEFAULT_CALL_TIMEOUT](README.md#const-default_call_timeout)
* [connected](README.md#const-connected)
* [isAlive](README.md#const-isalive)
* [mockClose](README.md#const-mockclose)
* [mockConnect](README.md#const-mockconnect)
* [mockResponse](README.md#const-mockresponse)
* [mockSend](README.md#const-mocksend)
* [mockSendRawText](README.md#const-mocksendrawtext)

### Functions

* [checkWebSocketHost](README.md#const-checkwebsockethost)
* [deepCopy](README.md#const-deepcopy)
* [destructResponse](README.md#const-destructresponse)
* [findElementByType](README.md#const-findelementbytype)
* [isDefined](README.md#const-isdefined)
* [isFunction](README.md#const-isfunction)
* [isValidOptions](README.md#const-isvalidoptions)
* [mutateLiveArrayData](README.md#const-mutatelivearraydata)
* [mutateStorageKey](README.md#const-mutatestoragekey)
* [objEmpty](README.md#const-objempty)
* [randomInt](README.md#const-randomint)
* [safeParseJson](README.md#const-safeparsejson)
* [setWebSocket](README.md#const-setwebsocket)

### Object literals

* [DEFAULT_CALL_OPTIONS](README.md#const-default_call_options)
* [NOTIFICATION_TYPE](README.md#const-notification_type)
* [localStorage](README.md#const-localstorage)
* [sessionStorage](README.md#const-sessionstorage)

## Type aliases

###  Env

Ƭ **Env**: *"production" | "development"*

*Defined in [src/utils/types.ts:8](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/types.ts#L8)*

___

###  Module

Ƭ **Module**: *"verto" | "telnyx_rtc"*

*Defined in [src/utils/types.ts:9](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/types.ts#L9)*

___

###  RTCElement

Ƭ **RTCElement**: *HTMLMediaElement | string | Function*

*Defined in [src/utils/types.ts:10](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/types.ts#L10)*

## Variables

### `Const` CALL_STATES

• **CALL_STATES**: *string[]* =  Object.values(CallState)

*Defined in [src/Modules/Verto/util/constants/relay.ts:10](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/constants/relay.ts#L10)*

___

### `Const` DEFAULT_CALL_TIMEOUT

• **DEFAULT_CALL_TIMEOUT**: *30* = 30

*Defined in [src/Modules/Verto/util/constants/relay.ts:12](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/constants/relay.ts#L12)*

___

### `Const` connected

• **connected**: *Mock‹any, any›* =  jest.fn().mockReturnValue(true)

*Defined in [src/Modules/Verto/services/__mocks__/Connection.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/__mocks__/Connection.ts#L25)*

___

### `Const` isAlive

• **isAlive**: *Mock‹any, any›* =  jest.fn().mockReturnValue(true)

*Defined in [src/Modules/Verto/services/__mocks__/Connection.ts:26](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/__mocks__/Connection.ts#L26)*

___

### `Const` mockClose

• **mockClose**: *Mock‹any, any›* =  jest.fn()

*Defined in [src/Modules/Verto/services/__mocks__/Connection.ts:22](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/__mocks__/Connection.ts#L22)*

___

### `Const` mockConnect

• **mockConnect**: *Mock‹any, any›* =  jest.fn()

*Defined in [src/Modules/Verto/services/__mocks__/Connection.ts:23](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/__mocks__/Connection.ts#L23)*

___

### `Const` mockResponse

• **mockResponse**: *Mock‹object, []›* =  jest.fn((): { result: {}; error?: string } => ({
  result: { message: 'fake' },
}))

*Defined in [src/Modules/Verto/services/__mocks__/Connection.ts:3](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/__mocks__/Connection.ts#L3)*

___

### `Const` mockSend

• **mockSend**: *Mock‹Promise‹unknown›, [any]›* =  jest.fn((bladeObj: any) => {
  const { request } = bladeObj;
  return new Promise((resolve, reject) => {
    if (!request.hasOwnProperty('result')) {
      const response = mockResponse();
      const { result, error } = destructResponse(response);
      return error ? reject(error) : resolve(result);
    } else {
      resolve();
    }
  });
})

*Defined in [src/Modules/Verto/services/__mocks__/Connection.ts:9](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/__mocks__/Connection.ts#L9)*

___

### `Const` mockSendRawText

• **mockSendRawText**: *Mock‹void, [string]›* =  jest.fn((str: string) => {})

*Defined in [src/Modules/Verto/services/__mocks__/Connection.ts:7](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/__mocks__/Connection.ts#L7)*

## Functions

### `Const` checkWebSocketHost

▸ **checkWebSocketHost**(`host`: string): *string*

*Defined in [src/Modules/Verto/util/helpers.ts:71](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L71)*

**Parameters:**

Name | Type |
------ | ------ |
`host` | string |

**Returns:** *string*

___

### `Const` deepCopy

▸ **deepCopy**(`obj`: Object): *any*

*Defined in [src/Modules/Verto/util/helpers.ts:6](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L6)*

**Parameters:**

Name | Type |
------ | ------ |
`obj` | Object |

**Returns:** *any*

___

### `Const` destructResponse

▸ **destructResponse**(`response`: any, `nodeId`: string): *object*

*Defined in [src/Modules/Verto/util/helpers.ts:84](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L84)*

From the socket we can get:
- JSON-RPC msg with 1 level of 'result' or 'error'
- JSON-RPC msg with 2 nested 'result' and 'code' property to identify error
- JSON-RPC msg with 3 nested 'result' where the third level is the Verto JSON-RPC flat msg.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`response` | any | - |
`nodeId` | string |  null |

**Returns:** *object*

Object with error | result key to identify success or fail

* \[ **key**: *string*\]: any

___

### `Const` findElementByType

▸ **findElementByType**(`tag`: HTMLMediaElement | string | Function): *HTMLMediaElement*

*Defined in [src/Modules/Verto/util/helpers.ts:54](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L54)*

**Parameters:**

Name | Type |
------ | ------ |
`tag` | HTMLMediaElement &#124; string &#124; Function |

**Returns:** *HTMLMediaElement*

___

### `Const` isDefined

▸ **isDefined**(`variable`: any): *boolean*

*Defined in [src/Modules/Verto/util/helpers.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L48)*

**Parameters:**

Name | Type |
------ | ------ |
`variable` | any |

**Returns:** *boolean*

___

### `Const` isFunction

▸ **isFunction**(`variable`: any): *boolean*

*Defined in [src/Modules/Verto/util/helpers.ts:51](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L51)*

**Parameters:**

Name | Type |
------ | ------ |
`variable` | any |

**Returns:** *boolean*

___

### `Const` isValidOptions

▸ **isValidOptions**(`__namedParameters`: object): *boolean*

*Defined in [src/Modules/Verto/util/helpers.ts:123](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L123)*

Validates the options passed in.
TelnyxRTC requires (login and password) OR (login_token)
Verto requires host, login, passwd OR password

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *boolean*

boolean

___

### `Const` mutateLiveArrayData

▸ **mutateLiveArrayData**(`data`: any): *object*

*Defined in [src/Modules/Verto/util/helpers.ts:12](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L12)*

**Parameters:**

Name | Type |
------ | ------ |
`data` | any |

**Returns:** *object*

___

### `Const` mutateStorageKey

▸ **mutateStorageKey**(`key`: string): *string*

*Defined in [src/Modules/Verto/util/helpers.ts:10](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L10)*

**Parameters:**

Name | Type |
------ | ------ |
`key` | string |

**Returns:** *string*

___

### `Const` objEmpty

▸ **objEmpty**(`obj`: Object): *boolean*

*Defined in [src/Modules/Verto/util/helpers.ts:8](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L8)*

**Parameters:**

Name | Type |
------ | ------ |
`obj` | Object |

**Returns:** *boolean*

___

### `Const` randomInt

▸ **randomInt**(`min`: number, `max`: number): *number*

*Defined in [src/Modules/Verto/util/helpers.ts:113](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L113)*

**Parameters:**

Name | Type |
------ | ------ |
`min` | number |
`max` | number |

**Returns:** *number*

___

### `Const` safeParseJson

▸ **safeParseJson**(`value`: string): *string | Object*

*Defined in [src/Modules/Verto/util/helpers.ts:37](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/helpers.ts#L37)*

**Parameters:**

Name | Type |
------ | ------ |
`value` | string |

**Returns:** *string | Object*

___

### `Const` setWebSocket

▸ **setWebSocket**(`websocket`: any): *void*

*Defined in [src/Modules/Verto/services/Connection.ts:13](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L13)*

**Parameters:**

Name | Type |
------ | ------ |
`websocket` | any |

**Returns:** *void*

## Object literals

### `Const` DEFAULT_CALL_OPTIONS

### ▪ **DEFAULT_CALL_OPTIONS**: *object*

*Defined in [src/Modules/Verto/webrtc/constants.ts:41](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L41)*

###  attach

• **attach**: *false* = false

*Defined in [src/Modules/Verto/webrtc/constants.ts:50](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L50)*

###  audio

• **audio**: *true* = true

*Defined in [src/Modules/Verto/webrtc/constants.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L47)*

###  callerName

• **callerName**: *string* = ""

*Defined in [src/Modules/Verto/webrtc/constants.ts:45](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L45)*

###  callerNumber

• **callerNumber**: *string* = ""

*Defined in [src/Modules/Verto/webrtc/constants.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L46)*

###  destinationNumber

• **destinationNumber**: *string* = ""

*Defined in [src/Modules/Verto/webrtc/constants.ts:42](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L42)*

###  remoteCallerName

• **remoteCallerName**: *string* = "Outbound Call"

*Defined in [src/Modules/Verto/webrtc/constants.ts:43](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L43)*

###  remoteCallerNumber

• **remoteCallerNumber**: *string* = ""

*Defined in [src/Modules/Verto/webrtc/constants.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L44)*

###  screenShare

• **screenShare**: *false* = false

*Defined in [src/Modules/Verto/webrtc/constants.ts:51](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L51)*

###  useStereo

• **useStereo**: *false* = false

*Defined in [src/Modules/Verto/webrtc/constants.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L49)*

###  userVariables

• **userVariables**: *object*

*Defined in [src/Modules/Verto/webrtc/constants.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L52)*

#### Type declaration:

###  video

• **video**: *false* = false

*Defined in [src/Modules/Verto/webrtc/constants.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L48)*

___

### `Const` NOTIFICATION_TYPE

### ▪ **NOTIFICATION_TYPE**: *object*

*Defined in [src/Modules/Verto/webrtc/constants.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L31)*

###  __computed

• **__computed**: *string* = "participantData"

*Defined in [src/Modules/Verto/webrtc/constants.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L33)*

*Defined in [src/Modules/Verto/webrtc/constants.ts:34](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L34)*

###  callUpdate

• **callUpdate**: *string* = "callUpdate"

*Defined in [src/Modules/Verto/webrtc/constants.ts:36](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L36)*

###  conferenceUpdate

• **conferenceUpdate**: *string* = "conferenceUpdate"

*Defined in [src/Modules/Verto/webrtc/constants.ts:35](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L35)*

###  generic

• **generic**: *string* = "event"

*Defined in [src/Modules/Verto/webrtc/constants.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L32)*

###  userMediaError

• **userMediaError**: *string* = "userMediaError"

*Defined in [src/Modules/Verto/webrtc/constants.ts:38](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L38)*

###  vertoClientReady

• **vertoClientReady**: *string* = "vertoClientReady"

*Defined in [src/Modules/Verto/webrtc/constants.ts:37](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/constants.ts#L37)*

___

### `Const` localStorage

### ▪ **localStorage**: *object*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:24](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L24)*

###  getItem

• **getItem**: *getItem*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:24](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L24)*

###  removeItem

• **removeItem**: *removeItem*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:24](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L24)*

###  setItem

• **setItem**: *setItem*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:24](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L24)*

___

### `Const` sessionStorage

### ▪ **sessionStorage**: *object*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L25)*

###  getItem

• **getItem**: *getItem*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L25)*

###  removeItem

• **removeItem**: *removeItem*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L25)*

###  setItem

• **setItem**: *setItem*

*Defined in [src/Modules/Verto/util/storage/index.native.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/storage/index.native.ts#L25)*
