**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / BaseRequest

# Class: BaseRequest

## Hierarchy

* [BaseMessage](basemessage.md)

  ↳ **BaseRequest**

  ↳↳ [Login](login.md)

  ↳↳ [Result](result.md)

  ↳↳ [Invite](invite.md)

  ↳↳ [Answer](answer.md)

  ↳↳ [Attach](attach.md)

  ↳↳ [Bye](bye.md)

  ↳↳ [Modify](modify.md)

  ↳↳ [Info](info.md)

  ↳↳ [Broadcast](broadcast.md)

  ↳↳ [Subscribe](subscribe.md)

  ↳↳ [Unsubscribe](unsubscribe.md)

## Index

### Constructors

* [constructor](baserequest.md#constructor)

### Properties

* [request](baserequest.md#request)
* [response](baserequest.md#response)
* [targetNodeId](baserequest.md#targetnodeid)

### Methods

* [buildRequest](baserequest.md#buildrequest)

## Constructors

### constructor

\+ **new BaseRequest**(`params?`: any): [BaseRequest](baserequest.md)

*Defined in [packages/js/src/Modules/Verto/messages/verto/BaseRequest.ts:12](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/verto/BaseRequest.ts#L12)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`params` | any | {} |

**Returns:** [BaseRequest](baserequest.md)

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
