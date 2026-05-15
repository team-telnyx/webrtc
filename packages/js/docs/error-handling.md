# WebRTC JS SDK Error Handling

This guide reflects the current SDK surface in this branch.

The current SDK exposes error-related behavior through three main channels:

- `telnyx.error` for structured failures.
- `telnyx.warning` for degraded but recoverable conditions.
- `telnyx.notification` for call/session updates plus a small set of backward-compatible notifications.

Use `telnyx.ready` to know when the client is authenticated and the gateway is ready. Do not treat readiness as a `telnyx.notification` case.

> **Version note:** The structured error and warning system (`TELNYX_ERROR_CODES`, `telnyx.warning`, `TelnyxError`) was introduced after v2.25.25. If you are on v2.25.25, see the [Error handling in v2.25.25](#error-handling-in-v22525) section below.

## Table of Contents

- [Event Overview](#event-overview)
- [Structured Errors (`telnyx.error`)](#structured-errors-telnyxerror)
- [Structured Warnings (`telnyx.warning`)](#structured-warnings-telnyxwarning)
- [Notifications (`telnyx.notification`)](#notifications-telnyxnotification)
- [Call Termination Data](#call-termination-data)
- [Socket Events](#socket-events)
- [Reconnection Behavior](#reconnection-behavior)
- [Error Handling in v2.25.25](#error-handling-in-v22525)
- [Legacy RTC Events and Migration](#legacy-rtc-events-and-migration)

## Event Overview

| Event                 | Purpose                                                           | Recommended use                                                            |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `telnyx.ready`        | Client is authenticated and gateway reached `REGISTER` or `REGED` | Enable calling UI and flush any reconnect state                            |
| `telnyx.error`        | Fatal or blocking SDK errors                                      | Show actionable errors, retry, re-authenticate, or fail the current action |
| `telnyx.warning`      | Non-fatal quality, connectivity, and token warnings               | Show degraded-state UI and collect telemetry                               |
| `telnyx.notification` | Call lifecycle updates and compatibility notifications            | Drive call UI and hangup handling                                          |
| `telnyx.socket.close` | Raw WebSocket close event                                         | Log close codes and monitor reconnect behavior                             |
| `telnyx.socket.error` | Raw WebSocket error wrapper                                       | Log opaque socket failures alongside `sessionId`                           |

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

Each error below is classified as **fatal** or **non-fatal** and includes guidance on what action you should take versus what the SDK handles automatically.

#### SDP errors

| Code    | Name                                | Message                              | Typical trigger                           | Fatal? | Customer action                             |
| ------- | ----------------------------------- | ------------------------------------ | ----------------------------------------- | ------ | ------------------------------------------- |
| `40001` | `SDP_CREATE_OFFER_FAILED`           | Failed to create call offer          | `RTCPeerConnection.createOffer()` failed  | Fatal  | Show error; retry with `client.newCall()`   |
| `40002` | `SDP_CREATE_ANSWER_FAILED`          | Failed to answer the call            | `RTCPeerConnection.createAnswer()` failed | Fatal  | Show error; inbound call cannot be answered |
| `40003` | `SDP_SET_LOCAL_DESCRIPTION_FAILED`  | Failed to apply local call settings  | `setLocalDescription()` failed            | Fatal  | Show error; retry the call                  |
| `40004` | `SDP_SET_REMOTE_DESCRIPTION_FAILED` | Failed to apply remote call settings | `setRemoteDescription()` failed           | Fatal  | Show error; retry the call                  |
| `40005` | `SDP_SEND_FAILED`                   | Failed to send call data to server   | Invite/answer signaling could not be sent | Fatal  | Show error; retry the call                  |

#### Media errors

| Code    | Name                                 | Message                     | Typical trigger                                   | Fatal?                                          | Customer action                                                                                                      |
| ------- | ------------------------------------ | --------------------------- | ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `42001` | `MEDIA_MICROPHONE_PERMISSION_DENIED` | Microphone access denied    | Browser or OS denied microphone permission        | Fatal unless `mediaPermissionsRecovery` enabled | Prompt user for microphone permission; if `mediaPermissionsRecovery.enabled`, a recoverable error is emitted instead |
| `42002` | `MEDIA_DEVICE_NOT_FOUND`             | No microphone found         | Missing/disconnected device or invalid `deviceId` | Fatal                                           | Check microphone connection and `deviceId`                                                                           |
| `42003` | `MEDIA_GET_USER_MEDIA_FAILED`        | Failed to access microphone | `getUserMedia()` failed for another reason        | Fatal unless `mediaPermissionsRecovery` enabled | Check browser permissions and device; if `mediaPermissionsRecovery.enabled`, a recoverable error is emitted instead  |

#### Call-control errors

| Code    | Name                      | Message                                           | Typical trigger                                    | Fatal?    | Customer action                               |
| ------- | ------------------------- | ------------------------------------------------- | -------------------------------------------------- | --------- | --------------------------------------------- |
| `44001` | `HOLD_FAILED`             | Failed to hold the call                           | Hold request failed                                | Non-fatal | Retry hold operation                          |
| `44002` | `INVALID_CALL_PARAMETERS` | Invalid call parameters                           | Required call params were missing or invalid       | Fatal     | Fix call parameters before retrying           |
| `44003` | `BYE_SEND_FAILED`         | Failed to hang up cleanly                         | Local hangup succeeded but BYE could not be sent   | Non-fatal | No action needed; local hangup completes      |
| `44004` | `SUBSCRIBE_FAILED`        | Failed to subscribe to call events                | Verto subscribe failed                             | Fatal     | Check connection state; may need to reconnect |
| `44005` | `PEER_CLOSED_DURING_INIT` | Peer connection closed during call initialization | Peer connection closed before call setup completed | Fatal     | Retry the call                                |

#### WebSocket and transport errors

| Code    | Name                          | Message                       | Typical trigger                           | Fatal?            | Customer action                                                                   |
| ------- | ----------------------------- | ----------------------------- | ----------------------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| `45001` | `WEBSOCKET_CONNECTION_FAILED` | Unable to connect to server   | WebSocket construction/connection failed  | Fatal for session | Check network; call `client.connect()` to retry                                   |
| `45002` | `WEBSOCKET_ERROR`             | Connection to server lost     | Browser `ws.onerror` fired                | Fatal for session | SDK auto-reconnects if `autoReconnect` enabled; otherwise call `client.connect()` |
| `45003` | `RECONNECTION_EXHAUSTED`      | Unable to reconnect to server | Gateway reconnect attempts were exhausted | Fatal for session | Call `client.connect()` manually to start fresh                                   |
| `45004` | `GATEWAY_FAILED`              | Gateway connection failed     | Gateway reported `FAILED` or `FAIL_WAIT`  | Fatal for session | SDK auto-reconnects if `autoReconnect` enabled; otherwise call `client.connect()` |

#### Authentication and session errors

| Code    | Name                      | Message                       | Typical trigger                                           | Fatal?            | Customer action                                            |
| ------- | ------------------------- | ----------------------------- | --------------------------------------------------------- | ----------------- | ---------------------------------------------------------- |
| `46001` | `LOGIN_FAILED`            | Authentication failed         | Login rejected or registration never reached ready state  | Fatal for session | Re-authenticate with valid credentials                     |
| `46002` | `INVALID_CREDENTIALS`     | Invalid credential parameters | Client-side login validation failed before request send   | Fatal for session | Fix credential parameters                                  |
| `46003` | `AUTHENTICATION_REQUIRED` | Authentication required       | Request sent before auth completed or after auth was lost | Fatal for session | Re-authenticate with a new token                           |
| `48001` | `NETWORK_OFFLINE`         | Device is offline             | Browser `offline` event fired                             | Fatal for session | Restore connectivity; SDK auto-reconnects when back online |
| `49001` | `UNEXPECTED_ERROR`        | An unexpected error occurred  | Unclassified failure during peer/call setup               | Fatal             | Check logs; retry the operation                            |

> [!NOTE]
> Invalid login options currently also include `type: ERROR_TYPE.invalidCredentialsOptions` on the runtime event payload for backward compatibility. The stable signal to key on is still `event.error.code === TELNYX_ERROR_CODES.INVALID_CREDENTIALS`.

## Structured Warnings (`telnyx.warning`)

Warnings are not fatal. They describe degraded behavior, quality issues, or situations that may need user action before the session breaks. The SDK continues operating after emitting a warning.

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

| Code    | Name               | Message                       | Typical trigger                    | Auto-recovered?  | Customer action                                |
| ------- | ------------------ | ----------------------------- | ---------------------------------- | ---------------- | ---------------------------------------------- |
| `31001` | `HIGH_RTT`         | High network latency detected | RTT stayed above threshold         | May self-resolve | Show quality indicator; no immediate action    |
| `31002` | `HIGH_JITTER`      | High jitter detected          | Jitter stayed above threshold      | May self-resolve | Show quality indicator; no immediate action    |
| `31003` | `HIGH_PACKET_LOSS` | High packet loss detected     | Packet loss stayed above threshold | May self-resolve | Show quality indicator; no immediate action    |
| `31004` | `LOW_MOS`          | Low call quality score        | MOS stayed below threshold         | May self-resolve | Show quality indicator; consider advising user |

#### Data-flow warnings

| Code    | Name                 | Message                  | Typical trigger                       | Auto-recovered?               | Customer action                                       |
| ------- | -------------------- | ------------------------ | ------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| `32001` | `LOW_BYTES_RECEIVED` | No audio data received   | Remote audio bytes stopped increasing | May self-resolve on reconnect | Show degraded audio indicator; check remote party     |
| `32002` | `LOW_BYTES_SENT`     | No audio data being sent | Local audio bytes stopped increasing  | May self-resolve on reconnect | Show degraded audio indicator; check local microphone |

#### Connectivity warnings

| Code    | Name                       | Message                                               | Typical trigger                                          | Auto-recovered?            | Customer action                                        |
| ------- | -------------------------- | ----------------------------------------------------- | -------------------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| `33001` | `ICE_CONNECTIVITY_LOST`    | Connection interrupted                                | ICE connection state became `disconnected`               | SDK attempts ICE reconnect | Show reconnecting indicator; wait for recovery         |
| `33002` | `ICE_GATHERING_TIMEOUT`    | ICE gathering timed out                               | ICE gathering safety timeout fired                       | May self-resolve           | Check firewall/STUN/TURN config                        |
| `33003` | `ICE_GATHERING_EMPTY`      | No ICE candidates gathered                            | No candidates were collected                             | No                         | Check network/firewall; STUN/TURN may be blocked       |
| `33004` | `PEER_CONNECTION_FAILED`   | Connection failed                                     | Peer connection state became `failed`                    | No                         | Call likely lost; may trigger reconnection or hangup   |
| `33005` | `ONLY_HOST_ICE_CANDIDATES` | Only local network candidates available               | SDP contained only host ICE candidates                   | No                         | Check STUN/TURN config; may work on local network only |
| `33006` | `ANSWER_WHILE_PEER_ACTIVE` | Answer attempted while peer connection already active | An answer was received while the peer was already active | No                         | Log for debugging; typically harmless                  |

#### Authentication and session warnings

| Code    | Name                     | Message                            | Typical trigger                                                                       | Auto-recovered?     | Customer action                           |
| ------- | ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------- |
| `34001` | `TOKEN_EXPIRING_SOON`    | Authentication token expiring soon | JWT expires within 120 seconds                                                        | No, but preventable | Refresh token before expiry; ~120s window |
| `35001` | `SESSION_NOT_REATTACHED` | Active call lost after reconnect   | Server returned an empty `reattached_sessions` list while calls still existed locally | No                  | Clean up call UI; active calls were lost  |

## Notifications (`telnyx.notification`)

`telnyx.notification` is still important, but it is no longer the main place to integrate error handling logic. Use it primarily for call lifecycle and UI synchronization.

### Important clarification

- `telnyx.ready` is separate from `telnyx.notification`.
- The `vertoClientReady` payload is emitted on `telnyx.ready`, not on `telnyx.notification`.

### Error-related notification types

| `notification.type`          | Current status             | Payload notes                                                                                                                |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `callUpdate`                 | Active                     | Includes `call`; use this for call state and hangup data                                                                     |
| `userMediaError`             | Compatibility notification | Final media-failure notification. Includes raw browser/media `error`, `errorName`, `errorMessage`, and `call` when available |
| `peerConnectionFailureError` | Compatibility notification | Includes raw `error`; structured replacement is warning `33004`                                                              |
| `signalingStateClosed`       | Active                     | Includes `sessionId`; indicates the current peer signaling state closed                                                      |

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

  switch (call.state) {
    case State.Active:
      enableMuteAndDtmf(call);
      break;
    case State.Hangup:
      showCallEnded(call.cause, call.sipCode, call.sipReason);
      break;
    case State.Recovering:
      showReconnectingBanner();
      break;
  }
});
```

## Call Termination Data

When a call reaches `hangup`, inspect these fields on the `Call` object:

| Field       | Type     | Meaning                                               |
| ----------- | -------- | ----------------------------------------------------- |
| `cause`     | `string` | High-level cause (`USER_BUSY`, `CALL_REJECTED`, etc.) |
| `causeCode` | `number` | Numeric cause code                                    |
| `sipCode`   | `number` | SIP response code when available                      |
| `sipReason` | `string` | SIP reason phrase when available                      |

Common causes:

| Cause                | Meaning                                    |
| -------------------- | ------------------------------------------ |
| `NORMAL_CLEARING`    | Expected call completion                   |
| `USER_BUSY`          | Remote party was busy                      |
| `CALL_REJECTED`      | Remote party rejected the call             |
| `NO_ANSWER`          | Call timed out unanswered                  |
| `UNALLOCATED_NUMBER` | Dialed number is invalid or does not exist |

## Socket Events

### `telnyx.socket.close`

`telnyx.socket.close` delivers the browser `CloseEvent`. During a forced safety cleanup, the SDK emits a synthetic abnormal close with `code: 1006` and `wasClean: false`.

Useful close codes:

| Code   | Meaning          |
| ------ | ---------------- |
| `1000` | Normal closure   |
| `1001` | Going away       |
| `1006` | Abnormal closure |
| `1011` | Internal error   |

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

| Getter                         | Meaning                      |
| ------------------------------ | ---------------------------- |
| `client.connection.connecting` | WebSocket is in `CONNECTING` |
| `client.connection.connected`  | WebSocket is in `OPEN`       |
| `client.connection.closing`    | WebSocket is in `CLOSING`    |
| `client.connection.closed`     | WebSocket is in `CLOSED`     |
| `client.connection.isAlive`    | `CONNECTING` or `OPEN`       |
| `client.connection.isDead`     | `CLOSING` or `CLOSED`        |

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

### Limiting reconnect attempts

Use `maxReconnectAttempts` to cap automatic reconnect attempts after an unexpected disconnect:

```ts
const client = new TelnyxRTC({
  login_token: jwt,
  autoReconnect: true,
  maxReconnectAttempts: 10,
});
```

When the limit is reached, `RECONNECTION_EXHAUSTED` (`45003`) is emitted and no further automatic reconnects are attempted. Call `client.connect()` manually to start a fresh retry sequence.

### Keeping media alive across socket loss

If `keepConnectionAliveOnSocketClose` is `true`, the SDK will try to preserve active peer connections while signaling reconnects.

- If the peer is still recoverable, the SDK disconnects and reconnects the socket while keeping the call alive.
- If the peer signaling state is already closed, the SDK falls back to a full reconnect path.

### Clearing reconnect stickiness

By default, the SDK reconnects to the same `b2bua-rtc` instance. To break this stickiness and route to a different instance:

```ts
// Before reconnecting
client.clearReconnectToken();

// Or configure the SDK to skip the last voice SDK ID on reconnect
const client = new TelnyxRTC({
  login_token: jwt,
  skipLastVoiceSdkId: true,
});
```

### Recovery and call objects

Recovery can create a new `Call` object. When that happens:

- The new call exposes `recoveredCallId`.
- The call may stay in `recovering` until media/signaling are restored.
- Your UI should remove or merge the old call UI using `recoveredCallId`.

## Error Handling in v2.25.25

> **Important:** If you are using SDK version `2.25.25`, the error handling architecture is fundamentally different from the current version. This section documents the v2.25.25 error surface.

### What is different in v2.25.25

| Feature                       | v2.25.25                                             | v2.26.0+                                                 |
| ----------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Structured error codes        | Not available                                        | `TELNYX_ERROR_CODES` with numeric codes                  |
| `telnyx.warning` event        | Not available                                        | Available with `TELNYX_WARNING_CODES`                    |
| `TelnyxError` class           | Not available                                        | Structured error class with `.code`, `.name`, `.message` |
| `isMediaRecoveryErrorEvent()` | Not available                                        | Available for media permission recovery                  |
| `SDK_ERRORS` / `SDK_WARNINGS` | Not available                                        | Available for error/warning metadata                     |
| Primary error surface         | `telnyx.error` (raw `Error`) + `telnyx.notification` | `telnyx.error` (structured) + `telnyx.warning`           |

### Error events in v2.25.25

In v2.25.25, errors are emitted through two channels:

**`telnyx.error`** — Session-level errors with raw `Error` objects (no `.code` property):

```ts
client.on(SwEvent.Error, (event) => {
  // event.error is a plain Error object — no structured code
  // event.type may include ERROR_TYPE.invalidCredentialsOptions
  // event.sessionId is available
  console.error('SDK error:', event.error?.message || event.error);
});
```

**`telnyx.rtc.mediaError`** — Media device errors (peer-scoped):

```ts
client.on(SwEvent.MediaError, (error) => {
  // error is a raw Error or DOMException
  console.error('Media error:', error?.name, error?.message);
});
```

**`telnyx.rtc.peerConnectionFailureError`** — Peer connection failures (peer-scoped):

```ts
client.on(SwEvent.PeerConnectionFailureError, (error) => {
  // error is a raw error object
  console.error('Peer connection failure:', error);
});
```

**`telnyx.rtc.peerConnectionSignalingStateClosed`** — Peer signaling state closed (peer-scoped):

```ts
client.on(SwEvent.PeerConnectionSignalingStateClosed, (data) => {
  // The call is no longer recoverable
  console.warn('Signaling state closed, call not recoverable');
});
```

### Notification-based error handling in v2.25.25

In v2.25.25, `telnyx.notification` carries both call lifecycle updates **and** error information. Error-related notification types:

| `notification.type`          | Meaning                     | Fatal?                     | Customer action                                                            |
| ---------------------------- | --------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `userMediaError`             | Media device access failed  | Yes (for the call)         | Prompt user for microphone permission; SDK hangs up the call automatically |
| `peerConnectionFailureError` | Peer connection failed      | Yes (for the call)         | Show error; call is lost                                                   |
| `signalingStateClosed`       | Peer signaling state closed | Yes (call not recoverable) | Clean up call UI; call cannot be recovered                                 |

Example:

```ts
client.on(SwEvent.Notification, (notification) => {
  switch (notification.type) {
    case 'userMediaError':
      // notification.error — raw browser Error/DOMException
      // notification.errorName — error name string
      // notification.errorMessage — error message string
      // notification.call — the Call object (if available)
      // SDK automatically hangs up the call
      showPermissionPrompt(notification.errorMessage);
      break;

    case 'peerConnectionFailureError':
      // notification.error — raw error
      showCallLostMessage();
      break;

    case 'signalingStateClosed':
      // Call is not recoverable
      cleanUpCallUI();
      break;

    case 'callUpdate':
      // Normal call lifecycle
      handleCallUpdate(notification.call);
      break;
  }
});
```

### Authentication errors in v2.25.25

Login errors are emitted on `telnyx.error` with a `type` field for invalid credentials:

```ts
import { SwEvent, ERROR_TYPE } from '@telnyx/webrtc';

client.on(SwEvent.Error, (event) => {
  if (event.type === ERROR_TYPE.invalidCredentialsOptions) {
    // Credentials were invalid before the request was sent
    showLoginError('Please check your credentials.');
    return;
  }

  // Other errors — generic handling
  showErrorMessage(event.error?.message || 'An error occurred');
});
```

### Reconnection in v2.25.25

Reconnection behavior is the same as the current version with these differences:

- No `maxReconnectAttempts` option (unlimited reconnects)
- No `clearReconnectToken()` method
- No `skipLastVoiceSdkId` option
- `autoReconnect` defaults to `true`
- `keepConnectionAliveOnSocketClose` is available

### Migrating from v2.25.25 to the latest

If you are upgrading from v2.25.25 to the latest version:

1. **Replace `telnyx.rtc.mediaError` listener** with `telnyx.error` listener switching on `event.error.code` (`42001`, `42002`, `42003`).
2. **Replace `telnyx.rtc.peerConnectionFailureError` listener** with `telnyx.warning` listener for `PEER_CONNECTION_FAILED` (`33004`).
3. **Replace `telnyx.rtc.peerConnectionSignalingStateClosed` listener** with `telnyx.notification` for `signalingStateClosed` type.
4. **Move error handling out of `telnyx.notification`** — use `telnyx.error` for fatal errors and `telnyx.warning` for non-fatal conditions. Keep `telnyx.notification` for call lifecycle only.
5. **Replace `ERROR_TYPE.invalidCredentialsOptions` checks** with `event.error.code === TELNYX_ERROR_CODES.INVALID_CREDENTIALS` (`46002`).
6. **Import new symbols:** `TelnyxError`, `TELNYX_ERROR_CODES`, `TELNYX_WARNING_CODES`, `isMediaRecoveryErrorEvent`.
7. **If you need media permission recovery for inbound calls**, enable `mediaPermissionsRecovery` and handle `isMediaRecoveryErrorEvent(event)`.
8. **Treat `telnyx.ready` as the only readiness signal.** The `vertoClientReady` notification type is no longer emitted on `telnyx.notification`.

The legacy RTC events (`telnyx.rtc.mediaError`, `telnyx.rtc.peerConnectionFailureError`, `telnyx.rtc.peerConnectionSignalingStateClosed`) are still emitted for backward compatibility but should not be used for new integrations.

## Legacy RTC Events and Migration

The SDK still exposes low-level RTC events, but new integrations should prefer `telnyx.error`, `telnyx.warning`, and `telnyx.notification`.

### Legacy or low-level RTC events

| Event                                           | Status                 | Preferred surface                                                                        |
| ----------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| `telnyx.rtc.mediaError`                         | Legacy/compatibility   | `telnyx.error` with `42001`, `42002`, or `42003`                                         |
| `telnyx.rtc.peerConnectionFailureError`         | Legacy/compatibility   | `telnyx.warning` with `33004`                                                            |
| `telnyx.rtc.peerConnectionSignalingStateClosed` | Low-level active event | `notification.type === 'signalingStateClosed'` if you want the higher-level notification |

### Migration checklist

1. Add a `telnyx.error` listener and switch on `event.error.code`.
2. Add a `telnyx.warning` listener and switch on `warning.code`.
3. Keep `telnyx.notification` for `callUpdate` and any compatibility notifications you still depend on.
4. Treat `telnyx.ready` as the only readiness signal.
5. Prefer `TELNYX_ERROR_CODES` and `TELNYX_WARNING_CODES` over hard-coded numeric literals.
6. If you support inbound permission recovery, enable `mediaPermissionsRecovery` and handle `isMediaRecoveryErrorEvent(event)`.
