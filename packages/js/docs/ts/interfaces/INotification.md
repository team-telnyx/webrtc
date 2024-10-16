An event dispatched by Telnyx to notify the client of changes to the session or call.

The conditions of the event can be identified by the `type` property.

| `type` | Description | Additional properties |
|---|---|---|
| `callUpdate` | A call has changed state | `call` |
| `userMediaError` | The browser does not have permission to access media devices | `error` |

**`Examples`**

Usage with TelnyxRTC Client `.on`:
```js
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'callUpdate') {
    console.log(notification.call);

    // Do something with the call and update UI accordingly
  } else if (notification.type === 'userMediaError') {
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

#### `userMediaError`

```js
{
  type: 'userMediaError',
  error: Error
}
```

**`Apialias`**

Notification

## Hierarchy

- `Omit`\<`INotificationEventData`, ``"call"``\>

  ↳ **`INotification`**

## Table of contents

### Properties

- [call](/docs/voice/webrtc/js-sdk/interfaces/INotification.md#call)
- [error](/docs/voice/webrtc/js-sdk/interfaces/INotification.md#error)
- [type](/docs/voice/webrtc/js-sdk/interfaces/INotification.md#type)

## Properties

### call

• `Optional` **call**: `ICall`

The current call. Reference this call state to update your UI.
See `Call` documentation.

___

### error

• `Optional` **error**: `Error`

Error from the `userMediaError` event.
Check your `audio` and `video` constraints for browser support.

#### Overrides

Omit.error

___

### type

• **type**: `string`

Identifies the event case.

#### Overrides

Omit.type
