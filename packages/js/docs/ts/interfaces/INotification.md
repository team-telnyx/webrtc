An event dispatched by Telnyx to notify the client of changes to the session or call.

The conditions of the event can be identified by the `type` property.

| `type`           | Description                                                  | Additional properties        | Status |
| ---------------- | ------------------------------------------------------------ | ---------------------------- | ------ |
| `callUpdate`     | A call has changed state                                     | `call`                       | Active |
| `userMediaError` | The browser does not have permission to access media devices | `error`                      | Deprecated |
| `vertoClientReady` | Client is ready to make/receive calls                      | `{}`                         | Deprecated — use `telnyx.ready` event instead |
| `peerConnectionFailureError` | Peer connection failed                          | `error`                      | Deprecated — use `telnyx.warning` event with `PEER_CONNECTION_FAILED` warning code |
| `signalingStateClosed` | Peer signaling state closed                            | `previousConnectionState`     | Deprecated |

> [!NOTE]
> Only `callUpdate` is the recommended notification type for application use. The other types are still emitted for backward compatibility but are deprecated — use the dedicated `telnyx.error`, `telnyx.warning`, and `telnyx.ready` events instead.

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

- `Omit`\<`INotificationEventData`, `"call"`\>

  ↳ **`INotification`**

## Table of contents

### Properties

- [call](#call)
- [error](#error)
- [type](#type)

## Properties

### call

• `Optional` **call**: [`Call`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/Call.md)

The current call. Reference this call state to update your UI.
See `Call` documentation.

---

### error

• `Optional` **error**: `Error`

Error from the `userMediaError` event.
Check your `audio` and `video` constraints for browser support.

#### Overrides

Omit.error

---

### type

• **type**: `string`

Identifies the event case.

#### Overrides

Omit.type
