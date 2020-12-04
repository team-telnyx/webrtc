[@telnyx/webrtc - v2.2.2](../README.md) › [BaseSession](basesession.md)

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
* [subscribe](basesession.md#subscribe)
* [unsubscribe](basesession.md#unsubscribe)
* [validateOptions](basesession.md#validateoptions)
* [off](basesession.md#static-off)
* [on](basesession.md#static-on)
* [uuid](basesession.md#static-uuid)

## Constructors

###  constructor

\+ **new BaseSession**(`options`: [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)): *[BaseSession](basesession.md)*

*Defined in [src/Modules/Verto/BaseSession.ts:45](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L45)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) |

**Returns:** *[BaseSession](basesession.md)*

## Properties

###  contexts

• **contexts**: *string[]* =  []

*Defined in [src/Modules/Verto/BaseSession.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L33)*

___

###  expiresAt

• **expiresAt**: *number* = 0

*Defined in [src/Modules/Verto/BaseSession.ts:30](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L30)*

___

###  master_nodeid

• **master_nodeid**: *string*

*Defined in [src/Modules/Verto/BaseSession.ts:29](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L29)*

___

###  nodeid

• **nodeid**: *string*

*Defined in [src/Modules/Verto/BaseSession.ts:28](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L28)*

___

###  options

• **options**: *[ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)*

*Defined in [src/Modules/Verto/BaseSession.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L47)*

___

###  relayProtocol

• **relayProtocol**: *string* =  null

*Defined in [src/Modules/Verto/BaseSession.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L32)*

___

###  sessionid

• **sessionid**: *string* = ""

*Defined in [src/Modules/Verto/BaseSession.ts:26](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L26)*

___

###  signature

• **signature**: *string* =  null

*Defined in [src/Modules/Verto/BaseSession.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L31)*

___

###  subscriptions

• **subscriptions**: *object*

*Defined in [src/Modules/Verto/BaseSession.ts:27](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L27)*

#### Type declaration:

* \[ **channel**: *string*\]: any

___

###  timeoutErrorCode

• **timeoutErrorCode**: *number* =  -32000

*Defined in [src/Modules/Verto/BaseSession.ts:34](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L34)*

___

###  uuid

• **uuid**: *string* =  uuidv4()

*Defined in [src/Modules/Verto/BaseSession.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L25)*

## Accessors

###  __logger

• **get __logger**(): *Logger*

*Defined in [src/Modules/Verto/BaseSession.ts:60](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L60)*

**Returns:** *Logger*

___

###  connected

• **get connected**(): *boolean | null*

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

*Defined in [src/Modules/Verto/BaseSession.ts:81](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L81)*

**Returns:** *boolean*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Defined in [src/Modules/Verto/BaseSession.ts:85](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L85)*

**Returns:** *number*

## Methods

###  _existsSubscription

▸ **_existsSubscription**(`protocol`: string, `channel?`: string): *boolean*

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

###  connect

▸ **connect**(): *Promise‹void›*

*Defined in [src/Modules/Verto/BaseSession.ts:262](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L262)*

Define the method to connect the session

**`abstract`** 

**`async`** 

**Returns:** *Promise‹void›*

void

___

###  disconnect

▸ **disconnect**(): *Promise‹void›*

*Defined in [src/Modules/Verto/BaseSession.ts:184](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L184)*

Remove subscriptions and calls, close WS connection and remove all session listeners.

**Returns:** *Promise‹void›*

void

___

###  execute

▸ **execute**(`msg`: BaseMessage): *any*

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

*Defined in [src/Modules/Verto/BaseSession.ts:117](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L117)*

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

###  subscribe

▸ **subscribe**(`__namedParameters`: object): *Promise‹any›*

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

###  validateOptions

▸ **validateOptions**(): *boolean*

*Defined in [src/Modules/Verto/BaseSession.ts:131](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L131)*

Validates the options passed in.
TelnyxRTC requires (login and password) OR login_token
Verto requires host, login, passwd OR password

**Returns:** *boolean*

boolean

___

### `Static` off

▸ **off**(`eventName`: string): *void*

*Defined in [src/Modules/Verto/BaseSession.ts:444](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L444)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |

**Returns:** *void*

___

### `Static` on

▸ **on**(`eventName`: string, `callback`: any): *void*

*Defined in [src/Modules/Verto/BaseSession.ts:440](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L440)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |
`callback` | any |

**Returns:** *void*

___

### `Static` uuid

▸ **uuid**(): *string*

*Defined in [src/Modules/Verto/BaseSession.ts:448](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L448)*

**Returns:** *string*
