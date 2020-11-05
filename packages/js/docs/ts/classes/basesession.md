[@telnyx/webrtc - v2.1.5](../README.md) › [BaseSession](basesession.md)

# Class: BaseSession

## Hierarchy

* **BaseSession**

  ↳ [BrowserSession](browsersession.md)

## Index

### Constructors

* [constructor](basesession.md#constructor)

### Properties

* [contexts](basesession.md#contexts)
* [expiresAt](basesession.md#expiresat)
* [master_nodeid](basesession.md#master_nodeid)
* [nodeid](basesession.md#nodeid)
* [options](basesession.md#options)
* [relayProtocol](basesession.md#relayprotocol)
* [sessionid](basesession.md#sessionid)
* [signature](basesession.md#signature)
* [subscriptions](basesession.md#subscriptions)
* [timeoutErrorCode](basesession.md#timeouterrorcode)
* [uuid](basesession.md#uuid)

### Accessors

* [__logger](basesession.md#__logger)
* [connected](basesession.md#connected)
* [expired](basesession.md#expired)
* [reconnectDelay](basesession.md#reconnectdelay)

### Methods

* [_existsSubscription](basesession.md#_existssubscription)
* [broadcast](basesession.md#broadcast)
* [connect](basesession.md#connect)
* [disconnect](basesession.md#disconnect)
* [execute](basesession.md#execute)
* [executeRaw](basesession.md#executeraw)
* [off](basesession.md#off)
* [on](basesession.md#on)
* [refreshToken](basesession.md#refreshtoken)
* [subscribe](basesession.md#subscribe)
* [unsubscribe](basesession.md#unsubscribe)
* [validateOptions](basesession.md#validateoptions)
* [off](basesession.md#static-off)
* [on](basesession.md#static-on)
* [uuid](basesession.md#static-uuid)

## Constructors

###  constructor

\+ **new BaseSession**(`options`: [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)): *[BaseSession](basesession.md)*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:50](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L50)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) |

**Returns:** *[BaseSession](basesession.md)*

## Properties

###  contexts

• **contexts**: *string[]* =  []

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:38](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L38)*

___

###  expiresAt

• **expiresAt**: *number* = 0

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:35](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L35)*

___

###  master_nodeid

• **master_nodeid**: *string*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:34](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L34)*

___

###  nodeid

• **nodeid**: *string*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:33](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L33)*

___

###  options

• **options**: *[ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:52](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L52)*

___

###  relayProtocol

• **relayProtocol**: *string* =  null

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:37](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L37)*

___

###  sessionid

• **sessionid**: *string* = ""

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:31](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L31)*

___

###  signature

• **signature**: *string* =  null

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:36](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L36)*

___

###  subscriptions

• **subscriptions**: *object*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:32](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L32)*

#### Type declaration:

* \[ **channel**: *string*\]: any

___

###  timeoutErrorCode

• **timeoutErrorCode**: *number* =  -32000

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:39](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L39)*

___

###  uuid

• **uuid**: *string* =  uuidv4()

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:30](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L30)*

## Accessors

###  __logger

• **get __logger**(): *Logger*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:66](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L66)*

**Returns:** *Logger*

___

###  connected

• **get connected**(): *boolean*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:70](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L70)*

**Returns:** *boolean*

___

###  expired

• **get expired**(): *boolean*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:74](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L74)*

**Returns:** *boolean*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:78](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L78)*

**Returns:** *number*

## Methods

###  _existsSubscription

▸ **_existsSubscription**(`protocol`: string, `channel?`: string): *boolean*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:376](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L376)*

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

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:133](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L133)*

Broadcast a message in a protocol - channel

**`todo`** Implement it

**Parameters:**

Name | Type |
------ | ------ |
`params` | [BroadcastParams](../interfaces/broadcastparams.md) |

**Returns:** *void*

void

___

###  connect

▸ **connect**(): *Promise‹void›*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:237](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L237)*

Define the method to connect the session

**`abstract`** 

**`async`** 

**Returns:** *Promise‹void›*

void

___

###  disconnect

▸ **disconnect**(): *Promise‹void›*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:177](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L177)*

Remove subscriptions and calls, close WS connection and remove all session listeners.

**Returns:** *Promise‹void›*

void

___

###  execute

▸ **execute**(`msg`: BaseMessage): *any*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:86](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L86)*

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

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:110](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L110)*

Send raw text to the server.

**Parameters:**

Name | Type |
------ | ------ |
`text` | string |

**Returns:** *void*

void

___

###  off

▸ **off**(`eventName`: string, `callback?`: Function): *this*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:201](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L201)*

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

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:192](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L192)*

Attach a listener to the global session level

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |
`callback` | Function |

**Returns:** *this*

void

___

###  refreshToken

▸ **refreshToken**(`token`: string): *Promise‹void›*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:210](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L210)*

Refresh the

**Parameters:**

Name | Type |
------ | ------ |
`token` | string |

**Returns:** *Promise‹void›*

void

___

###  subscribe

▸ **subscribe**(`__namedParameters`: object): *Promise‹any›*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:140](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L140)*

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

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:164](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L164)*

Unsubscribe from Blade protocol channels

**`async`** 

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

Result of the REMOVE subscription

___

###  validateOptions

▸ **validateOptions**(): *boolean*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:124](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L124)*

Validates the options passed in.
TelnyxRTC requires (login and password) OR login_token
Verto requires host, login, passwd OR password

**Returns:** *boolean*

boolean

___

### `Static` off

▸ **off**(`eventName`: string): *void*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:483](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L483)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |

**Returns:** *void*

___

### `Static` on

▸ **on**(`eventName`: string, `callback`: any): *void*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:479](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L479)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |
`callback` | any |

**Returns:** *void*

___

### `Static` uuid

▸ **uuid**(): *string*

*Defined in [packages/js/src/Modules/Verto/BaseSession.ts:487](https://github.com/team-telnyx/webrtc/blob/4f15142/packages/js/src/Modules/Verto/BaseSession.ts#L487)*

**Returns:** *string*
