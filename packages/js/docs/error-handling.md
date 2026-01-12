# WebRTC JS SDK Error Handling

This document provides a comprehensive overview of error handling in the Telnyx WebRTC JS SDK, including when the `telnyx.notification` event is triggered, the types of errors that can occur, and how the SDK handles reconnection attempts.

## Table of Contents

- [WebRTC JS SDK Error Handling](#webrtc-js-sdk-error-handling)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Error Constants Reference](#error-constants-reference)
  - [SwEvent Error Reference](#swevent-error-reference)
    - [Summary Table](#summary-table)
    - [Handling Details](#handling-details)
      - [`telnyx.rtc.mediaError`](#telnyxrtcmediaerror)
      - [`telnyx.rtc.peerConnectionFailureError`](#telnyxrtcpeerconnectionfailureerror)
      - [`telnyx.rtc.peerConnectionSignalingStateClosed`](#telnyxrtcpeerconnectionsignalingstateclosed)
  - [Call Termination Reasons](#call-termination-reasons)
    - [Call Termination Fields](#call-termination-fields)
    - [Common Cause Values](#common-cause-values)
    - [Example Usage](#example-usage)
  - [The telnyx.notification Event Handler](#the-telnyxnotification-event-handler)
    - [Event Structure](#event-structure)
    - [When is telnyx.notification Triggered?](#when-is-telnyxnotification-triggered)
    - [Example Implementation](#example-implementation)
  - [Error Types](#error-types)
    - [User Media Errors](#user-media-errors)
    - [Call State Errors](#call-state-errors)
    - [Connection Errors](#connection-errors)
  - [Socket Connection Close and Socket Connection Error Handling](#socket-connection-close-and-socket-connection-error-handling)
    - [Event delivery to TelnyxRTC consumers](#event-delivery-to-telnyxrtc-consumers)
    - [`telnyx.socket.close` payload](#telnyxsocketclose-payload)
    - [`telnyx.socket.error` payload](#telnyxsocketerror-payload)
    - [Monitoring WebSocket ready states](#monitoring-websocket-ready-states)
    - [CloseEvent Reference](#closeevent-reference)
    - [Recommended Handling Strategies](#recommended-handling-strategies)
    - [Code Examples for Common Scenarios](#code-examples-for-common-scenarios)
  - [Reconnection Process](#reconnection-process)
    - [Automatic Reconnection](#automatic-reconnection)
    - [`keepConnectionAliveOnSocketClose` Behavior](#keepconnectionaliveonsocketclose-behavior)
      - [Detecting Unrecoverable Calls](#detecting-unrecoverable-calls)
    - [Manual Reconnection](#manual-reconnection)
  - [Best Practices](#best-practices)
    - [1. Always Implement the telnyx.notification Event Handler](#1-always-implement-the-telnyxnotification-event-handler)
    - [2. Handle User Media Permissions Gracefully](#2-handle-user-media-permissions-gracefully)
    - [3. Implement Proper Error UI Feedback](#3-implement-proper-error-ui-feedback)
    - [4. Handle Call Failures Appropriately](#4-handle-call-failures-appropriately)
    - [5. Monitor Connection State](#5-monitor-connection-state)
    - [6. Log Errors for Debugging](#6-log-errors-for-debugging)
    - [7. Implement Graceful Degradation](#7-implement-graceful-degradation)

## Introduction

The Telnyx WebRTC JS SDK provides robust error handling mechanisms to help developers manage various error scenarios that may occur during the lifecycle of a WebRTC connection. Understanding these error handling mechanisms is crucial for building reliable applications that can gracefully recover from failures.

## Error Constants Reference

The following table lists all error constants and codes used in the Telnyx WebRTC JS SDK:

| **ERROR MESSAGE**             | **ERROR CODE** | **DESCRIPTION**                                          |
| ----------------------------- | -------------- | -------------------------------------------------------- |
| Token registration error      | -32000         | Error during token registration                          |
| Credential registration error | -32001         | Error during credential registration                     |
| Codec error                   | -32002         | Error related to codec operation                         |
| Gateway registration timeout  | -32003         | Gateway registration timed out                           |
| Gateway registration failed   | -32004         | Gateway registration failed                              |
| Call not found                | N/A            | The specified call cannot be found                       |
| User media error              | N/A            | Browser does not have permission to access media devices |
| Connection timeout            | -329990        | Fake verto timeout error code                            |

## SwEvent Error Reference

The SDK exposes every recoverable failure through specific `SwEvent` constants. Listening to each event provides clear separation between transport issues, session-level failures, and media-layer errors.

### Summary Table

| **EVENT**                                       | **TRIGGER**                                                                                        | **PAYLOAD**                                                                                             | **RECOMMENDED HANDLING**                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `telnyx.error`                                  | Session-level failure (registration retry exhausted, server rejects RPC, BYE fails, etc.)          | `{ error: Error \| ErrorResponse, sessionId: string }`                                                  | Surface actionable message, decide whether to retry or prompt the user to re-authenticate         |
| `telnyx.rtc.mediaError`                         | Browser media APIs fail (device enumeration, permission denials, track issues)                     | Browser `DOMException`/`Error` instance                                                                 | Ask user to grant permissions, suggest device troubleshooting, downgrade to audio-only            |
| `telnyx.rtc.peerConnectionFailureError`         | ICE restart cannot recover the peer connection (e.g., repeated `failed` state)                     | `{ error: Error, sessionId: string }` dispatched with `callId` as the listener scope                    | Tear down the affected call, notify the user, optionally auto-redial once connectivity stabilizes |
| `telnyx.rtc.peerConnectionSignalingStateClosed` | Peer connection signaling state transitions to 'closed' while the connection was previously active | `{ previousConnectionState: string, sessionId: string }` dispatched with `callId` as the listener scope | The call is not recoverable                                                                       |

### Handling Details

#### `telnyx.rtc.mediaError`

Triggered whenever media-device related promises reject (enumerating devices, opening a microphone/camera, setting tracks). Inspect the DOMException `name` to differentiate between `NotAllowedError` (prompt the user to grant permissions), `NotFoundError` (show “no devices” guidance), and transient issues (allow retries). Pair this with feature detection and fallbacks described in [Handle User Media Permissions Gracefully](#2-handle-user-media-permissions-gracefully).

#### `telnyx.rtc.peerConnectionFailureError`

Raised by the peer connection monitor when an ICE restart still results in a `failed` state. The event (`SwEvent.PeerConnectionFailureError`) is scoped to the call id, so listen on the call instance as well as the session if you need global tracking. Recommended handling: immediately hang up the affected call if silent audio is detected. If `autoReconnect` is enabled (the default), WebRTC JS SDK will reconnect right away.

#### `telnyx.rtc.peerConnectionSignalingStateClosed`

Raised when the peer connection's signaling state transitions to `closed`. This event (`SwEvent.PeerConnectionSignalingStateClosed`) is scoped to the call id. When this event fires, the peer connection is not recoverable. The call's `signalingStateClosed` property will be set to `true`, which can be used to check if a call is recoverable. When using `keepConnectionAliveOnSocketClose`, calls with closed signaling state will be hung up on ATTACH because recovery is not possible.

## Call Termination Reasons

The SDK provides detailed information about why a call has ended through the call's `cause` and `causeCode` properties. These properties are available when a call reaches the `hangup` state.

### Call Termination Fields

| **FIELD**   | **TYPE** | **DESCRIPTION**                                                |
| ----------- | -------- | -------------------------------------------------------------- |
| `cause`     | `string` | General cause description (e.g., "CALL_REJECTED", "USER_BUSY") |
| `causeCode` | `number` | Numerical code for the cause (e.g., 21 for CALL_REJECTED)      |
| `sipCode`   | `number` | SIP response code (e.g., 403, 404)                             |
| `sipReason` | `string` | SIP reason phrase (e.g., "Forbidden", "Not Found")             |

### Common Cause Values

| **CAUSE**            | **DESCRIPTION**                                |
| -------------------- | ---------------------------------------------- |
| `NORMAL_CLEARING`    | Normal call termination                        |
| `USER_BUSY`          | The remote user is busy                        |
| `CALL_REJECTED`      | The call was rejected by the remote party      |
| `UNALLOCATED_NUMBER` | The dialed number is invalid or does not exist |
| `NO_ANSWER`          | The call was not answered                      |
| `PURGE`              | Call was purged from the system                |

### Example Usage

```javascript
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'callUpdate') {
    const call = notification.call;

    if (call.state === 'hangup') {
      // Check termination reason
      if (call.cause && call.causeCode) {
        console.log(`Call ended: ${call.cause} (Code: ${call.causeCode})`);

        // Handle specific termination reasons
        switch (call.cause) {
          case 'CALL_REJECTED':
            showMessage('Call was rejected by the remote party');
            break;
          case 'USER_BUSY':
            showMessage('The remote user is busy');
            break;
          case 'UNALLOCATED_NUMBER':
            showMessage('Invalid phone number');
            break;
          case 'NO_ANSWER':
            showMessage('Call was not answered');
            break;
          default:
            showMessage(`Call ended: ${call.cause}`);
        }
      }

      // Check SIP error codes
      if (call.sipCode && call.sipReason) {
        console.log(`SIP Error: ${call.sipCode} - ${call.sipReason}`);

        switch (call.sipCode) {
          case 403:
            showMessage('Call forbidden - check your permissions');
            break;
          case 404:
            showMessage('Number not found');
            break;
          case 486:
            showMessage('User is busy');
            break;
          default:
            showMessage(`Call failed: ${call.sipReason} (${call.sipCode})`);
        }
      }
    }
  }
});
```

## The telnyx.notification Event Handler

The `telnyx.notification` event is the primary mechanism for receiving error notifications and call state updates in the JS SDK. This event provides a way for your application to be notified of errors and take appropriate action.

### Event Structure

```javascript
client.on('telnyx.notification', (notification) => {
  // notification.type identifies the event case
  // notification.call contains call information (for callUpdate events)
  // notification.error contains error information (for userMediaError events)
});
```

### When is telnyx.notification Triggered?

The `telnyx.notification` event is triggered in the following scenarios:

1. **Call State Updates**: When a call changes state (ringing, active, hangup, etc.)
   - Event Type: `callUpdate`
   - Contains: `call` object with current state and termination details

2. **User Media Errors**: When the browser cannot access media devices
   - Event Type: `userMediaError`
   - Contains: `error` object with details about the media access failure

3. **Connection State Changes**: When the client connection state changes
   - Event Type: `vertoClientReady`
   - Indicates the client is ready to make/receive calls

### Example Implementation

```javascript
client.on('telnyx.notification', (notification) => {
  switch (notification.type) {
    case 'callUpdate':
      handleCallUpdate(notification.call);
      break;
    case 'userMediaError':
      handleUserMediaError(notification.error);
      break;
    case 'vertoClientReady':
      handleClientReady();
      break;
    default:
      console.log('Unknown notification type:', notification.type);
  }
});

function handleCallUpdate(call) {
  console.log(`Call ${call.id} state: ${call.state}`);

  switch (call.state) {
    case 'ringing':
      showIncomingCallUI(call);
      break;
    case 'active':
      showActiveCallUI(call);
      break;
    case 'hangup':
      handleCallTermination(call);
      break;
    case 'destroy':
      cleanupCall(call);
      break;
  }
}

function handleUserMediaError(error) {
  console.error('User media error:', error);
  showErrorMessage(
    'Cannot access microphone or camera. Please check your browser permissions.'
  );
}

function handleClientReady() {
  console.log('Client is ready to make calls');
  updateUIConnectionStatus('connected');
}
```

## Error Types

The SDK encounters different types of errors that require different handling approaches.

### User Media Errors

User media errors occur when the browser cannot access the user's microphone or camera.

**Common Causes:**

- User denied permission to access media devices
- Media devices are not available or in use by another application
- Browser security restrictions (HTTPS required for media access)
- Invalid audio/video constraints

**Example Handling:**

```javascript
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    const error = notification.error;

    // Check specific error types
    if (error.name === 'NotAllowedError') {
      showMessage('Please allow access to your microphone and camera');
    } else if (error.name === 'NotFoundError') {
      showMessage('No microphone or camera found');
    } else if (error.name === 'NotReadableError') {
      showMessage(
        'Your microphone or camera is being used by another application'
      );
    } else {
      showMessage('Cannot access media devices: ' + error.message);
    }
  }
});
```

### Call State Errors

Call state errors are indicated through the call's state transitions and termination reasons.

**Call States:**

- `new`: New call has been created
- `trying`: Attempting to establish the call
- `requesting`: The outbound call is being sent to the server
- `ringing`: Incoming call or outbound call is ringing
- `answering`: Attempting to answer an incoming call
- `early`: Receiving media before the call is answered
- `active`: Call is connected and active
- `held`: Call is on hold
- `hangup`: Call has ended
- `destroy`: Call object is being destroyed
- `purge`: Call has been purged from the system

**Example Handling:**

```javascript
function handleCallStateError(call) {
  if (call.state === 'hangup' && call.cause !== 'NORMAL_CLEARING') {
    // Handle abnormal call termination
    switch (call.cause) {
      case 'CALL_REJECTED':
        showNotification('Call was declined', 'warning');
        break;
      case 'USER_BUSY':
        showNotification('User is busy, try again later', 'info');
        break;
      case 'UNALLOCATED_NUMBER':
        showNotification('Invalid phone number', 'error');
        break;
      case 'NO_ANSWER':
        showNotification('No answer', 'info');
        break;
      default:
        showNotification(`Call failed: ${call.cause}`, 'error');
    }
  }
}
```

### Connection Errors

Connection errors occur when there are issues with the WebSocket connection to the Telnyx servers.

**Common Connection Issues:**

- Network connectivity problems
- Authentication failures
- Server-side issues
- Firewall or proxy blocking WebSocket connections

**Example Handling:**

```javascript
client.on('telnyx.socket.close', () => {
  console.log('WebSocket connection closed');
  showConnectionStatus('disconnected');
  // Attempt to reconnect
  setTimeout(() => {
    try {
      client.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }, 5000);
});

client.on('telnyx.socket.error', ({ error, sessionId }) => {
  console.error(`WebSocket error on session ${sessionId}:`, error);
  showErrorMessage('Connection error. Please check your internet connection.');
});

client.on('telnyx.ready', () => {
  console.log('Client connected and ready');
  showConnectionStatus('connected');
});
```

## Socket Connection Close and Socket Connection Error Handling

The Telnyx WebRTC JS SDK forwards those events directly to your application without modification. The WebSocket is used strictly for signaling—media keeps flowing over the underlying WebRTC peer connection—so transient socket interruptions do not require you to drop active calls. The SDK automatically re-establishes signaling when the socket returns, restoring subscriptions and resuming message delivery.

### Event delivery to TelnyxRTC consumers

```javascript
client.on('telnyx.socket.close', onSocketClose);
client.on('telnyx.socket.error', onSocketError);
```

- `telnyx.socket.close` is fired when the underlying WebSocket transitions into the `CLOSING`/`CLOSED` states and the browser emits a [`CloseEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent). The SDK does not mutate the event.
- `telnyx.socket.error` is fired on from the WebSocket implementation (for example, TLS handshake issues, DNS failures, or rejected frames). The SDK wraps the error along with the Telnyx session identifier.

Both events invoke the internal network-close handler. If `autoReconnect` is enabled (the default), the SDK clears subscriptions and schedules a reconnect using the configured delay.

### `telnyx.socket.close` payload

Your handler receives the raw `CloseEvent`. Key fields you can rely on:

- `event.code` - numeric close code set by Cowboy. Common codes include:
  - `1000`: Normal closure (intentional disconnect or logout).
  - `1001`: Endpoint is going away (browser has navigated away or lost network).
  - `1002`: Protocol error (unexpected or malformed frame).
  - `1003`: Unsupported data (frame contained an unsupported type).
  - `1005`: No status code present. Browsers surface it when the peer omits a status code entirely or the connection drops unexpectedly.
  - `1006`: Abnormal closure observed by the browser when the TCP socket drops without a close frame.
  - `1011`: Internal error raised by the voice proxy.
- `event.reason` - string provided by Cowboy when additional context is available.
- `event.wasClean` - `true` when the browser confirms the close handshake completed cleanly.

```javascript
const onSocketClose = (event) => {
  if (!event.wasClean) {
    console.warn('Socket closed unexpectedly', {
      code: event.code,
      reason: event.reason,
    });
  }

  showConnectionStatus('disconnected');
};
```

You can map application-specific behaviour by inspecting the close codes as defined in RFC 6455. The server will continue to use registered status codes.

### `telnyx.socket.error` payload

The SDK provides an object with the signature `{ error, sessionId }`:

- `error` - the original `ErrorEvent` (or the WebSocket polyfill equivalent) supplied by the browser. WebSocket APIs intentionally keep this opaque; you typically only get `error.type` and `error.message`.
- `sessionId` - the Telnyx session identifier associated with the current socket.

```javascript
const onSocketError = ({ error, sessionId }) => {
  notifyMonitoringTool({
    sessionId,
    message: error?.message ?? 'Unknown WebSocket error',
    type: error?.type,
  });
};
```

### Monitoring WebSocket ready states

The browser exposes the WebSocket `readyState` as an integer (`0-3`). The SDK mirrors these values through convenience getters on `client.connection` so you can check the state without touching the underlying socket:

| `readyState` label | Numeric value | SDK getter                     | Description                                                    |
| ------------------ | ------------- | ------------------------------ | -------------------------------------------------------------- |
| `CONNECTING`       | `0`           | `client.connection.connecting` | Handshake in progress; no frames exchanged yet.                |
| `OPEN`             | `1`           | `client.connection.connected`  | Socket is open and ready for signaling.                        |
| `CLOSING`          | `2`           | `client.connection.closing`    | Close frame has been sent or received; waiting for completion. |
| `CLOSED`           | `3`           | `client.connection.closed`     | Socket is fully closed.                                        |

Additional helpers provide aggregate checks: `client.connection.isAlive` is `true` when the socket is `CONNECTING` or `OPEN`, while `client.connection.isDead` is `true` during `CLOSING` or `CLOSED`.

### CloseEvent Reference

The SDK exposes the browser-native [`CloseEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent) object so you can inspect the details that originated from the Cowboy proxy or from the browser itself.

- `code` (`number`) - Close status code described earlier in this section.
- `reason` (`string`) - Optional human-readable message supplied by the server. Cowboy sends concise reasons when available.
- `wasClean` (`boolean`) - Indicates whether both peers completed the close handshake.
- `type` (`string`) - Always `"close"` for this event, useful when sharing logging infrastructure with other event types.
- `target.url` (`string`) - The WebSocket URL that closed. This helps verify the environment/region the client was connected to.
- `timeStamp` (`number`) - Epoch timestamp (DOMHighResTimeStamp) of when the event fired, which is helpful when correlating with other telemetry.

Polyfills (such as the `ws` package used in Jest tests) expose the same surface area, though some optional fields (like `target.url`) may be undefined. Guard your logging to cope with those differences.

### Recommended Handling Strategies

- Treat `code === 1000` (normal closure) as a controlled shutdown (for example, when the user signs out). If the closure was not user initiated, allow the SDK's reconnection logic to create a fresh session instead of forcing a call hangup.
- For `1001`, `1005`, or `1006`, surface a transient connectivity message and trigger a retry if your workflow can recover gracefully.
- Log and alert on `1002`, `1003`, or any value greater than `1011`; these usually indicate protocol or payload defects that need developer attention.
- Use `telnyx.socket.error` events for observability: capture the `sessionId`, timestamp, and user context so failures can be correlated with server-side logs.
- Gate privileged actions (placing calls, sending DTMF, subscribing to streams) on `client.connection.connected` to prevent user operations from failing while the socket is reconnecting.
- Keep call objects alive while the SDK reconnects; WebRTC media continues despite a signaling outage, and the SDK will reattach once the socket is back.

### Code Examples for Common Scenarios

**Normal closure (user logout)**

```javascript
const onSocketClose = (event) => {
  if (event.code === 1000) {
    showConnectionStatus('signed-out');
    return;
  }

  handleAbnormalClose(event);
};
```

**Abnormal closure with retry**

```javascript
const handleAbnormalClose = (event) => {
  if (event.code === 1001 || event.code === 1005 || event.code === 1006) {
    showConnectionStatus('reconnecting');
    // attemptReconnection is defined in the Reconnection Process section.
    // Active calls remain alive; the SDK restores signaling once the socket returns.
    attemptReconnection();
    return;
  }
};
```

**Socket-level error logging**

```javascript
const onSocketError = ({ error, sessionId }) => {
  console.error('WebSocket error', {
    message: error?.message,
    type: error?.type,
    sessionId,
  });

  // Media continues over the peer connection; reconnect signaling.
  if (!client.connection.isAlive) {
    attemptReconnection();
  }
};
```

**Guarding user actions while reconnecting**

```javascript
const placeCall = (destinationNumber) => {
  if (!client.connection.connected) {
    showErrorMessage('Still connecting to Telnyx. Please try again shortly.');
    return;
  }

  client.newCall({ destinationNumber });
};
```

## Reconnection Process

The SDK includes automatic reconnection mechanisms to handle temporary network issues:

### Automatic Reconnection

1. **Connection Monitoring**: The SDK monitors the WebSocket connection status
2. **Automatic Retry**: When a connection is lost, the SDK attempts to reconnect automatically
3. **Exponential Backoff**: Retry intervals increase progressively to avoid overwhelming the server
4. **Call Recovery**: Active calls may be recovered if the connection is restored quickly. If `keepConnectionAliveOnSocketClose` client option is enabled, the SDK will attempt to maintain call state during brief disconnections. See [keepConnectionAliveOnSocketClose Behavior](#keepconnectionaliveonsocketclose-behavior) for details.

### `keepConnectionAliveOnSocketClose` Behavior

The `keepConnectionAliveOnSocketClose` option is an **optimistic** setting, not a deterministic guarantee. When enabled, the SDK attempts to preserve active calls during network interruptions by re-attaching to the existing peer connection instead of hanging up when an `attach` message is received.

#### Detecting Unrecoverable Calls

To monitor connection health and detect when calls become unrecoverable, subscribe to these events:

##### Primary Event: `telnyx.rtc.peerConnectionFailureError`

This event fires when the peer connection's `connectionState` transitions to `failed`. This is the **primary indicator** that the ICE/DTLS transport has failed.

```javascript
client.on('telnyx.rtc.peerConnectionFailureError', (data) => {
  console.log('Peer connection failed:', data.error.message);
  // The SDK will attempt ICE restart automatically
  // If ICE restart fails, the call will be recreated with a new ID
});
```

##### Secondary Event: `telnyx.rtc.peerConnectionSignalingStateClosed`

This event fires when the peer connection's `signalingState` transitions to `closed`. This typically occurs after device sleep/wake cycles.

```javascript
client.on('telnyx.rtc.peerConnectionSignalingStateClosed', (data) => {
  console.log('Signaling state closed for session:', data.sessionId);
  // The call will be hung up and recreated automatically
});
```

##### Checking the Property Directly

You can also check the `signalingStateClosed` property on the call object:

```javascript
if (call.signalingStateClosed) {
  console.log('This call cannot be recovered');
}
```

##### Event Comparison Table

| Event | Trigger | Recovery Behavior |
|-------|---------|-------------------|
| `telnyx.rtc.peerConnectionFailureError` | `connectionState` → `failed` | ICE restart attempted, then new INVITE with new call ID |
| `telnyx.rtc.peerConnectionSignalingStateClosed` | `signalingState` → `closed` | Call hung up and recreated with same call ID |

### Manual Reconnection

You can also implement manual reconnection logic:

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const baseReconnectDelay = 1000; // 1 second

function attemptReconnection() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    showErrorMessage('Unable to reconnect. Please refresh the page.');
    return;
  }

  const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
  reconnectAttempts++;

  console.log(
    `Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`
  );

  setTimeout(() => {
    try {
      client.connect();
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      attemptReconnection();
    }
  }, delay);
}

client.on('telnyx.socket.close', () => {
  if (client.connected) {
    // Unexpected disconnection
    attemptReconnection();
  }
});

client.on('telnyx.ready', () => {
  // Reset reconnection counter on successful connection
  reconnectAttempts = 0;
});
```

## Best Practices

To effectively handle errors in your application:

### 1. Always Implement the telnyx.notification Event Handler

```javascript
client.on('telnyx.notification', (notification) => {
  switch (notification.type) {
    case 'callUpdate':
      // Handle call state changes
      updateCallUI(notification.call);
      break;
    case 'userMediaError':
      // Handle media access errors
      handleMediaError(notification.error);
      break;
    case 'vertoClientReady':
      // Handle client ready state
      onClientReady();
      break;
    default:
      console.log('Unhandled notification:', notification);
  }
});
```

### 2. Handle User Media Permissions Gracefully

```javascript
// Request permissions before making calls
async function requestMediaPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    // Stop the stream immediately, we just needed to request permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error('Media permission denied:', error);
    showPermissionDialog();
    return false;
  }
}

// Use before making calls
async function makeCall(destinationNumber) {
  const hasPermission = await requestMediaPermissions();
  if (!hasPermission) {
    return;
  }

  const call = client.newCall({
    destinationNumber: destinationNumber,
    callerNumber: '1234567890',
  });
}
```

### 3. Implement Proper Error UI Feedback

```javascript
function showErrorMessage(message, type = 'error') {
  const errorDiv = document.createElement('div');
  errorDiv.className = `error-message ${type}`;
  errorDiv.textContent = message;

  // Add to UI
  document.getElementById('error-container').appendChild(errorDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function updateConnectionStatus(status) {
  const statusElement = document.getElementById('connection-status');
  statusElement.className = `status ${status}`;
  statusElement.textContent =
    status === 'connected' ? 'Connected' : 'Disconnected';
}
```

### 4. Handle Call Failures Appropriately

```javascript
function handleCallFailure(call) {
  // Log for debugging
  console.error('Call failed:', {
    id: call.id,
    cause: call.cause,
    causeCode: call.causeCode,
    sipCode: call.sipCode,
    sipReason: call.sipReason,
  });

  // Provide user-friendly messages
  let userMessage = 'Call failed';

  if (call.sipCode) {
    switch (call.sipCode) {
      case 403:
        userMessage =
          'Call not allowed. Please check your account permissions.';
        break;
      case 404:
        userMessage = 'Number not found. Please check the phone number.';
        break;
      case 486:
        userMessage = 'The person you are calling is busy.';
        break;
      case 503:
        userMessage =
          'Service temporarily unavailable. Please try again later.';
        break;
      default:
        userMessage = `Call failed: ${call.sipReason || 'Unknown error'}`;
    }
  } else if (call.cause) {
    switch (call.cause) {
      case 'USER_BUSY':
        userMessage = 'The person you are calling is busy.';
        break;
      case 'CALL_REJECTED':
        userMessage = 'Call was declined.';
        break;
      case 'NO_ANSWER':
        userMessage = 'No answer. Please try again later.';
        break;
      case 'UNALLOCATED_NUMBER':
        userMessage = 'Invalid phone number.';
        break;
    }
  }

  showErrorMessage(userMessage);
}
```

### 5. Monitor Connection State

```javascript
let connectionState = 'disconnected';

client.on('telnyx.socket.open', () => {
  connectionState = 'connecting';
  updateConnectionStatus('connecting');
});

client.on('telnyx.ready', () => {
  connectionState = 'connected';
  updateConnectionStatus('connected');
});

client.on('telnyx.socket.close', () => {
  connectionState = 'disconnected';
  updateConnectionStatus('disconnected');
});

// Check connection before making calls
function makeCall(destinationNumber) {
  if (connectionState !== 'connected') {
    showErrorMessage(
      'Not connected. Please wait for connection to be established.'
    );
    return;
  }

  // Proceed with call
  const call = client.newCall({
    destinationNumber: destinationNumber,
  });
}
```

### 6. Log Errors for Debugging

```javascript
function logError(context, error, additionalData = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context: context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    additionalData: additionalData,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error('TelnyxRTC Error:', errorLog);

  // Send to your error tracking service
  // sendErrorToTrackingService(errorLog);
}

// Usage
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    logError('UserMediaError', notification.error, {
      notificationType: notification.type,
    });
  }
});
```

### 7. Implement Graceful Degradation

```javascript
// Fallback for browsers without WebRTC support
if (!window.RTCPeerConnection) {
  showErrorMessage(
    'Your browser does not support WebRTC. Please use a modern browser.'
  );
  // Redirect to alternative communication method
  return;
}

// Fallback for HTTPS requirement
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  showErrorMessage('WebRTC requires HTTPS. Please use a secure connection.');
  return;
}

// Feature detection
async function checkWebRTCSupport() {
  const checks = {
    webrtc: !!window.RTCPeerConnection,
    getUserMedia: !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    ),
    websockets: !!window.WebSocket,
  };

  const unsupported = Object.keys(checks).filter((key) => !checks[key]);

  if (unsupported.length > 0) {
    showErrorMessage(
      `Your browser does not support: ${unsupported.join(', ')}`
    );
    return false;
  }

  return true;
}
```

By following these best practices and understanding the error handling mechanisms, you can build robust applications that provide a smooth user experience even when errors occur.
