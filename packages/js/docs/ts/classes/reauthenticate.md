**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Reauthenticate

# Class: Reauthenticate

## Hierarchy

* [BaseMessage](basemessage.md)

  ↳ **Reauthenticate**

## Index

### Constructors

* [constructor](reauthenticate.md#constructor)

### Properties

* [method](reauthenticate.md#method)
* [request](reauthenticate.md#request)
* [response](reauthenticate.md#response)
* [targetNodeId](reauthenticate.md#targetnodeid)

### Methods

* [buildRequest](reauthenticate.md#buildrequest)

## Constructors

### constructor

\+ **new Reauthenticate**(`project`: string, `jwt_token`: string, `sessionid`: string): [Reauthenticate](reauthenticate.md)

*Defined in [packages/js/src/Modules/Verto/messages/blade/Reauthenticate.ts:4](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Reauthenticate.ts#L4)*

#### Parameters:

Name | Type |
------ | ------ |
`project` | string |
`jwt_token` | string |
`sessionid` | string |

**Returns:** [Reauthenticate](reauthenticate.md)

## Properties

### method

•  **method**: string = "blade.reauthenticate"

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/messages/blade/Reauthenticate.ts:4](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Reauthenticate.ts#L4)*

___

### request

•  **request**: any

*Inherited from [BaseMessage](basemessage.md).[request](basemessage.md#request)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:5](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L5)*

___

### response

•  **response**: any

*Inherited from [BaseMessage](basemessage.md).[response](basemessage.md#response)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:6](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L6)*

___

### targetNodeId

•  **targetNodeId**: string

*Inherited from [BaseMessage](basemessage.md).[targetNodeId](basemessage.md#targetnodeid)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:7](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L7)*

## Methods

### buildRequest

▸ **buildRequest**(`params`: any): void

*Inherited from [BaseMessage](basemessage.md).[buildRequest](basemessage.md#buildrequest)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:9](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L9)*

#### Parameters:

Name | Type |
------ | ------ |
`params` | any |

**Returns:** void
