**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Subscription

# Class: Subscription

## Hierarchy

* [BaseMessage](basemessage.md)

  ↳ **Subscription**

## Index

### Constructors

* [constructor](subscription.md#constructor)

### Properties

* [method](subscription.md#method)
* [request](subscription.md#request)
* [response](subscription.md#response)
* [targetNodeId](subscription.md#targetnodeid)

### Methods

* [buildRequest](subscription.md#buildrequest)

## Constructors

### constructor

\+ **new Subscription**(`params`: IBladeSubscriptionRequest[\"params\"]): [Subscription](subscription.md)

*Defined in [packages/js/src/Modules/Verto/messages/blade/Subscription.ts:5](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Subscription.ts#L5)*

#### Parameters:

Name | Type |
------ | ------ |
`params` | IBladeSubscriptionRequest[\"params\"] |

**Returns:** [Subscription](subscription.md)

## Properties

### method

•  **method**: string = "blade.subscription"

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/messages/blade/Subscription.ts:5](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Subscription.ts#L5)*

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
