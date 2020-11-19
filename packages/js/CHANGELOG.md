## [2.2.2](https://github.com/team-telnyx/webrtc/compare/v2.2.1-50-g0d4d2364801153f2d24afdee90fc15c856b000df...webrtc/v2.2.2) (2020-11-19)


### Bug Fixes

* **ENGDESK-7173:** change the STUN_SERVER port from 3843 to 3478 ([#60](https://github.com/team-telnyx/webrtc/issues/60)) ([cc8f78f](https://github.com/team-telnyx/webrtc/commit/cc8f78f1454039efb55b921c0de54df5c1326e8f))


### Reverts

* Revert "Release 2.2.2" ([0d4d236](https://github.com/team-telnyx/webrtc/commit/0d4d2364801153f2d24afdee90fc15c856b000df))
* Revert "Release 2.2.3" ([d691dc2](https://github.com/team-telnyx/webrtc/commit/d691dc2d0835c53589607461256d658433868275))
* Revert "NEEDS REVERT: temporarily test release with edited event" ([34bfe9b](https://github.com/team-telnyx/webrtc/commit/34bfe9bd890e95fbd77bc24b6abf93e2b812445c))
* Revert "Release 2.2.3" ([09d6983](https://github.com/team-telnyx/webrtc/commit/09d69837ca145f1b6c75ee00471c69c8f0e44400))
* Revert "Release 2.3.0" ([5a05356](https://github.com/team-telnyx/webrtc/commit/5a05356ca32eff9b154b90f2ca254d17bf3eac9a))
* Revert "Release 2.2.2" ([45e2ae8](https://github.com/team-telnyx/webrtc/commit/45e2ae8bc6a0f13d97fdcc39170adb8c8023a735))
* Revert "Release 2.2.3" ([0892163](https://github.com/team-telnyx/webrtc/commit/0892163eff326ca3763ee56986c4a016248e9df6))

# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
