**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Invite

# Class: Invite

## Hierarchy

* [BaseRequest](baserequest.md)

  ↳ **Invite**

## Index

### Constructors

* [constructor](invite.md#constructor)

### Properties

* [request](invite.md#request)
* [response](invite.md#response)
* [targetNodeId](invite.md#targetnodeid)

### Methods

* [buildRequest](invite.md#buildrequest)
* [toString](invite.md#tostring)

## Constructors

### constructor

\+ **new Invite**(`params?`: any): [Invite](invite.md)

*Inherited from [BaseRequest](baserequest.md).[constructor](baserequest.md#constructor)*

*Defined in [packages/js/src/Modules/Verto/messages/verto/BaseRequest.ts:12](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/verto/BaseRequest.ts#L12)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`params` | any | {} |

**Returns:** [Invite](invite.md)

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

*Defined in [packages/js/src/Modules/Verto/messages/Verto.ts:7](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/Verto.ts#L7)*

**Returns:** [VertoMethod](../enums/vertomethod.md)
