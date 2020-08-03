# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2020-08-03

### Added

- Added a new react video example to make video call.

### Updated

- Updated storybook react example, removed deprecated methods, and added new ones.

### Fixed

- Fixed audio call on Firefox v78. It only add `offerToReceiveAudio/offerToReceiveVideo` when provided in the `options`

### Security

- Fixed vulnerabilities in some dev dependencies.

## [2.1.0] - 2020-07-09

### Added

- Added the property `ringbackFile` to provide a ringback audio file.
- Added support to play ringback file when receive the event `telnyx_rtc.ringing`.
- Added the property `login_token` to support login with ephemeral token.
- Added CHANGELOG file.

### Changed

- Changed the property `ringFile` to be `ringtoneFile`.

### Security

- Fixed vulnerabilities in some dev dependencies.

## [2.0.3] - 2020-06-08

### Added

- Added `setStateTelnyx` method to `BaseCall.ts`.

## [2.0.2] - 2020-05-12

### Added

- Added support to react-native

## [2.0.1] - 2020-05-12

## First Release!
