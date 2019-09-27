[@telnyx/webrtc](../README.md) › [TelnyxRTC](telnyxrtc.md)

# Class: TelnyxRTC

## Hierarchy

  ↳ [VertoClient](vertoclient.md)

  ↳ **TelnyxRTC**

## Index

### Constructors

* [constructor](telnyxrtc.md#constructor)

### Properties

* [credentials](telnyxrtc.md#credentials)
* [displayName](telnyxrtc.md#displayname)
* [env](telnyxrtc.md#env)
* [host](telnyxrtc.md#host)
* [port](telnyxrtc.md#port)
* [project](telnyxrtc.md#optional-project)
* [useCamera](telnyxrtc.md#usecamera)
* [useMic](telnyxrtc.md#usemic)
* [useSpeaker](telnyxrtc.md#usespeaker)

### Accessors

* [localElement](telnyxrtc.md#localelement)
* [remoteElement](telnyxrtc.md#remoteelement)

### Methods

* [connect](telnyxrtc.md#connect)
* [disconnect](telnyxrtc.md#disconnect)
* [newCall](telnyxrtc.md#newcall)
* [on](telnyxrtc.md#on)

## Constructors

###  constructor

\+ **new TelnyxRTC**(`o?`: [IClientOptions](../interfaces/iclientoptions.md)): *[TelnyxRTC](telnyxrtc.md)*

*Inherited from [VertoClient](vertoclient.md).[constructor](vertoclient.md#constructor)*

*Overrides [BaseClient](baseclient.md).[constructor](baseclient.md#constructor)*

*Defined in [VertoClient/VertoClient.ts:27](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/VertoClient/VertoClient.ts#L27)*

**Parameters:**

Name | Type |
------ | ------ |
`o?` | [IClientOptions](../interfaces/iclientoptions.md) |

**Returns:** *[TelnyxRTC](telnyxrtc.md)*

## Properties

###  credentials

• **credentials**: *[ICredentials](../interfaces/icredentials.md)*

*Inherited from [BaseClient](baseclient.md).[credentials](baseclient.md#credentials)*

*Defined in [BaseClient.ts:35](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L35)*

___

###  displayName

• **displayName**: *string*

*Inherited from [BaseClient](baseclient.md).[displayName](baseclient.md#displayname)*

*Defined in [BaseClient.ts:39](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L39)*

___

###  env

• **env**: *[Env](../README.md#env)*

*Inherited from [BaseClient](baseclient.md).[env](baseclient.md#env)*

*Defined in [BaseClient.ts:33](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L33)*

___

###  host

• **host**: *string*

*Inherited from [BaseClient](baseclient.md).[host](baseclient.md#host)*

*Defined in [BaseClient.ts:31](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L31)*

___

###  port

• **port**: *number*

*Inherited from [BaseClient](baseclient.md).[port](baseclient.md#port)*

*Defined in [BaseClient.ts:32](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L32)*

___

### `Optional` project

• **project**? : *string*

*Inherited from [BaseClient](baseclient.md).[project](baseclient.md#optional-project)*

*Defined in [BaseClient.ts:34](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L34)*

___

###  useCamera

• **useCamera**: *string | boolean*

*Inherited from [BaseClient](baseclient.md).[useCamera](baseclient.md#usecamera)*

*Defined in [BaseClient.ts:38](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L38)*

___

###  useMic

• **useMic**: *string | boolean*

*Inherited from [BaseClient](baseclient.md).[useMic](baseclient.md#usemic)*

*Defined in [BaseClient.ts:36](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L36)*

___

###  useSpeaker

• **useSpeaker**: *string | boolean*

*Inherited from [BaseClient](baseclient.md).[useSpeaker](baseclient.md#usespeaker)*

*Defined in [BaseClient.ts:37](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L37)*

## Accessors

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BaseClient](baseclient.md).[localElement](baseclient.md#localelement)*

*Defined in [BaseClient.ts:62](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L62)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`el`: [RTCElement](../README.md#rtcelement)): *void*

*Inherited from [BaseClient](baseclient.md).[localElement](baseclient.md#localelement)*

*Defined in [BaseClient.ts:58](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L58)*

**Parameters:**

Name | Type |
------ | ------ |
`el` | [RTCElement](../README.md#rtcelement) |

**Returns:** *void*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Inherited from [BaseClient](baseclient.md).[remoteElement](baseclient.md#remoteelement)*

*Defined in [BaseClient.ts:70](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L70)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`el`: [RTCElement](../README.md#rtcelement)): *void*

*Inherited from [BaseClient](baseclient.md).[remoteElement](baseclient.md#remoteelement)*

*Defined in [BaseClient.ts:66](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L66)*

**Parameters:**

Name | Type |
------ | ------ |
`el` | [RTCElement](../README.md#rtcelement) |

**Returns:** *void*

## Methods

###  connect

▸ **connect**(): *Promise‹void›*

*Inherited from [VertoClient](vertoclient.md).[connect](vertoclient.md#connect)*

*Overrides [BaseClient](baseclient.md).[connect](baseclient.md#abstract-connect)*

*Defined in [VertoClient/VertoClient.ts:36](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/VertoClient/VertoClient.ts#L36)*

**Returns:** *Promise‹void›*

___

###  disconnect

▸ **disconnect**(): *void*

*Inherited from [VertoClient](vertoclient.md).[disconnect](vertoclient.md#disconnect)*

*Overrides [BaseClient](baseclient.md).[disconnect](baseclient.md#abstract-disconnect)*

*Defined in [VertoClient/VertoClient.ts:97](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/VertoClient/VertoClient.ts#L97)*

**Returns:** *void*

___

###  newCall

▸ **newCall**(`options`: [ICallOptions](../interfaces/icalloptions.md)): *[ICall](../interfaces/icall.md)*

*Inherited from [VertoClient](vertoclient.md).[newCall](vertoclient.md#newcall)*

*Overrides [BaseClient](baseclient.md).[newCall](baseclient.md#abstract-newcall)*

*Defined in [VertoClient/VertoClient.ts:75](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/VertoClient/VertoClient.ts#L75)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ICallOptions](../interfaces/icalloptions.md) |

**Returns:** *[ICall](../interfaces/icall.md)*

___

###  on

▸ **on**<**E**>(`message`: E, `cb`: MessageEvents[E]): *[BaseClient](baseclient.md)*

*Inherited from [BaseClient](baseclient.md).[on](baseclient.md#on)*

*Defined in [BaseClient.ts:74](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L74)*

**Type parameters:**

▪ **E**: *keyof MessageEvents*

**Parameters:**

Name | Type |
------ | ------ |
`message` | E |
`cb` | MessageEvents[E] |

**Returns:** *[BaseClient](baseclient.md)*
