[@telnyx/webrtc - v2.2.3](../README.md) › [BaseClient](baseclient.md)

# Class: BaseClient

## Hierarchy

* **BaseClient**

## Index

### Constructors

* [constructor](baseclient.md#constructor)

### Properties

* [credentials](baseclient.md#credentials)
* [displayName](baseclient.md#displayname)
* [env](baseclient.md#env)
* [host](baseclient.md#host)
* [module](baseclient.md#module)
* [port](baseclient.md#port)
* [project](baseclient.md#optional-project)
* [ringFile](baseclient.md#optional-ringfile)
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

*Defined in [src/BaseClient.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L49)*

**Parameters:**

Name | Type |
------ | ------ |
`o?` | [IClientOptions](../interfaces/iclientoptions.md) |

**Returns:** *[BaseClient](baseclient.md)*

## Properties

###  credentials

• **credentials**: *[ICredentials](../interfaces/icredentials.md)*

*Defined in [src/BaseClient.ts:36](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L36)*

___

###  displayName

• **displayName**: *string*

*Defined in [src/BaseClient.ts:40](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L40)*

___

###  env

• **env**: *[Env](../README.md#env)*

*Defined in [src/BaseClient.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L33)*

___

###  host

• **host**: *string*

*Defined in [src/BaseClient.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L31)*

___

###  module

• **module**: *[Module](../README.md#module)*

*Defined in [src/BaseClient.ts:34](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L34)*

___

###  port

• **port**: *number*

*Defined in [src/BaseClient.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L32)*

___

### `Optional` project

• **project**? : *string*

*Defined in [src/BaseClient.ts:35](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L35)*

___

### `Optional` ringFile

• **ringFile**? : *string*

*Defined in [src/BaseClient.ts:41](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L41)*

___

###  useCamera

• **useCamera**: *string | boolean*

*Defined in [src/BaseClient.ts:39](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L39)*

___

###  useMic

• **useMic**: *string | boolean*

*Defined in [src/BaseClient.ts:37](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L37)*

___

###  useSpeaker

• **useSpeaker**: *string | boolean*

*Defined in [src/BaseClient.ts:38](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L38)*

## Accessors

###  localElement

• **get localElement**(): *string | Function | HTMLMediaElement*

*Defined in [src/BaseClient.ts:65](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L65)*

**Returns:** *string | Function | HTMLMediaElement*

• **set localElement**(`el`: [RTCElement](../README.md#rtcelement)): *void*

*Defined in [src/BaseClient.ts:61](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`el` | [RTCElement](../README.md#rtcelement) |

**Returns:** *void*

___

###  remoteElement

• **get remoteElement**(): *string | Function | HTMLMediaElement*

*Defined in [src/BaseClient.ts:73](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L73)*

**Returns:** *string | Function | HTMLMediaElement*

• **set remoteElement**(`el`: [RTCElement](../README.md#rtcelement)): *void*

*Defined in [src/BaseClient.ts:69](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L69)*

**Parameters:**

Name | Type |
------ | ------ |
`el` | [RTCElement](../README.md#rtcelement) |

**Returns:** *void*

## Methods

### `Abstract` connect

▸ **connect**(): *void*

*Defined in [src/BaseClient.ts:85](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L85)*

**Returns:** *void*

___

### `Abstract` disconnect

▸ **disconnect**(): *void*

*Defined in [src/BaseClient.ts:86](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L86)*

**Returns:** *void*

___

### `Abstract` newCall

▸ **newCall**(`options`: [ICallOptions](../interfaces/icalloptions.md)): *[ICall](../interfaces/icall.md)*

*Defined in [src/BaseClient.ts:95](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L95)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ICallOptions](../interfaces/icalloptions.md) |

**Returns:** *[ICall](../interfaces/icall.md)*

___

###  on

▸ **on**‹**E**›(`message`: E, `cb`: MessageEvents[E]): *[BaseClient](baseclient.md)*

*Defined in [src/BaseClient.ts:77](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/BaseClient.ts#L77)*

**Type parameters:**

▪ **E**: *keyof MessageEvents*

**Parameters:**

Name | Type |
------ | ------ |
`message` | E |
`cb` | MessageEvents[E] |

**Returns:** *[BaseClient](baseclient.md)*
