# WebRTC JS SDK Error Handling

This guide reflects the current SDK surface in this branch.

The current SDK exposes error-related behavior through three main channels:

- `telnyx.error` for structured failures.
- `telnyx.warning` for degraded but recoverable conditions.
- `telnyx.notification` for call/session updates plus a small set of backward-compatible notifications.

Use `telnyx.ready` to know when the client is authenticated and the gateway is ready. Do not treat readiness as a `telnyx.notification` case.

## Table of Contents

- [Event Overview](#event-overview)
- [Structured Errors (`telnyx.error`)](#structured-errors-telnyxerror)
- [Structured Warnings (`telnyx.warning`)](#structured-warnings-telnyxwarning)
- [Notifications (`telnyx.notification`)](#notifications-telnyxnotification)
- [Call Termination Data](#call-termination-data)
- [Socket Events](#socket-events)
- [Reconnection Behavior](#reconnection-behavior)
- [Legacy RTC Events and Migration](#legacy-rtc-events-and-migration)

## Event Overview

| Event | Purpose | Recommended use |
| --- | --- | --- |
| `telnyx.ready` | Client is authenticated and gateway reached `REGISTER` or `REGED` | Enable calling UI and flush any reconnect state |
| `telnyx.error` | Fatal or blocking SDK errors | Show actionable errors, retry, re-authenticate, or fail the current action |
| `telnyx.warning` | Non-fatal quality, connectivity, and token warnings | Show degraded-state UI and collect telemetry |
| `telnyx.notification` | Call lifecycle updates and compatibility notifications | Drive call UI and hangup handling |
| `telnyx.socket.close` | Raw WebSocket close event | Log close codes and monitor reconnect behavior |
| `telnyx.socket.error` | Raw WebSocket error wrapper | Log opaque socket failures alongside `sessionId` |

## Structured Errors (`telnyx.error`)

`telnyx.error` is the primary error surface in the current SDK.

### Imports

```ts
import {
  SwEvent,
  TelnyxError,
  TELNYX_ERROR_CODES,
  SDK_ERRORS,
  isMediaRecoveryErrorEvent,
} from '@telnyx/webrtc';
```

- `TelnyxError` is the structured error class emitted by the SDK.
- `isMediaRecoveryErrorEvent()` is the type guard for inbound permission recovery flows.
- `TELNYX_ERROR_CODES` provides named constants for numeric error comparisons.
- `SDK_ERRORS` provides the registered error metadata.

### Payload shapes

```ts
interface ITelnyxStandardErrorEvent {
  error: ITelnyxError;
  sessionId: string;
  callId?: string;
  recoverable?: false;
}

interface ITelnyxMediaRecoveryErrorEvent {
  error: ITelnyxMediaError;
  sessionId: string;
  callId: string;
  recoverable: true;
  retryDeadline: number;
  resume: () => void;
  reject: () => void;
}

type ITelnyxErrorEvent =
  | ITelnyxStandardErrorEvent
  | ITelnyxMediaRecoveryErrorEvent;
```

`recoverable: true` is used only for inbound media-permission recovery when `mediaPermissionsRecovery.enabled` is configured and the initial `getUserMedia()` attempt fails while answering a call.

### Basic example

```ts
client.on(SwEvent.Error, (event) => {
  if (isMediaRecoveryErrorEvent(event)) {
    openPermissionsDialog({
      deadline: event.retryDeadline,
      onRetry: () => event.resume(),
      onCancel: () => event.reject(),
    });
    return;
  }

  if (!(event.error instanceof TelnyxError)) {
    showErrorMessage('An unknown SDK error occurred.');
    return;
  }

  switch (event.error.code) {
    case TELNYX_ERROR_CODES.NETWORK_OFFLINE:
      showErrorMessage('You appear to be offline.');
      break;
    case TELNYX_ERROR_CODES.AUTHENTICATION_REQUIRED:
      showErrorMessage('Session expired. Please authenticate again.');
      break;
    default:
      showErrorMessage(event.error.message);
  }
});
```

### Error code reference

#### SDP errors

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `40001` | `SDP_CREATE_OFFER_FAILED` | Failed to create call offer | `RTCPeerConnection.createOffer()` failed |
| `40002` | `SDP_CREATE_ANSWER_FAILED` | Failed to answer the call | `RTCPeerConnection.createAnswer()` failed |
| `40003` | `SDP_SET_LOCAL_DESCRIPTION_FAILED` | Failed to apply local call settings | `setLocalDescription()` failed |
| `40004` | `SDP_SET_REMOTE_DESCRIPTION_FAILED` | Failed to apply remote call settings | `setRemoteDescription()` failed |
| `40005` | `SDP_SEND_FAILED` | Failed to send call data to server | Invite/answer signaling could not be sent |

#### Media errors

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `42001` | `MEDIA_MICROPHONE_PERMISSION_DENIED` | Microphone access denied | Browser or OS denied microphone permission |
| `42002` | `MEDIA_DEVICE_NOT_FOUND` | No microphone found | Missing/disconnected device or invalid `deviceId` |
| `42003` | `MEDIA_GET_USER_MEDIA_FAILED` | Failed to access microphone | `getUserMedia()` failed for another reason |

#### Call-control errors

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `44001` | `HOLD_FAILED` | Failed to hold the call | Hold request failed |
| `44002` | `INVALID_CALL_PARAMETERS` | Invalid call parameters | Required call params were missing or invalid |
| `44003` | `BYE_SEND_FAILED` | Failed to hang up cleanly | Local hangup succeeded but BYE could not be sent |
| `44004` | `SUBSCRIBE_FAILED` | Failed to subscribe to call events | Verto subscribe failed |

#### WebSocket and transport errors

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `45001` | `WEBSOCKET_CONNECTION_FAILED` | Unable to connect to server | WebSocket construction/connection failed |
| `45002` | `WEBSOCKET_ERROR` | Connection to server lost | Browser `ws.onerror` fired |
| `45003` | `RECONNECTION_EXHAUSTED` | Unable to reconnect to server | Gateway reconnect attempts were exhausted |
| `45004` | `GATEWAY_FAILED` | Gateway connection failed | Gateway reported `FAILED` or `FAIL_WAIT` |

#### Authentication and session errors

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `46001` | `LOGIN_FAILED` | Authentication failed | Login rejected or registration never reached ready state |
| `46002` | `INVALID_CREDENTIALS` | Invalid credential parameters | Client-side login validation failed before request send |
| `46003` | `AUTHENTICATION_REQUIRED` | Authentication required | Request sent before auth completed or after auth was lost |
| `48001` | `NETWORK_OFFLINE` | Device is offline | Browser `offline` event fired |
| `49001` | `UNEXPECTED_ERROR` | An unexpected error occurred | Unclassified failure during peer/call setup |

> [!NOTE]
> Invalid login options currently also include `type: ERROR_TYPE.invalidCredentialsOptions` on the runtime event payload for backward compatibility. The stable signal to key on is still `event.error.code === TELNYX_ERROR_CODES.INVALID_CREDENTIALS`.

## Structured Warnings (`telnyx.warning`)

Warnings are not fatal. They describe degraded behavior, quality issues, or situations that may need user action before the session breaks.

### Payload shape

```ts
interface ITelnyxWarningEvent {
  warning: ITelnyxWarning;
  sessionId: string;
  callId?: string;
}
```

### Basic example

```ts
import { SwEvent, TELNYX_WARNING_CODES, SDK_WARNINGS } from '@telnyx/webrtc';

client.on(SwEvent.Warning, ({ warning, callId }) => {
  if (warning.code === TELNYX_WARNING_CODES.TOKEN_EXPIRING_SOON) {
    refreshTokenSoon();
    return;
  }

  if (warning.code === TELNYX_WARNING_CODES.PEER_CONNECTION_FAILED) {
    showWarningBanner(`Call ${callId ?? ''} is reconnecting`.trim());
    return;
  }

  console.debug(SDK_WARNINGS[warning.code]?.description);
  console.warn(`[${warning.code}] ${warning.name}: ${warning.message}`);
});
```

### Warning code reference

#### Network quality warnings

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `31001` | `HIGH_RTT` | High network latency detected | RTT stayed above threshold |
| `31002` | `HIGH_JITTER` | High jitter detected | Jitter stayed above threshold |
| `31003` | `HIGH_PACKET_LOSS` | High packet loss detected | Packet loss stayed above threshold |
| `31004` | `LOW_MOS` | Low call quality score | MOS stayed below threshold |

#### Data-flow warnings

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `32001` | `LOW_BYTES_RECEIVED` | No audio data received | Remote audio bytes stopped increasing |
| `32002` | `LOW_BYTES_SENT` | No audio data being sent | Local audio bytes stopped increasing |

#### Connectivity warnings

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `33001` | `ICE_CONNECTIVITY_LOST` | Connection interrupted | ICE connection state became `disconnected` |
| `33002` | `ICE_GATHERING_TIMEOUT` | ICE gathering timed out | ICE gathering safety timeout fired |
| `33003` | `ICE_GATHERING_EMPTY` | No ICE candidates gathered | No candidates were collected |
| `33004` | `PEER_CONNECTION_FAILED` | Connection failed | Peer connection state became `failed` |
| `33005` | `ONLY_HOST_ICE_CANDIDATES` | Only local network candidates available | SDP contained only host ICE candidates |

#### Authentication and session warnings

| Code | Name | Message | Typical trigger |
| --- | --- | --- | --- |
| `34001` | `TOKEN_EXPIRING_SOON` | Authentication token expiring soon | JWT expires within 120 seconds |
| `35001` | `SESSION_NOT_REATTACHED` | Active call lost after reconnect | Server returned an empty `reattached_sessions` list while calls still existed locally |

## Notifications (`telnyx.notification`)

`telnyx.notification` is still important, but it is no longer the main place to integrate error handling logic. Use it primarily for call lifecycle and UI synchronization.

### Important clarification

- `telnyx.ready` is separate from `telnyx.notification`.
- The `vertoClientReady` payload is emitted on `telnyx.ready`, not on `telnyx.notification`.

### Error-related notification types

| `notification.type` | Current status | Payload notes |
| --- | --- | --- |
| `callUpdate` | Active | Includes `call`; use this for call state and hangup data |
| `userMediaError` | Compatibility notification | Final media-failure notification. Includes raw browser/media `error`, `errorName`, `errorMessage`, and `call` when available |
| `peerConnectionFailureError` | Compatibility notification | Includes raw `error`; structured replacement is warning `33004` |
| `signalingStateClosed` | Active | Includes `sessionId`; indicates the current peer signaling state closed |

### Listener scoping

Notifications are dispatched to the call scope first. If a call-level listener handles the notification, the session-level listener **does not** also receive it — it is one or the other, not both.

- `onNotification` on a call (passed via call options) is the highest-priority hook for that call.
- `client.on(SwEvent.Notification, ...)` is the session-level fallback that only fires when no call-level listener is registered.
- If no listeners exist at either level, the notification is silently dropped.

For `peerConnectionFailureError` and `signalingStateClosed`, prefer call-scoped handling or the structured warning/error events when you need explicit call correlation. The compatibility notification payload itself does not include `callId`.

### Screen-share behavior

All `telnyx.notification` dispatches are suppressed for calls created with `screenShare: true`.

If you need recovery state for a screen-share call, inspect the call object directly:

```ts
if (screenShareCall.signalingStateClosed) {
  console.log('This screen-share peer is no longer recoverable.');
}
```

### Example: hangup and recovery-aware call updates

```ts
client.on(SwEvent.Notification, (notification) => {
  if (notification.type !== 'callUpdate' || !notification.call) {
    return;
  }

  const call = notification.call;

  if (call.recoveredCallId) {
    removeOldCallUi(call.recoveredCallId);
  }

  if (call.state === 'recovering') {
    showConnectionStatus('recovering');
    return;
  }

  if (call.state === 'hangup') {
    console.log('Call ended', {
      cause: call.cause,
      causeCode: call.causeCode,
      sipCode: call.sipCode,
      sipReason: call.sipReason,
    });
  }
});
```

## Call Termination Data

When a call reaches `hangup`, inspect these fields on the `Call` object:

| Field | Type | Meaning |
| --- | --- | --- |
| `cause` | `string` | High-level cause such as `USER_BUSY` or `CALL_REJECTED` |
| `causeCode` | `number` | Numeric cause code |
| `sipCode` | `number` | SIP response code when available |
| `sipReason` | `string` | SIP reason phrase when available |

Typical cases:

| Field value | Meaning |
| --- | --- |
| `cause === 'NORMAL_CLEARING'` | Expected call completion |
| `cause === 'USER_BUSY'` | Remote party was busy |
| `cause === 'CALL_REJECTED'` | Remote party rejected the call |
| `cause === 'NO_ANSWER'` | Call timed out unanswered |
| `cause === 'UNALLOCATED_NUMBER'` | Dialed number is invalid or does not exist |
| `cause === 'PURGE'` | Call was purged from the system |
| `sipCode === 403` | Forbidden |
| `sipCode === 404` | Destination not found |
| `sipCode === 486` | Busy Here |

## Socket Events

The SDK exposes both raw socket events and structured transport errors.

### `telnyx.socket.close`

`telnyx.socket.close` delivers the browser `CloseEvent` unchanged. During a forced safety cleanup, the SDK emits a synthetic abnormal close with:

- `code: 1006`
- `reason: 'STUCK_WS_TIMEOUT: Socket got stuck in CLOSING state and was forcefully cleaned up by safety timeout'`
- `wasClean: false`

Useful close codes:

| Code | Meaning |
| --- | --- |
| `1000` | Normal closure |
| `1001` | Going away |
| `1002` | Protocol error |
| `1003` | Unsupported data |
| `1005` | No status code received |
| `1006` | Abnormal closure |
| `1011` | Internal error |

### `telnyx.socket.error`

`telnyx.socket.error` delivers:

```ts
{
  error: ErrorEvent | Event;
  sessionId: string;
}
```

This event is intentionally low-detail because browsers expose very little information for WebSocket errors. The SDK also emits `telnyx.error` with code `45002` (`WEBSOCKET_ERROR`) when `ws.onerror` fires.

### Connection state helpers

The browser session exposes WebSocket state helpers on `client.connection`:

| Getter | Meaning |
| --- | --- |
| `client.connection.connecting` | WebSocket is in `CONNECTING` |
| `client.connection.connected` | WebSocket is in `OPEN` |
| `client.connection.closing` | WebSocket is in `CLOSING` |
| `client.connection.closed` | WebSocket is in `CLOSED` |
| `client.connection.isAlive` | `CONNECTING` or `OPEN` |
| `client.connection.isDead` | `CLOSING` or `CLOSED` |

Example:

```ts
const placeCall = (destinationNumber: string) => {
  if (!client.connection.connected) {
    showErrorMessage('Still connecting to Telnyx. Please try again shortly.');
    return;
  }

  client.newCall({ destinationNumber });
};
```

## Reconnection Behavior

The previous version of this document described a generic exponential-backoff flow. That is not how the current browser SDK reconnects.

### What the current SDK does

1. On `telnyx.socket.close` or `telnyx.socket.error`, the SDK clears subscriptions and resets gateway readiness state.
2. If `autoReconnect` is enabled, the browser session schedules `connect()` after `client.reconnectDelay`.
3. In the browser session, `reconnectDelay` is currently `1000` ms.
4. When the gateway reports `REGISTER` or `REGED` again, the SDK emits `telnyx.ready` again.

### Gateway retry behavior

Gateway-state retries use separate jittered delays:

- `UNREGED` / `NOREG`: up to 5 registration retries, each delayed by a random `2` to `6` seconds. After that the SDK emits `LOGIN_FAILED` (`46001`).
- `FAILED` / `FAIL_WAIT`: `GATEWAY_FAILED` (`45004`) is emitted on first detection. If `autoReconnect` stays enabled, the SDK retries up to 5 times with a random `2` to `6` second delay before `RECONNECTION_EXHAUSTED` (`45003`).

### Keeping media alive across socket loss

If `keepConnectionAliveOnSocketClose` is `true`, the SDK will try to preserve active peer connections while signaling reconnects.

- If the peer is still recoverable, the SDK disconnects and reconnects the socket while keeping the call alive.
- If the peer signaling state is already closed, the SDK falls back to a full reconnect path.

### Recovery and call objects

Recovery can create a new `Call` object. When that happens:

- The new call exposes `recoveredCallId`.
- The call may stay in `recovering` until media/signaling are restored.
- Your UI should remove or merge the old call UI using `recoveredCallId`.

## Legacy RTC Events and Migration

The SDK still exposes low-level RTC events, but new integrations should prefer `telnyx.error`, `telnyx.warning`, and `telnyx.notification`.

### Legacy or low-level RTC events

| Event | Status | Preferred surface |
| --- | --- | --- |
| `telnyx.rtc.mediaError` | Legacy/compatibility | `telnyx.error` with `42001`, `42002`, or `42003` |
| `telnyx.rtc.peerConnectionFailureError` | Legacy/compatibility | `telnyx.warning` with `33004` |
| `telnyx.rtc.peerConnectionSignalingStateClosed` | Low-level active event | `notification.type === 'signalingStateClosed'` if you want the higher-level notification |

### Migration checklist

1. Add a `telnyx.error` listener and switch on `event.error.code`.
2. Add a `telnyx.warning` listener and switch on `warning.code`.
3. Keep `telnyx.notification` for `callUpdate` and any compatibility notifications you still depend on.
4. Treat `telnyx.ready` as the only readiness signal.
5. Prefer `TELNYX_ERROR_CODES` and `TELNYX_WARNING_CODES` over hard-coded numeric literals.
6. If you support inbound permission recovery, enable `mediaPermissionsRecovery` and handle `isMediaRecoveryErrorEvent(event)`.
