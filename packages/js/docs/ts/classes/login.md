**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Login

# Class: Login

## Hierarchy

* [BaseRequest](baserequest.md)

  ↳ **Login**

## Index

### Constructors

* [constructor](login.md#constructor)

### Properties

* [method](login.md#method)
* [request](login.md#request)
* [response](login.md#response)
* [targetNodeId](login.md#targetnodeid)

### Methods

* [buildRequest](login.md#buildrequest)

## Constructors

### constructor

\+ **new Login**(`login`: string, `passwd`: string, `login_token`: string, `sessionid`: string, `userVariables?`: Object): [Login](login.md)

*Overrides [BaseRequest](baserequest.md).[constructor](baserequest.md#constructor)*

*Defined in [packages/js/src/Modules/Verto/messages/verto/Login.ts:4](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/verto/Login.ts#L4)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`login` | string | - |
`passwd` | string | - |
`login_token` | string | - |
`sessionid` | string | - |
`userVariables` | Object | {} |

**Returns:** [Login](login.md)

## Properties

### method

•  **method**: string = "login"

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/messages/verto/Login.ts:4](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/verto/Login.ts#L4)*

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
