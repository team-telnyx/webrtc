# WebRTC JS SDK Error Handling

This document provides a comprehensive overview of error handling in the Telnyx WebRTC JS SDK, including when the `telnyx.notification` event is triggered, the types of errors that can occur, and how the SDK handles reconnection attempts.

## Table of Contents

1. [Introduction](#introduction)
2. [Error Constants Reference](#error-constants-reference)
3. [Call Termination Reasons](#call-termination-reasons)
4. [The telnyx.notification Event Handler](#the-telnyxnotification-event-handler)
5. [Error Types](#error-types)
   - [User Media Errors](#user-media-errors)
   - [Call State Errors](#call-state-errors)
   - [Connection Errors](#connection-errors)
6. [Reconnection Process](#reconnection-process)
7. [Best Practices](#best-practices)

## Introduction

The Telnyx WebRTC JS SDK provides robust error handling mechanisms to help developers manage various error scenarios that may occur during the lifecycle of a WebRTC connection. Understanding these error handling mechanisms is crucial for building reliable applications that can gracefully recover from failures.

## Error Constants Reference

The following table lists all error constants and codes used in the Telnyx WebRTC JS SDK:

| **ERROR MESSAGE** | **ERROR CODE** | **DESCRIPTION** |
|---|---|---|
| Token registration error | -32000 | Error during token registration |
| Credential registration error | -32001 | Error during credential registration |
| Codec error | -32002 | Error related to codec operation |
| Gateway registration timeout | -32003 | Gateway registration timed out |
| Gateway registration failed | -32004 | Gateway registration failed |
| Call not found | N/A | The specified call cannot be found |
| User media error | N/A | Browser does not have permission to access media devices |
| Connection timeout | -329990 | Fake verto timeout error code |

## Call Termination Reasons

The SDK provides detailed information about why a call has ended through the call's `cause` and `causeCode` properties. These properties are available when a call reaches the `hangup` state.

### Call Termination Fields

| **FIELD** | **TYPE** | **DESCRIPTION** |
|---|---|---|
| `cause` | `string` | General cause description (e.g., "CALL_REJECTED", "USER_BUSY") |
| `causeCode` | `number` | Numerical code for the cause (e.g., 21 for CALL_REJECTED) |
| `sipCode` | `number` | SIP response code (e.g., 403, 404) |
| `sipReason` | `string` | SIP reason phrase (e.g., "Forbidden", "Not Found") |

### Common Cause Values

| **CAUSE** | **DESCRIPTION** |
|---|---|
| `NORMAL_CLEARING` | Normal call termination |
| `USER_BUSY` | The remote user is busy |
| `CALL_REJECTED` | The call was rejected by the remote party |
| `UNALLOCATED_NUMBER` | The dialed number is invalid or does not exist |
| `NO_ANSWER` | The call was not answered |
| `PURGE` | Call was purged from the system |

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
  showErrorMessage('Cannot access microphone or camera. Please check your browser permissions.');
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
      showMessage('Your microphone or camera is being used by another application');
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

client.on('telnyx.socket.error', (error) => {
  console.error('WebSocket error:', error);
  showErrorMessage('Connection error. Please check your internet connection.');
});

client.on('telnyx.ready', () => {
  console.log('Client connected and ready');
  showConnectionStatus('connected');
});
```

## Reconnection Process

The SDK includes automatic reconnection mechanisms to handle temporary network issues:

### Automatic Reconnection

1. **Connection Monitoring**: The SDK monitors the WebSocket connection status
2. **Automatic Retry**: When a connection is lost, the SDK attempts to reconnect automatically
3. **Exponential Backoff**: Retry intervals increase progressively to avoid overwhelming the server
4. **Call Recovery**: Active calls may be recovered if the connection is restored quickly

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
  
  console.log(`Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
  
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
      video: false 
    });
    // Stop the stream immediately, we just needed to request permission
    stream.getTracks().forEach(track => track.stop());
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
    callerNumber: '1234567890'
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
  statusElement.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
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
    sipReason: call.sipReason
  });
  
  // Provide user-friendly messages
  let userMessage = 'Call failed';
  
  if (call.sipCode) {
    switch (call.sipCode) {
      case 403:
        userMessage = 'Call not allowed. Please check your account permissions.';
        break;
      case 404:
        userMessage = 'Number not found. Please check the phone number.';
        break;
      case 486:
        userMessage = 'The person you are calling is busy.';
        break;
      case 503:
        userMessage = 'Service temporarily unavailable. Please try again later.';
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
    showErrorMessage('Not connected. Please wait for connection to be established.');
    return;
  }
  
  // Proceed with call
  const call = client.newCall({
    destinationNumber: destinationNumber
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
      stack: error.stack
    },
    additionalData: additionalData,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.error('TelnyxRTC Error:', errorLog);
  
  // Send to your error tracking service
  // sendErrorToTrackingService(errorLog);
}

// Usage
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    logError('UserMediaError', notification.error, {
      notificationType: notification.type
    });
  }
});
```

### 7. Implement Graceful Degradation

```javascript
// Fallback for browsers without WebRTC support
if (!window.RTCPeerConnection) {
  showErrorMessage('Your browser does not support WebRTC. Please use a modern browser.');
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
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    websockets: !!window.WebSocket
  };
  
  const unsupported = Object.keys(checks).filter(key => !checks[key]);
  
  if (unsupported.length > 0) {
    showErrorMessage(`Your browser does not support: ${unsupported.join(', ')}`);
    return false;
  }
  
  return true;
}
```

By following these best practices and understanding the error handling mechanisms, you can build robust applications that provide a smooth user experience even when errors occur.