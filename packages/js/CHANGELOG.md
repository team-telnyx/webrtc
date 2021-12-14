### [2.7.3](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.2...webrtc/v2.7.3) (2021-12-14)


### Bug Fixes

* change previousGatewayState only if gateWayState exist to avoid send many REGISTER messages ([#244](https://github.com/team-telnyx/webrtc/issues/244)) ([70c10fa](https://github.com/team-telnyx/webrtc/commit/70c10faae274e08e019fdf2187af839dd0ad744c))

### [2.7.2](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.1...webrtc/v2.7.2) (2021-12-13)


### Bug Fixes

* **ENGDESK-12851:** add code to avoid multiples REGED messages on the client side ([#235](https://github.com/team-telnyx/webrtc/issues/235)) ([86b3a0e](https://github.com/team-telnyx/webrtc/commit/86b3a0e98cd7b6f60bc00beb1fb21773cdcb2401))

### [2.7.1](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.0...webrtc/v2.7.1) (2021-12-09)


### Bug Fixes

* add stop stream after query it ([#233](https://github.com/team-telnyx/webrtc/issues/233)) ([0e4fba9](https://github.com/team-telnyx/webrtc/commit/0e4fba97cfd98fd464f2076d1c32f7366366e9f2))

## [2.7.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.6.2...webrtc/v2.7.0) (2021-12-08)


### Features

* **WEBRTC-558:** add slack notification ([#219](https://github.com/team-telnyx/webrtc/issues/219)) ([3925a82](https://github.com/team-telnyx/webrtc/commit/3925a822d5c42658a23a7e9fd1df8ff563a723a1))


### Bug Fixes

* **Hotfix:** package.lock update and node upgrade to 14 ([#228](https://github.com/team-telnyx/webrtc/issues/228)) ([29b7c27](https://github.com/team-telnyx/webrtc/commit/29b7c2789dfac30083a0cb62ae4677e943cb5767))
* **WEBRTC-746:** recursive call to getDevices when the browser does not support audiooutput like Safari and Firefox. ([#223](https://github.com/team-telnyx/webrtc/issues/223)) ([bbc2231](https://github.com/team-telnyx/webrtc/commit/bbc2231cc1a62a1bff62bbcb974c7f0231fef06e))

### [2.2.7](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.2.7...webrtc/v2.2.7) (2021-01-08)

### [2.2.6](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.2.6...webrtc/v2.2.6) (2021-01-08)

### [2.2.5](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.2.5...webrtc/v2.2.5) (2021-01-06)

### [2.2.4](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.2.4...webrtc/v2.2.4) (2020-12-11)

### [2.2.3](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.2.2...webrtc/v2.2.3) (2020-12-04)

### Changed

- Updates to `docs`

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
