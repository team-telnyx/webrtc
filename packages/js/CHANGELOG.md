## [2.4.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.3.0...webrtc/v2.4.0) (2020-12-02)


### Features

* **WEBRTC-226:** add typedoc on getDeviceResolutions method and create a utility method to test ([#71](https://github.com/team-telnyx/webrtc/issues/71)) ([f8bdb8c](https://github.com/team-telnyx/webrtc/commit/f8bdb8cfe07a089a2b6e33b547b88362a0956b27))
* **WEBRTC-228-229:** add typedoc on and off methods ([#72](https://github.com/team-telnyx/webrtc/issues/72)) ([0f93d8c](https://github.com/team-telnyx/webrtc/commit/0f93d8c2f5e7deacb2d6f233a70ffdcb96af6386))

## [2.3.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.2.2...webrtc/v2.3.0) (2020-11-25)


### Features

* **WEBRTC-227:** add typedoc on getDevices method and create  a utility method to test ([#70](https://github.com/team-telnyx/webrtc/issues/70)) ([2159cf6](https://github.com/team-telnyx/webrtc/commit/2159cf6d8697e29f567894936ebe2a8fda5b5756))


### Bug Fixes

* **WEBRTC-281:** vulnerability dependencies ([#69](https://github.com/team-telnyx/webrtc/issues/69)) ([6596525](https://github.com/team-telnyx/webrtc/commit/6596525392e294641673f5c149b98e26c5d4e867))

## [2.2.2](https://github.com/team-telnyx/webrtc/compare/v2.2.1-50-g0d4d2364801153f2d24afdee90fc15c856b000df...webrtc/v2.2.2) (2020-11-19)

### Bug Fixes

- **ENGDESK-7173:** change the STUN_SERVER port from 3843 to 3478 ([#60](https://github.com/team-telnyx/webrtc/issues/60)) ([cc8f78f](https://github.com/team-telnyx/webrtc/commit/cc8f78f1454039efb55b921c0de54df5c1326e8f))

## [2.1.6] - 2020-10-05

### Changed

- Added cause and causeCode when hangup the call

## [2.1.5] - 2020-08-26

### Changed

- Removed adapter-webrtc it was breaking the react-native SDK

### Added

- Added improvements in production bundle code.

## [2.1.4] - 2020-08-26

### Changed

- Enabled multiple connections in multiple devices (browsers, tabs, and etc)
- Changed localStorage to use sessionStorage on Login class to save `sessid`

## [2.1.3] - 2020-08-13

### Added

- Added `SipReason` `SipCode` and `SIP Call ID` to show friendly error messages.

### Changed

- Changed the project structure to use monorepo yarn workspaces.

## [2.1.2] - 2020-08-06

### Fixed

- Fixed alert message about `Authentication required`

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
