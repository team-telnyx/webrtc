# Enhanced Error Handling

The Telnyx WebRTC SDK now includes enhanced error handling with custom error classes that provide more context and better debugging information.

## Custom Error Classes

### `TelnyxError`
Base class for all Telnyx-specific errors. Includes:
- `code`: Error code for programmatic handling
- `context`: Additional context information
- `timestamp`: When the error occurred
- `toJSON()`: Method for serializing error information

### `TelnyxValidationError`
Thrown when required parameters are missing or invalid:
```typescript
// Example: Missing destinationNumber in newCall()
throw new TelnyxValidationError('destinationNumber is required', {
  code: 'DESTINATION_NUMBER_REQUIRED',
  context: { method: 'newCall', providedOptions: {...} }
});
```

### `TelnyxConfigError`
Thrown when configuration is invalid or environment is not supported:
```typescript
// Example: Unsupported browser
throw new TelnyxConfigError('Browser not supported', {
  code: 'UNSUPPORTED_BROWSER',
  context: { userAgent: navigator.userAgent }
});
```

### `TelnyxDeviceError`
Thrown when media devices are not accessible:
```typescript
// Example: Device resolution scan failure
throw new TelnyxDeviceError('Failed to get device resolutions', {
  code: 'DEVICE_RESOLUTION_ERROR',
  context: { deviceId: 'camera-123' }
});
```

### `TelnyxNetworkError`
Thrown when network operations fail:
```typescript
// Example: getUserMedia failure
throw new TelnyxNetworkError('Failed to get user media', {
  code: 'USER_MEDIA_ERROR',
  context: { constraints: { audio: true, video: false } }
});
```

### `TelnyxCallError`
Thrown when call operations fail:
```typescript
// Example: Conference video error
throw new TelnyxCallError('Conference has no video', {
  code: 'CONFERENCE_NO_VIDEO',
  context: { callId: '12345' }
});
```

## Usage

### Basic Error Handling (Unchanged)
Existing code continues to work without changes:
```typescript
try {
  const call = client.newCall({ destinationNumber: '' });
} catch (error) {
  console.error('Call failed:', error.message);
}
```

### Enhanced Error Handling
Take advantage of enhanced error information:
```typescript
import { TelnyxValidationError, TelnyxConfigError } from '@telnyx/webrtc';

try {
  const call = client.newCall({ destinationNumber: '' });
} catch (error) {
  if (error instanceof TelnyxValidationError) {
    console.error('Validation error:', error.code, error.context);
    // Handle validation errors (e.g., show form validation)
  } else if (error instanceof TelnyxConfigError) {
    console.error('Config error:', error.code, error.context);
    // Handle configuration errors (e.g., show browser upgrade notice)
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Error Logging and Debugging
Enhanced errors provide structured data for logging:
```typescript
try {
  // SDK operation
} catch (error) {
  if (error instanceof TelnyxError) {
    // Send structured error data to logging service
    logger.error('TelnyxRTC Error', error.toJSON());
  }
}
```

## Error Codes

### Validation Errors
- `DESTINATION_NUMBER_REQUIRED`: Missing destinationNumber in call options
- `SETTINGS_REQUIRED`: Missing settings object in audio/video configuration
- `INVALID_BROADCAST_CHANNEL`: Invalid or empty channel for broadcast

### Configuration Errors
- `INVALID_INIT_OPTIONS`: Invalid initialization options for session
- `BROWSER_NOT_SUPPORTED`: Environment is not a supported web browser
- `UNSUPPORTED_BROWSER`: Browser does not support WebRTC features

### Device Errors
- `DEVICE_RESOLUTION_ERROR`: Failed to scan device resolutions

### Network Errors
- `USER_MEDIA_ERROR`: Failed to access user media devices

### Call Errors
- `CONFERENCE_NO_VIDEO`: Conference operation requires video but none available

## Migration Guide

The enhanced error handling is **fully backward compatible**. No existing code needs to be changed.

### For New Applications
Consider using the enhanced error information:
1. Import specific error classes for type checking
2. Use error codes for programmatic handling
3. Use context information for debugging
4. Implement proper error logging with `toJSON()`

### For Existing Applications
Optionally enhance error handling:
1. Add instanceof checks for specific error types
2. Use error.code for better error categorization
3. Log error.context for better debugging information

This enhanced error handling improves debugging, user experience, and makes it easier to build robust applications with the Telnyx WebRTC SDK.