**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / INotification

# Interface: INotification

An event dispatched by Telnyx to notify the client of changes to the session or call.

The conditions of the event can be identified by the `type` property.

| `type` | Description | Additional properties |
|---|---|---|
| `callUpdate` | A call has changed state | `call` |
| `participantData` | Call participant data has changed | `call`, `displayDirection`, `displayName`, `displayNumber` |
| `userMediaError` | The browser does not have permission to access media devices | `error` |

**`examples`** 

Usage with [TelnyxRTC.on](../classes/telnyxrtc.md#on):
```js
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'callUpdate') {
    console.log(notification.call);

    // Do something with the call and update UI accordingly
  } else if (notification.type === 'participantData') {
    console.log(notification.displayName, notification.displayNumber);

    // Update UI with new display name and/or number
  } else if (notification.type === 'participantData') {
    console.log(notification.error);

    // Handle the error and update UI accordingly
  }
});
```

### Data structure

The notification structure is determined by its `type`.

#### `callUpdate`

```js
{
  type: 'callUpdate',
  call: Call // current call
}
```

#### `participantData`

```js
{
  type: 'participantData',
  call: Call,
  displayName: 'Ada Lovelace',
  displayNumber: '15551234567',
  displayDirection: 'inbound'
}
```

#### `userMediaError`

```js
{
  type: 'userMediaError',
  error: Error
}
```

## Hierarchy

* {}

  ↳ **INotification**

## Index

### Properties

* [call](inotification.md#call)
* [displayDirection](inotification.md#displaydirection)
* [displayName](inotification.md#displayname)
* [displayNumber](inotification.md#displaynumber)
* [error](inotification.md#error)
* [type](inotification.md#type)

## Properties

### call

• `Optional` **call**: ICall

The current call. Reference this call state to update your UI.

___

### displayDirection

• `Optional` **displayDirection**: \"inbound\" \| \"outbound\"

Participant's call direction.

___

### displayName

• `Optional` **displayName**: string

Participant's display name.

___

### displayNumber

• `Optional` **displayNumber**: string

Participant's display phone number or SIP address.

___

### error

• `Optional` **error**: Error

Error from the `userMediaError` event.
Check your `audio` and `video` constraints for browser support.

___

### type

•  **type**: string

Identifies the event case.
