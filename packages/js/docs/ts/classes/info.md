**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Info

# Class: Info

## Hierarchy

* [BaseRequest](baserequest.md)

  ↳ **Info**

## Index

### Constructors

* [constructor](info.md#constructor)

### Properties

* [request](info.md#request)
* [response](info.md#response)
* [targetNodeId](info.md#targetnodeid)

### Methods

* [buildRequest](info.md#buildrequest)
* [toString](info.md#tostring)

## Constructors

### constructor

\+ **new Info**(`params?`: any): [Info](info.md)

*Inherited from [BaseRequest](baserequest.md).[constructor](baserequest.md#constructor)*

*Defined in [packages/js/src/Modules/Verto/messages/verto/BaseRequest.ts:12](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/verto/BaseRequest.ts#L12)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`params` | any | {} |

**Returns:** [Info](info.md)

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

___

### toString

▸ **toString**(): [VertoMethod](../enums/vertomethod.md)

*Defined in [packages/js/src/Modules/Verto/messages/Verto.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/Verto.ts#L32)*

**Returns:** [VertoMethod](../enums/vertomethod.md)
