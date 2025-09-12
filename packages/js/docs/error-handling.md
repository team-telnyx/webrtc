# WebRTC JS SDK Error Handling

This document provides a comprehensive overview of error handling in the Telnyx WebRTC JS SDK, including the enhanced error handling system, when the `telnyx.notification` event is triggered, the types of errors that can occur, and how the SDK handles reconnection attempts.

## Table of Contents

1. [Introduction](#introduction)
2. [Enhanced Error Handling System](#enhanced-error-handling-system)
3. [Error Constants Reference](#error-constants-reference)
4. [Call Termination Reasons](#call-termination-reasons)
5. [The telnyx.notification Event Handler](#the-telnyxnotification-event-handler)
6. [Error Types](#error-types)
   - [User Media Errors](#user-media-errors)
   - [Call State Errors](#call-state-errors)
   - [Connection Errors](#connection-errors)
7. [Intelligent Reconnection Process](#intelligent-reconnection-process)
8. [Error Monitoring and Analytics](#error-monitoring-and-analytics)
9. [Best Practices](#best-practices)
10. [Migration Guide](#migration-guide)

## Introduction

The Telnyx WebRTC JS SDK provides a robust and intelligent error handling system to help developers manage various error scenarios that may occur during the lifecycle of a WebRTC connection. The enhanced error handling system introduced in this version provides better user experience, detailed error context, and intelligent recovery mechanisms.

## Enhanced Error Handling System

The SDK now includes several key components for improved error handling:

### TelnyxError Class

A specialized error class that provides enhanced context and user-friendly messages:

```javascript
import { TelnyxError } from '@telnyx/webrtc';

// Enhanced errors include:
// - User-friendly messages
// - Suggested actions
// - Retry capability information
// - Rich metadata
// - Stack trace preservation
```

### ErrorHandler

Centralized error processing with monitoring and analytics:

```javascript
import { ErrorHandler } from '@telnyx/webrtc';

// Initialize with session context
ErrorHandler.initialize(sessionId, userId, reportingCallback);

// Handle errors with enhanced context
const error = ErrorHandler.handleMediaError(originalError, 'getDevices');
```

### ConnectionManager

Intelligent connection management with smart reconnection:

```javascript
// Automatic features:
// - Exponential backoff
// - Network state awareness
// - Connection quality monitoring
// - Graceful degradation
```

### ErrorMonitoring

Error pattern detection and analytics:

```javascript
import { ErrorMonitoring } from '@telnyx/webrtc';

// Get error statistics
const stats = ErrorMonitoring.getErrorStats();
console.log('Error patterns:', stats);
```

## Enhanced Error Handling System

The SDK now includes several key components for improved error handling:

### TelnyxError Class

A specialized error class that provides enhanced context and user-friendly messages:

```javascript
import { TelnyxError } from '@telnyx/webrtc';

// Enhanced errors include:
// - User-friendly messages
// - Suggested actions
// - Retry capability information
// - Rich metadata
// - Stack trace preservation
```

### ErrorHandler

Centralized error processing with monitoring and analytics:

```javascript
import { ErrorHandler } from '@telnyx/webrtc';

// Initialize with session context
ErrorHandler.initialize(sessionId, userId, reportingCallback);

// Handle errors with enhanced context
const error = ErrorHandler.handleMediaError(originalError, 'getDevices');
```

### ConnectionManager

Intelligent connection management with smart reconnection:

```javascript
// Automatic features:
// - Exponential backoff
// - Network state awareness
// - Connection quality monitoring
// - Graceful degradation
```

### ErrorMonitoring

Error pattern detection and analytics:

```javascript
import { ErrorMonitoring } from '@telnyx/webrtc';

// Get error statistics
const stats = ErrorMonitoring.getErrorStats();
console.log('Error patterns:', stats);
```

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

### Enhanced Event Structure

```javascript
client.on('telnyx.notification', (notification) => {
  // Enhanced notification structure with better error information
  switch (notification.type) {
    case 'callUpdate':
      // Enhanced call information with error details
      handleCallUpdate(notification.call, notification.error);
      break;
    case 'userMediaError':
      // Enhanced media error with user guidance
      handleUserMediaError(notification.error);
      break;
    case 'connectionStateChange':
      // New: Connection state monitoring
      handleConnectionState(notification.state, notification.reconnectionInfo);
      break;
    case 'vertoClientReady':
      handleClientReady();
      break;
    default:
      console.log('Unknown notification type:', notification.type);
  }
});
```

### Enhanced Notification Types

#### `userMediaError` (Enhanced)

```js
{
  type: 'userMediaError',
  error: {
    name: 'TelnyxError',
    code: 'MEDIA_ERROR',
    message: 'Media error: NotAllowedError',
    userMessage: 'Media access denied',
    suggestedAction: 'Please allow access to your microphone and camera in browser settings',
    canRetry: true,
    context: 'BrowserSession.getDevices',
    metadata: { ... },
    timestamp: '2025-09-12T...'
  }
}
```

#### `callUpdate` (Enhanced)

```js
{
  type: 'callUpdate',
  call: Call, // current call object
  error: {
    // Enhanced error information when call fails
    userMessage: 'The person you are calling is busy',
    suggestedAction: 'Try again later',
    canRetry: true,
    nextSteps: ['Wait a few minutes before retrying'],
    additionalGuidance: ['The recipient may be on another call']
  }
}
```

#### `connectionStateChange` (New)

```js
{
  type: 'connectionStateChange',
  state: 'connected' | 'disconnected' | 'connecting' | 'failed',
  error?: TelnyxError,
  reconnectionInfo: {
    attempts: 2,
    maxAttempts: 5,
    nextRetryIn: 4000,
    lastConnectedAt: '2025-09-12T...'
  }
}
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

### Enhanced Example Implementation

```javascript
client.on('telnyx.notification', (notification) => {
  switch (notification.type) {
    case 'callUpdate':
      handleCallUpdate(notification.call, notification.error);
      break;
    case 'userMediaError':
      handleUserMediaError(notification.error);
      break;
    case 'connectionStateChange':
      handleConnectionState(notification.state, notification.reconnectionInfo);
      break;
    case 'vertoClientReady':
      handleClientReady();
      break;
    default:
      console.log('Unknown notification type:', notification.type);
  }
});

function handleCallUpdate(call, errorInfo) {
  console.log(`Call ${call.id} state: ${call.state}`);
  
  switch (call.state) {
    case 'ringing':
      showIncomingCallUI(call);
      break;
    case 'active':
      showActiveCallUI(call);
      break;
    case 'hangup':
      handleCallTermination(call, errorInfo);
      break;
    case 'destroy':
      cleanupCall(call);
      break;
  }
}

function handleCallTermination(call, errorInfo) {
  if (errorInfo) {
    // Enhanced error handling with user guidance
    showUserFriendlyError(errorInfo.userMessage);
    
    if (errorInfo.canRetry) {
      showRetryOption(call, errorInfo.suggestedAction);
    }
    
    if (errorInfo.nextSteps && errorInfo.nextSteps.length > 0) {
      showNextSteps(errorInfo.nextSteps);
    }
  }
}

function handleUserMediaError(error) {
  console.error('User media error:', error);
  
  // Enhanced error with user guidance
  showErrorMessage(error.userMessage || 'Cannot access media devices');
  
  if (error.suggestedAction) {
    showSuggestedAction(error.suggestedAction);
  }
  
  if (error.canRetry) {
    showRetryButton(() => {
      // Implement retry logic
      client.getDevices().catch(handleUserMediaError);
    });
  }
}

function handleConnectionState(state, reconnectionInfo) {
  console.log('Connection state:', state);
  updateConnectionStatusUI(state);
  
  if (state === 'connecting' && reconnectionInfo) {
    showReconnectionProgress(reconnectionInfo);
  }
}

function handleClientReady() {
  console.log('Client is ready to make calls');
  updateUIConnectionStatus('connected');
}
```

## Error Types

The SDK encounters different types of errors that require different handling approaches.

### Enhanced User Media Error Handling

User media errors now provide enhanced context and user guidance.

**Enhanced Error Information:**

```javascript
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    const error = notification.error;
    
    console.log('Error details:', {
      code: error.code,
      userMessage: error.userMessage,
      suggestedAction: error.suggestedAction,
      canRetry: error.canRetry,
      context: error.context
    });
    
    // Display user-friendly error message
    showErrorMessage(error.userMessage);
    
    // Show suggested action
    if (error.suggestedAction) {
      showSuggestedAction(error.suggestedAction);
    }
    
    // Provide retry option if applicable
    if (error.canRetry) {
      showRetryButton(() => retryMediaAccess());
    }
  }
});

function retryMediaAccess() {
  client.getDevices()
    .then(devices => {
      console.log('Media devices available:', devices);
      hideErrorMessage();
    })
    .catch(error => {
      // Error will be automatically handled by enhanced system
      console.log('Retry failed, user will see enhanced error message');
    });
}
```

**Error Type Detection:**

The enhanced system automatically detects specific media error types:

- **NotAllowedError**: User denied permission
- **NotFoundError**: No media devices found
- **NotReadableError**: Device in use by another application
- **OverconstrainedError**: Requested constraints not supported

**Example Enhanced Implementation:**

```javascript
async function requestMediaPermissions() {
  try {
    const devices = await client.getDevices();
    return devices;
  } catch (error) {
    // Enhanced TelnyxError with user guidance
    if (error.code === 'MEDIA_ERROR') {
      // Show user-friendly error UI
      showMediaErrorDialog({
        title: 'Media Access Required',
        message: error.userMessage,
        action: error.suggestedAction,
        canRetry: error.canRetry
      });
      
      if (error.canRetry) {
        // Offer retry with guidance
        setTimeout(() => {
          showRetryPrompt(error.suggestedAction);
        }, 2000);
      }
    }
    throw error;
  }
}
```

### Enhanced Call State Error Handling

Call state errors now include comprehensive user guidance and retry information.

**Enhanced Call Failure Information:**

```javascript
function handleCallFailure(call, errorInfo) {
  if (errorInfo) {
    console.log('Enhanced call failure info:', {
      userMessage: errorInfo.userMessage,
      suggestedAction: errorInfo.suggestedAction,
      canRetry: errorInfo.canRetry,
      nextSteps: errorInfo.nextSteps,
      additionalGuidance: errorInfo.additionalGuidance
    });
    
    // Show user-friendly error message
    showCallFailureDialog({
      title: 'Call Failed',
      message: errorInfo.userMessage,
      action: errorInfo.suggestedAction,
      canRetry: errorInfo.canRetry,
      nextSteps: errorInfo.nextSteps
    });
    
    if (errorInfo.canRetry) {
      showRetryCallButton(call);
    }
  }
}
```

**Call States and Enhanced Error Handling:**

- `new`: New call has been created
- `trying`: Attempting to establish the call
- `requesting`: The outbound call is being sent to the server
- `ringing`: Incoming call or outbound call is ringing
- `answering`: Attempting to answer an incoming call
- `early`: Receiving media before the call is answered
- `active`: Call is connected and active
- `held`: Call is on hold
- `hangup`: Call has ended (now includes enhanced error info)
- `destroy`: Call object is being destroyed
- `purge`: Call has been purged from the system

**Enhanced Call Termination Handling:**

```javascript
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'callUpdate') {
    const call = notification.call;
    const errorInfo = notification.error;
    
    if (call.state === 'hangup') {
      console.log(`Call ended: ${call.cause} (Code: ${call.causeCode})`);
      
      if (errorInfo && call.cause !== 'NORMAL_CLEARING') {
        // Enhanced error handling with user guidance
        handleCallFailure(call, errorInfo);
      } else {
        // Normal call termination
        showMessage('Call completed');
      }
    }
  }
});

function handleCallFailure(call, errorInfo) {
  // Display user-friendly message
  showNotification(errorInfo.userMessage, 'error');
  
  // Show suggested action
  if (errorInfo.suggestedAction) {
    showActionButton(errorInfo.suggestedAction);
  }
  
  // Show retry option if available
  if (errorInfo.canRetry) {
    showRetryButton(() => {
      // Implement smart retry logic
      retryCall(call);
    });
  }
  
  // Show additional guidance
  if (errorInfo.nextSteps && errorInfo.nextSteps.length > 0) {
    showGuidancePanel(errorInfo.nextSteps);
  }
}

function retryCall(originalCall) {
  const newCall = client.newCall({
    destinationNumber: originalCall.options.destinationNumber,
    callerNumber: originalCall.options.callerNumber
  });
}
```

### Enhanced Connection Error Handling

Connection errors now include intelligent reconnection with network awareness.

**Enhanced Connection Management:**

```javascript
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'connectionStateChange') {
    const { state, error, reconnectionInfo } = notification;
    
    switch (state) {
      case 'connected':
        showConnectionStatus('Connected');
        hideReconnectionDialog();
        break;
        
      case 'disconnected':
        showConnectionStatus('Disconnected');
        if (error) {
          showDisconnectionReason(error.userMessage);
        }
        break;
        
      case 'connecting':
        showConnectionStatus('Reconnecting...');
        showReconnectionProgress(reconnectionInfo);
        break;
        
      case 'failed':
        showConnectionStatus('Connection Failed');
        showReconnectionFailedDialog(error);
        break;
    }
  }
});

function showReconnectionProgress(info) {
  showReconnectionDialog({
    message: `Reconnecting... Attempt ${info.attempts} of ${info.maxAttempts}`,
    nextRetryIn: info.nextRetryIn,
    canCancel: true
  });
}

function showReconnectionFailedDialog(error) {
  showErrorDialog({
    title: 'Connection Failed',
    message: error.userMessage,
    action: error.suggestedAction,
    buttons: [
      {
        text: 'Retry Now',
        action: () => client.connect()
      },
      {
        text: 'Refresh Page',
        action: () => window.location.reload()
      }
    ]
  });
}
```

**Network State Awareness:**

The enhanced connection manager automatically detects network changes:

```javascript
// Automatic network monitoring
window.addEventListener('online', () => {
  console.log('Network restored, attempting reconnection');
});

window.addEventListener('offline', () => {
  console.log('Network lost, will retry when restored');
});

// Manual connection management
client.connectionManager.forceReconnect(); // Force immediate retry
client.connectionManager.stopReconnection(); // Stop auto-reconnection
```

## Intelligent Reconnection Process

The enhanced SDK includes intelligent reconnection with exponential backoff and network awareness.

### Automatic Reconnection Features

1. **Smart Retry Logic**: Exponential backoff with maximum delay caps
2. **Network Awareness**: Waits for network connectivity before attempting
3. **Connection Quality Monitoring**: Adapts retry strategy based on connection stability
4. **Graceful Degradation**: Maintains functionality during temporary connectivity issues

### Reconnection Configuration

```javascript
// The ConnectionManager automatically handles reconnection
// but you can customize the behavior:

const client = new TelnyxRTC({
  // ... other options
  autoReconnect: true, // Enable automatic reconnection (default)
  maxReconnectAttempts: 5, // Maximum reconnection attempts
  baseReconnectDelay: 1000, // Base delay in milliseconds
  reconnectBackoffMultiplier: 1.5 // Backoff multiplier
});

// Monitor reconnection status
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'connectionStateChange') {
    const { reconnectionInfo } = notification;
    
    if (reconnectionInfo) {
      console.log(`Reconnection attempt ${reconnectionInfo.attempts}/${reconnectionInfo.maxAttempts}`);
      console.log(`Next retry in ${reconnectionInfo.nextRetryIn}ms`);
    }
  }
});
```

### Manual Reconnection Control

```javascript
// Force immediate reconnection
client.connectionManager.forceReconnect();

// Stop automatic reconnection
client.connectionManager.stopReconnection();

// Get current connection state
console.log('Connection state:', client.connectionManager.state);

// Get reconnection information
console.log('Reconnection info:', client.connectionManager.reconnectionInfo);
```

### Network State Integration

```javascript
// The SDK automatically integrates with browser network events
// You can also manually check network state:

if (!navigator.onLine) {
  showOfflineMessage('You appear to be offline. Connection will resume when network is restored.');
}

// Custom network change handling
window.addEventListener('online', () => {
  showMessage('Network restored, reconnecting...');
});

window.addEventListener('offline', () => {
  showMessage('Network connection lost');
});
```

## Error Monitoring and Analytics

The enhanced SDK includes comprehensive error monitoring and analytics capabilities.

### ErrorMonitoring Class

Track error patterns and get insights into application behavior:

```javascript
import { ErrorMonitoring } from '@telnyx/webrtc';

// Get comprehensive error statistics
const stats = ErrorMonitoring.getErrorStats();
console.log('Error statistics:', {
  totalErrors: stats.totalErrors,
  errorsByCode: stats.errorsByCode,
  recentErrors: stats.recentErrors
});

// Check if error rate is high for specific error types
if (ErrorMonitoring.isErrorRateHigh('MEDIA_ERROR')) {
  console.warn('High media error rate detected');
  // Implement corrective measures
}

// Clear error statistics (useful for testing)
ErrorMonitoring.clearStats();
```

### Custom Error Reporting

Integrate with your analytics service:

```javascript
import { ErrorHandler } from '@telnyx/webrtc';

// Initialize with custom reporting callback
ErrorHandler.initialize(sessionId, userId, (error) => {
  // Send to your analytics service
  analytics.track('WebRTC Error', {
    errorCode: error.code,
    context: error.context,
    userMessage: error.userMessage,
    canRetry: error.canRetry,
    metadata: error.metadata
  });
  
  // Send to error tracking service (e.g., Sentry)
  Sentry.captureException(error.originalError || error, {
    tags: {
      errorCode: error.code,
      context: error.context
    },
    extra: error.metadata
  });
});
```

### Error Pattern Detection

The system automatically detects error patterns and can trigger alerts:

```javascript
// Error thresholds are automatically monitored
// You can implement custom responses:

client.on('telnyx.notification', (notification) => {
  if (notification.type === 'errorThresholdExceeded') {
    const { errorCode, count, threshold } = notification;
    
    console.warn(`High error rate: ${errorCode} occurred ${count} times (threshold: ${threshold})`);
    
    // Implement corrective measures
    switch (errorCode) {
      case 'MEDIA_ERROR':
        showMediaTroubleshootingDialog();
        break;
      case 'CONNECTION_ERROR':
        showNetworkTroubleshootingDialog();
        break;
      case 'CALL_ERROR':
        showCallTroubleshootingDialog();
        break;
    }
  }
});
```

### Performance Monitoring

Track performance metrics alongside error data:

```javascript
// Performance metrics are automatically collected
const performanceStats = {
  connectionTime: client.connectionManager.connectionTime,
  callSetupTime: client.averageCallSetupTime,
  errorRate: ErrorMonitoring.getErrorRate(),
  reconnectionRate: client.connectionManager.reconnectionRate
};

// Send to monitoring service
monitoringService.trackMetrics('webrtc_performance', performanceStats);
```

## Best Practices

### 1. Always Implement Enhanced Error Handling

```javascript
import { TelnyxRTC, ErrorHandler } from '@telnyx/webrtc';

const client = new TelnyxRTC(options);

// Initialize error handling with context
ErrorHandler.initialize(sessionId, userId, (error) => {
  // Custom error reporting
  sendToAnalytics(error);
});

client.on('telnyx.notification', (notification) => {
  switch (notification.type) {
    case 'callUpdate':
      handleCallUpdate(notification.call, notification.error);
      break;
    case 'userMediaError':
      handleMediaError(notification.error);
      break;
    case 'connectionStateChange':
      handleConnectionState(notification.state, notification.reconnectionInfo);
      break;
    case 'vertoClientReady':
      onClientReady();
      break;
    default:
      console.log('Unhandled notification:', notification);
  }
});

function handleMediaError(error) {
  // Enhanced error handling with user guidance
  showUserFriendlyError({
    title: 'Media Access Required',
    message: error.userMessage,
    action: error.suggestedAction,
    canRetry: error.canRetry
  });
}

function handleCallUpdate(call, errorInfo) {
  if (call.state === 'hangup' && errorInfo) {
    showCallFailureDialog({
      message: errorInfo.userMessage,
      action: errorInfo.suggestedAction,
      canRetry: errorInfo.canRetry,
      nextSteps: errorInfo.nextSteps
    });
  }
}
```

### 2. Handle User Media Permissions Gracefully

```javascript
async function requestMediaPermissions() {
  try {
    const devices = await client.getDevices();
    console.log('Available devices:', devices);
    return true;
  } catch (error) {
    if (error.code === 'MEDIA_ERROR') {
      // Enhanced error with user guidance
      showPermissionDialog({
        title: 'Camera and Microphone Access',
        message: error.userMessage,
        action: error.suggestedAction,
        steps: [
          'Click the camera/microphone icon in your browser address bar',
          'Select "Allow" for both camera and microphone',
          'Click "Retry" below to continue'
        ],
        onRetry: () => requestMediaPermissions()
      });
    }
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

### 3. Implement Smart Retry Logic

```javascript
function createSmartRetryHandler(originalAction, maxRetries = 3) {
  let retryCount = 0;
  
  return async function retryHandler(...args) {
    try {
      return await originalAction(...args);
    } catch (error) {
      retryCount++;
      
      if (error.canRetry && retryCount <= maxRetries) {
        console.log(`Retrying action (${retryCount}/${maxRetries})`);
        
        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return retryHandler(...args);
      } else {
        // Show final error message
        showErrorMessage(error.userMessage || 'Operation failed after multiple attempts');
        throw error;
      }
    }
  };
}

// Usage
const smartMakeCall = createSmartRetryHandler(
  (destinationNumber) => client.newCall({ destinationNumber })
);

smartMakeCall('1234567890')
  .then(call => console.log('Call created:', call))
  .catch(error => console.error('Call failed permanently:', error));
```

### 4. Monitor Connection Quality

```javascript
function setupConnectionMonitoring() {
  let connectionQuality = 'good';
  
  client.on('telnyx.notification', (notification) => {
    if (notification.type === 'connectionStateChange') {
      const { state, reconnectionInfo } = notification;
      
      // Assess connection quality based on reconnection patterns
      if (reconnectionInfo && reconnectionInfo.attempts > 2) {
        connectionQuality = 'poor';
        showConnectionQualityWarning();
      } else if (state === 'connected' && connectionQuality === 'poor') {
        connectionQuality = 'good';
        hideConnectionQualityWarning();
      }
      
      updateConnectionQualityUI(connectionQuality);
    }
  });
}

function showConnectionQualityWarning() {
  showWarningBanner({
    message: 'Poor connection quality detected',
    action: 'Check your internet connection for the best experience',
    dismissible: true
  });
}
```

### 5. Implement Graceful Degradation

```javascript
async function initializeWebRTC() {
  // Check for WebRTC support
  if (!window.RTCPeerConnection) {
    showUnsupportedBrowserDialog();
    return false;
  }
  
  // Check for HTTPS (required for getUserMedia)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    showHTTPSRequiredDialog();
    return false;
  }
  
  try {
    // Initialize with enhanced error handling
    const client = new TelnyxRTC(options);
    
    // Test basic functionality
    await client.connect();
    
    return true;
  } catch (error) {
    if (error.code === 'CONNECTION_ERROR') {
      showConnectivityIssueDialog(error);
    } else if (error.code === 'AUTH_ERROR') {
      showAuthenticationErrorDialog(error);
    } else {
      showGenericErrorDialog(error);
    }
    
    return false;
  }
}

function showUnsupportedBrowserDialog() {
  showErrorDialog({
    title: 'Unsupported Browser',
    message: 'Your browser does not support WebRTC.',
    action: 'Please use a modern browser like Chrome, Firefox, or Safari.',
    buttons: [
      { text: 'Download Chrome', action: () => window.open('https://chrome.google.com') },
      { text: 'Download Firefox', action: () => window.open('https://firefox.com') }
    ]
  });
}
```

### 6. Log Errors for Debugging

```javascript
function setupErrorLogging() {
  // Enhanced error logging with context
  ErrorHandler.initialize(sessionId, userId, (error) => {
    const errorLog = {
      timestamp: error.timestamp,
      sessionId: sessionId,
      userId: userId,
      errorCode: error.code,
      context: error.context,
      message: error.message,
      userMessage: error.userMessage,
      canRetry: error.canRetry,
      metadata: error.metadata,
      userAgent: navigator.userAgent,
      url: window.location.href,
      networkState: navigator.onLine
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('TelnyxRTC Error:', errorLog);
    }
    
    // Send to error tracking service
    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(error.originalError || error, {
        tags: {
          errorCode: error.code,
          context: error.context
        },
        extra: errorLog
      });
    }
    
    // Send to custom analytics
    if (typeof analytics !== 'undefined') {
      analytics.track('WebRTC Error', errorLog);
    }
  });
}
```

### 7. User Experience Best Practices

```javascript
function createUserFriendlyErrorUI() {
  // Create error notification system
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-notifications';
  document.body.appendChild(errorContainer);
  
  function showUserFriendlyError(error) {
    const notification = document.createElement('div');
    notification.className = `error-notification ${error.code.toLowerCase()}`;
    
    notification.innerHTML = `
      <div class="error-content">
        <h4>${getErrorTitle(error.code)}</h4>
        <p>${error.userMessage}</p>
        ${error.suggestedAction ? `<p class="suggestion">${error.suggestedAction}</p>` : ''}
        ${error.canRetry ? '<button class="retry-btn">Try Again</button>' : ''}
        <button class="dismiss-btn">×</button>
      </div>
    `;
    
    // Add event listeners
    const retryBtn = notification.querySelector('.retry-btn');
    const dismissBtn = notification.querySelector('.dismiss-btn');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        retryErrorAction(error);
        notification.remove();
      });
    }
    
    dismissBtn.addEventListener('click', () => {
      notification.remove();
    });
    
    // Auto-dismiss after delay (except for critical errors)
    if (error.canRetry) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 10000);
    }
    
    errorContainer.appendChild(notification);
  }
  
  function getErrorTitle(errorCode) {
    const titles = {
      'MEDIA_ERROR': 'Camera or Microphone Access Required',
      'CONNECTION_ERROR': 'Connection Issue',
      'CALL_ERROR': 'Call Failed',
      'AUTH_ERROR': 'Authentication Failed'
    };
    return titles[errorCode] || 'Error';
  }
  
  return { showUserFriendlyError };
}
```

## Migration Guide

### Upgrading from Basic Error Handling

If you're upgrading from the basic error handling system, here's how to migrate:

#### Before (Basic Error Handling)

```javascript
// Old approach - basic error handling
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    console.error('Media error:', notification.error);
    alert('Cannot access camera or microphone');
  }
});

client.getDevices().catch((error) => {
  console.error('Device error:', error);
  // Silent failure or basic error message
});
```

#### After (Enhanced Error Handling)

```javascript
// New approach - enhanced error handling
import { ErrorHandler } from '@telnyx/webrtc';

// Initialize with context
ErrorHandler.initialize(sessionId, userId);

client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    const error = notification.error;
    
    // Enhanced error with user guidance
    showErrorDialog({
      title: 'Media Access Required',
      message: error.userMessage,
      action: error.suggestedAction,
      canRetry: error.canRetry
    });
  }
});

// Enhanced device access with proper error handling
try {
  const devices = await client.getDevices();
  console.log('Available devices:', devices);
} catch (error) {
  // TelnyxError with user-friendly messages and guidance
  console.log('Enhanced error info:', {
    userMessage: error.userMessage,
    suggestedAction: error.suggestedAction,
    canRetry: error.canRetry
  });
}
```

### Key Changes

1. **Enhanced Error Objects**: Errors now include user-friendly messages, suggested actions, and retry information
2. **Centralized Error Handling**: Use `ErrorHandler` for consistent error processing
3. **Intelligent Reconnection**: `ConnectionManager` handles reconnection automatically
4. **Error Monitoring**: Track error patterns with `ErrorMonitoring`
5. **Better User Experience**: Enhanced notifications with actionable guidance

### Backward Compatibility

The enhanced error handling system is designed to be backward compatible. Existing error handling code will continue to work, but you'll get additional benefits by upgrading to the new system.

```javascript
// This still works (backward compatible)
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    console.error('Error:', notification.error.message);
  }
});

// But this provides enhanced functionality
client.on('telnyx.notification', (notification) => {
  if (notification.type === 'userMediaError') {
    const error = notification.error;
    if (error.userMessage) {
      // Enhanced error handling available
      showUserFriendlyError(error);
    } else {
      // Fallback to basic handling
      console.error('Error:', error.message);
    }
  }
});
```

By following these enhanced error handling patterns and best practices, you can build robust applications that provide a smooth user experience even when errors occur. The intelligent error handling system will help users understand what went wrong and guide them toward resolution, while providing developers with rich debugging information and error analytics.

## Summary

The enhanced error handling system in the Telnyx WebRTC JS SDK provides:

- **User-Friendly Errors**: Clear, actionable error messages for end users
- **Intelligent Reconnection**: Smart retry logic with network awareness
- **Error Analytics**: Pattern detection and monitoring capabilities
- **Better Developer Experience**: Rich error context and debugging information
- **Graceful Degradation**: Maintains functionality during temporary issues
- **Backward Compatibility**: Works with existing code while providing enhanced features

For more information and examples, see the [API documentation](../README.md) and the individual class documentation.