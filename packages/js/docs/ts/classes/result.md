**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Result

# Class: Result

## Hierarchy

* [BaseRequest](baserequest.md)

  ↳ **Result**

## Index

### Constructors

* [constructor](result.md#constructor)

### Properties

* [request](result.md#request)
* [response](result.md#response)
* [targetNodeId](result.md#targetnodeid)

### Methods

* [buildRequest](result.md#buildrequest)

## Constructors

### constructor

\+ **new Result**(`id`: number, `method`: string): [Result](result.md)

*Overrides [BaseRequest](baserequest.md).[constructor](baserequest.md#constructor)*

*Defined in [packages/js/src/Modules/Verto/messages/verto/Result.ts:3](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/verto/Result.ts#L3)*

#### Parameters:

Name | Type |
------ | ------ |
`id` | number |
`method` | string |

**Returns:** [Result](result.md)

## Properties

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
