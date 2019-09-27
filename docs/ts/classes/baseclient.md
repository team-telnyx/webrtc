[@telnyx/webrtc](../README.md) › [BaseClient](baseclient.md)

# Class: BaseClient

## Hierarchy

* **BaseClient**

  ↳ [VertoClient](vertoclient.md)

## Index

### Constructors

* [constructor](baseclient.md#constructor)

### Properties

* [credentials](baseclient.md#credentials)
* [displayName](baseclient.md#displayname)
* [env](baseclient.md#env)
* [host](baseclient.md#host)
* [port](baseclient.md#port)
* [project](baseclient.md#optional-project)
* [useCamera](baseclient.md#usecamera)
* [useMic](baseclient.md#usemic)
* [useSpeaker](baseclient.md#usespeaker)

### Accessors

* [localElement](baseclient.md#localelement)
* [remoteElement](baseclient.md#remoteelement)

### Methods

* [connect](baseclient.md#abstract-connect)
* [disconnect](baseclient.md#abstract-disconnect)
* [newCall](baseclient.md#abstract-newcall)
* [on](baseclient.md#on)

## Constructors

###  constructor

\+ **new BaseClient**(`o?`: [IClientOptions](../interfaces/iclientoptions.md)): *[BaseClient](baseclient.md)*

*Defined in [BaseClient.ts:46](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L46)*

**Parameters:**

Name | Type |
------ | ------ |
`o?` | [IClientOptions](../interfaces/iclientoptions.md) |

**Returns:** *[BaseClient](baseclient.md)*

## Properties

###  credentials

• **credentials**: *[ICredentials](../interfaces/icredentials.md)*

*Defined in [BaseClient.ts:35](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L35)*

___

###  displayName

• **displayName**: *string*

*Defined in [BaseClient.ts:39](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L39)*

___

###  env

• **env**: *[Env](../README.md#env)*

*Defined in [BaseClient.ts:33](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L33)*

___

###  host

• **host**: *string*

*Defined in [BaseClient.ts:31](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L31)*

___

###  port

• **port**: *number*

*Defined in [BaseClient.ts:32](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L32)*

___

### `Optional` project

• **project**? : *string*

*Defined in [BaseClient.ts:34](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L34)*

___

###  useCamera

• **useCamera**: *string | boolean*

*Defined in [BaseClient.ts:38](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L38)*

___

###  useMic

• **useMic**: *string | boolean*

*Defined in [BaseClient.ts:36](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L36)*

___

###  useSpeaker

• **useSpeaker**: *string | boolean*

*Defined in [BaseClient.ts:37](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L37)*

## Accessors

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Defined in [BaseClient.ts:62](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L62)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`el`: [RTCElement](../README.md#rtcelement)): *void*

*Defined in [BaseClient.ts:58](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L58)*

**Parameters:**

Name | Type |
------ | ------ |
`el` | [RTCElement](../README.md#rtcelement) |

**Returns:** *void*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Defined in [BaseClient.ts:70](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L70)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`el`: [RTCElement](../README.md#rtcelement)): *void*

*Defined in [BaseClient.ts:66](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L66)*

**Parameters:**

Name | Type |
------ | ------ |
`el` | [RTCElement](../README.md#rtcelement) |

**Returns:** *void*

## Methods

### `Abstract` connect

▸ **connect**(): *void*

*Defined in [BaseClient.ts:82](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L82)*

**Returns:** *void*

___

### `Abstract` disconnect

▸ **disconnect**(): *void*

*Defined in [BaseClient.ts:83](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L83)*

**Returns:** *void*

___

### `Abstract` newCall

▸ **newCall**(`options`: [ICallOptions](../interfaces/icalloptions.md)): *[ICall](../interfaces/icall.md)*

*Defined in [BaseClient.ts:92](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L92)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ICallOptions](../interfaces/icalloptions.md) |

**Returns:** *[ICall](../interfaces/icall.md)*

___

###  on

▸ **on**<**E**>(`message`: E, `cb`: MessageEvents[E]): *[BaseClient](baseclient.md)*

*Defined in [BaseClient.ts:74](https://github.com/team-telnyx/webrtc/blob/1b602c0/src/BaseClient.ts#L74)*

**Type parameters:**

▪ **E**: *keyof MessageEvents*

**Parameters:**

Name | Type |
------ | ------ |
`message` | E |
`cb` | MessageEvents[E] |

**Returns:** *[BaseClient](baseclient.md)*
