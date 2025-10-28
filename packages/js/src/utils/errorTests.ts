/**
 * Simple test to verify custom error classes work correctly
 * This can be used to verify the error handling is working as expected
 */
import {
  TelnyxError,
  TelnyxValidationError,
  TelnyxConfigError,
  TelnyxDeviceError,
  TelnyxNetworkError,
  TelnyxCallError,
} from '../utils/TelnyxError';

// Test TelnyxError base class
function testTelnyxError() {
  const error = new TelnyxError('Test error', {
    code: 'TEST_CODE',
    context: { test: true }
  });
  
  console.log('TelnyxError test:', {
    name: error.name,
    message: error.message,
    code: error.code,
    context: error.context,
    timestamp: error.timestamp,
    json: error.toJSON()
  });
  
  return error instanceof Error && error instanceof TelnyxError;
}

// Test TelnyxValidationError
function testTelnyxValidationError() {
  const error = new TelnyxValidationError('Validation failed', {
    code: 'VALIDATION_FAILED',
    context: { field: 'destinationNumber' }
  });
  
  console.log('TelnyxValidationError test:', {
    name: error.name,
    instanceOfTelnyxError: error instanceof TelnyxError,
    instanceOfValidationError: error instanceof TelnyxValidationError
  });
  
  return error instanceof TelnyxError && error instanceof TelnyxValidationError;
}

// Test all error types
function testAllErrorTypes() {
  const errors = [
    new TelnyxConfigError('Config error'),
    new TelnyxDeviceError('Device error'),
    new TelnyxNetworkError('Network error'),
    new TelnyxCallError('Call error')
  ];
  
  return errors.every(error => {
    const isCorrectInstance = error instanceof TelnyxError;
    console.log(`${error.constructor.name}:`, {
      instanceOfTelnyxError: isCorrectInstance,
      name: error.name,
      message: error.message
    });
    return isCorrectInstance;
  });
}

// Run tests
export function runErrorTests() {
  console.log('Running TelnyxError tests...');
  
  const results = {
    baseError: testTelnyxError(),
    validationError: testTelnyxValidationError(),
    allErrors: testAllErrorTypes()
  };
  
  console.log('Test results:', results);
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed!');
  
  return allPassed;
}