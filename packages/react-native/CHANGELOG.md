# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2020-10-05

### Changed

- Added cause and causeCode when hangup the call

## [1.0.7] - 2020-08-26

### Changed

- Enabled multiple connections in multiple devices (browsers, tabs, and etc)
- Changed localStorage to use sessionStorage on Login class to save `sessid`
- Removed adapter-webrtc it was breaking the react-native SDK

## [1.0.6] - 2020-08-13

### Added

- Added `SipReason` `SipCode` and `SIP Call ID` to show friendly error messages.

### Changed

- Changed the project structure to use monorepo yarn workspaces.

## [1.0.5] - 2020-08-06

### Fixed

- Fixed alert message about `Authentication required`

## [1.0.4] - 2020-07-09

### Added

- Added CHANGELOG file.

### Security

- Fix vulnerabilities in some dev dependencies.

## [1.0.3] - 2020-06-05

### Added

- Added support to choose environment between production or dev in SDK client
- Added the property `env` in react-native examples

## [1.0.2] - 2020-05-21

### Added

- Added README with instructions.

## [1.0.0] - 2020-05-12

## First Release!
