## [2.24.2](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.24.1...webrtc/v2.24.2) (2025-11-04)

- chore: socket connection error handling documentation (#460)

## [2.24.1](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.24.0...webrtc/v2.24.1) (2025-10-30)

- fix: update inner `voice_sdk_id` state on first trickle ice canary use (#459)

## [2.24.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.19...webrtc/v2.24.0) (2025-10-29)

### Features

 - true trickle ice implementation (#439)

### Enhancements

 - check for gateway trickle ice support and add fallback
 - improve logging on connection state changes
 - add trickle ice performance metrics
 - remove legacy video code

## [2.22.19](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.18...webrtc/v2.22.19) (2025-10-29)

fix: enforce callID from call options to be string (#456)

## [2.22.18](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.17...webrtc/v2.22.18) (2025-10-23)

fix: expose getIsRegistered (#448)
fix: preferred codecs should only be enforced on INVITE, not on ANSWER (#452)

## [2.22.17](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.16...webrtc/v2.22.17) (2025-08-04)

chore: add detailed performance measuring for invite (#438)


## [2.22.16](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.15...webrtc/v2.22.16) (2025-08-04)

feat: add support for image attachments (#436)

## [2.22.15](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.14...webrtc/v2.22.15) (2025-07-24)

feat: pass target_version_id for anonymous login (#434)

## [2.22.14](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.13...webrtc/v2.22.14) (2025-07-09)

feat: send messages to AI agents (#432)

## [2.22.13](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.12...webrtc/v2.22.13) (2025-07-04)

fix: improve p2p connection establishment time (#431)
fix: export Call via relative path (#429)

## [2.22.12](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.11...webrtc/v2.22.12) (2025-05-20)

chore: Tidy up exposed interfaces in entrypoint (#428)

## [2.22.11](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.10...webrtc/v2.22.11) (2025-05-14)

### Bug fixes

fix: the pre-call diagnosis report sometimes doesn't resolve. (#426)

## [2.22.10](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.9...webrtc/v2.22.10) (2025-05-09)

### Bug fixes

fix: debug report file is not generated (#425)

## [2.22.9](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.8...webrtc/v2.22.9) (2025-04-14)

### Features

feat: anonymous login and ai_agent calls (#420)

## [2.22.8](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.7...webrtc/v2.22.8) (2025-03-28)

### Features

feat: regional subdomains for voice-sdk (#417)

## [2.22.7](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.6...webrtc/v2.22.7) (2025-03-06)

### Features

feat: implement real time call quality metrics (#414)
feat: implement pre-call diagnosis (#407)

### Bug fixes

fix: disable automatic video response in favor of answer option (#413)

## [2.22.6](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.5...webrtc/v2.22.6) (2025-02-20)

### Bug fixes

fix: attach with video when receiving m=video sdp (#409)

## [2.22.5](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.4...webrtc/v2.22.5) (2025-01-17)

### Bug Fixes

fix(webrtc): Stop ringback tone when call is hung up (#406)

## [2.22.4](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.3...webrtc/v2.22.4) (2025-01-14)

### Bug fixes

Fix inconsistency in reporting `addConnection` debug event through the websocket

## [2.22.3](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.2...webrtc/v2.22.3) (2024-12-03)

### Bug fixes

fix: Fix compatibility with NextJS

### Features

feat: add option to force usage of relay candidate (#400)

## [2.22.2](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.1...webrtc/v2.22.2) (2024-11-14)

### Enhancement

- WebRTC Debug Report: Enhance collected data.

### Features

- add an option to allow ice candidate prefetching (#396)

## [2.22.1](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.22.0...webrtc/v2.22.1) (2024-10-14)

### Bug Fixes

Improve stability for ICE gathering process. (See [#391](https://github.com/team-telnyx/webrtc/pull/391))

## [2.22.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.21.2...webrtc/v2.22.0) (2024-10-14)

### Features

- add reconnection flag to login message ([#380](https://github.com/team-telnyx/webrtc/issues/380)) ([643e252](https://github.com/team-telnyx/webrtc/commit/643e25240ec34a3262811e53fe46d907a2c32390))
- change reconnection logic ([#383](https://github.com/team-telnyx/webrtc/issues/383)) ([8ac1d8c](https://github.com/team-telnyx/webrtc/commit/8ac1d8ca14293dc09dc57e7c89b45ef4e6a6b5ff))
- publish generated docs to gh pages ([#385](https://github.com/team-telnyx/webrtc/issues/385)) ([d3a3d37](https://github.com/team-telnyx/webrtc/commit/d3a3d37d59678a4ad292b72c19fe8954ea91b16b))
- set client_state from bye message ([#382](https://github.com/team-telnyx/webrtc/issues/382)) ([b2c4611](https://github.com/team-telnyx/webrtc/commit/b2c461124ccc70cf5604d40a6d2708c6014c4f83))

### [2.21.2](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.21.1...webrtc/v2.21.2) (2024-09-05)

### Bug Fixes

- keep socket open for longer ([#379](https://github.com/team-telnyx/webrtc/issues/379)) ([89b92ec](https://github.com/team-telnyx/webrtc/commit/89b92ec7b6a92647da5f35a710d33206a170bacb))
- use npm publish ([#376](https://github.com/team-telnyx/webrtc/issues/376)) ([ca965c4](https://github.com/team-telnyx/webrtc/commit/ca965c4d6c998977f637b9d47edf549d56492308))

### [2.21.1](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.21.0...webrtc/v2.21.1) (2024-08-22)

### Bug Fixes

- add .yarn/install_state.gz to .gitignore ([#369](https://github.com/team-telnyx/webrtc/issues/369)) ([7b2b7a4](https://github.com/team-telnyx/webrtc/commit/7b2b7a41a5ed6a1ea992732549fff25fdab093ac))
- query param is appended multiple times ([#368](https://github.com/team-telnyx/webrtc/issues/368)) ([14c2711](https://github.com/team-telnyx/webrtc/commit/14c2711549e6738e4f09a6489e76d5bc4c84b442))
- upgrade ci to use yarn v2 ([#370](https://github.com/team-telnyx/webrtc/issues/370)) ([cc46e49](https://github.com/team-telnyx/webrtc/commit/cc46e491b057c67d1a884e3678098ab0515bb09a))

## [2.21.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.20.0...webrtc/v2.21.0) (2024-08-14)

### Features

- attach reconnection token to host ([#367](https://github.com/team-telnyx/webrtc/issues/367)) ([27be846](https://github.com/team-telnyx/webrtc/commit/27be8463f59a00d8e3369c2826efc3d3d8236b70))

## [2.20.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.19.0...webrtc/v2.20.0) (2024-08-01)

### Features

- get registration state from the gateway ([#366](https://github.com/team-telnyx/webrtc/issues/366)) ([c5af08b](https://github.com/team-telnyx/webrtc/commit/c5af08bcd45f53ea1dba3861a0a53229cf2dbc54))

## [2.19.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.18.0...webrtc/v2.19.0) (2024-06-20)

### Features

- log ice events ([#363](https://github.com/team-telnyx/webrtc/issues/363)) ([f591bcb](https://github.com/team-telnyx/webrtc/commit/f591bcb360c395863155936b5686a1d0ca6d28df))

### Bug Fixes

- add debug typespec ([#362](https://github.com/team-telnyx/webrtc/issues/362)) ([479e745](https://github.com/team-telnyx/webrtc/commit/479e7459ca006ad6395c249794562e9b074fbfa5))

## [2.18.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.17.0...webrtc/v2.18.0) (2024-06-10)

### Features

- support caller codec preference ([#361](https://github.com/team-telnyx/webrtc/issues/361)) ([cac97ac](https://github.com/team-telnyx/webrtc/commit/cac97acf042d7820dd41e501b6b8281e0a67e80d))

## [2.17.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.16.0...webrtc/v2.17.0) (2024-05-28)

### Features

- propagate session id with error event ([#358](https://github.com/team-telnyx/webrtc/issues/358)) ([0f931ed](https://github.com/team-telnyx/webrtc/commit/0f931ede12f637b7ec6db265162deb73dd2f2ff1))

## [2.16.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.15.0...webrtc/v2.16.0) (2024-05-14)

### Features

- chunk debug log ([#356](https://github.com/team-telnyx/webrtc/issues/356)) ([70b6e5e](https://github.com/team-telnyx/webrtc/commit/70b6e5ed1bd5e04443885497dccd2288284092d4))

## [2.15.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.14.0...webrtc/v2.15.0) (2024-04-30)

### Features

- add custom headers on bye ([#353](https://github.com/team-telnyx/webrtc/issues/353)) ([a17781c](https://github.com/team-telnyx/webrtc/commit/a17781c0df72256aab38f386fa90eb521f4aa246))

## [2.14.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.13.0...webrtc/v2.14.0) (2024-04-26)

### Features

- implement debug output for file and websocket ([#352](https://github.com/team-telnyx/webrtc/issues/352)) ([8d1f8e6](https://github.com/team-telnyx/webrtc/commit/8d1f8e6c6a0874d9a4a4be21c101f81678084afb))

## [2.13.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.12.0...webrtc/v2.13.0) (2024-04-22)

### Features

- add probe to fetch webrtc statistics periodically ([#350](https://github.com/team-telnyx/webrtc/issues/350)) ([2a72b60](https://github.com/team-telnyx/webrtc/commit/2a72b60843599dd824ee40ef79bdce2d8ba1ce52))

## [2.12.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.11.0...webrtc/v2.12.0) (2024-04-05)

### Features

- add a faster work-around for ice gathering never completing ([#349](https://github.com/team-telnyx/webrtc/issues/349)) ([47e1863](https://github.com/team-telnyx/webrtc/commit/47e18633b142263d49ca061f8b0c29fd5d5edf2a))

## [2.11.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.10.2...webrtc/v2.11.0) (2024-02-26)

### Features

- **TELAPPS-4794:** expose user agent on login ([#343](https://github.com/team-telnyx/webrtc/issues/343)) ([a8b9606](https://github.com/team-telnyx/webrtc/commit/a8b96068255c4cec50d43d737a85fea267f3b52a))

### Bug Fixes

- **ENGDESK-23349:** bind telnyxids on ringing event for outbound calls ([#342](https://github.com/team-telnyx/webrtc/issues/342)) ([1b1df78](https://github.com/team-telnyx/webrtc/commit/1b1df782c3c4034d412be079b92019e661dbd5ce))
- **ENGDESK-28811:** call object direction is undefined upon receiving call ([#341](https://github.com/team-telnyx/webrtc/issues/341)) ([8ac5a3f](https://github.com/team-telnyx/webrtc/commit/8ac5a3f6626d67cde4cf14c541aa26085be19ae6))

### [2.10.2](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.10.1...webrtc/v2.10.2) (2024-02-20)

### Bug Fixes

- **ENGDESK-26922:** Make `login_token` optional ([#340](https://github.com/team-telnyx/webrtc/issues/340)) ([1c0b36a](https://github.com/team-telnyx/webrtc/commit/1c0b36a8daec1d2552da7dde7842763c1aa477ca))

### [2.10.1](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.10.0...webrtc/v2.10.1) (2023-11-23)

### Bug Fixes

- the params.customHeaders was not being destructuring correctly the values ([#339](https://github.com/team-telnyx/webrtc/issues/339)) ([b7e1c2a](https://github.com/team-telnyx/webrtc/commit/b7e1c2a4dcc974b36f32c59a54a6380a8cbd4d07))

## [2.10.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.9.0...webrtc/v2.10.0) (2023-11-22)

### Features

- **ENGDESK-26634:** add custom headers to invite and answer messages ([#338](https://github.com/team-telnyx/webrtc/issues/338)) ([69814b4](https://github.com/team-telnyx/webrtc/commit/69814b4f4123b7dba777813836551ac771e54892))
- **ENGDESK-27107:** Upgrade WebRTC library to support React 18 ([#321](https://github.com/team-telnyx/webrtc/issues/321)) ([66d0c0e](https://github.com/team-telnyx/webrtc/commit/66d0c0ee8bcd458b20e7fe67c0561663c3190417))

## [2.9.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.8.2...webrtc/v2.9.0) (2023-01-31)

### Features

- **ENGDESK-21003:** add beforeunload event to hang up active calls when the browser is closed or refreshed ([#304](https://github.com/team-telnyx/webrtc/issues/304)) ([5f4a899](https://github.com/team-telnyx/webrtc/commit/5f4a8992e128c9ca9b7c7d5b84412daae2636dcc))

### [2.8.2](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.8.1...webrtc/v2.8.2) (2022-09-28)

### Bug Fixes

- **ENGDESK-19054:** Voice SDK missing types when installed in TypeScript projects. ([#299](https://github.com/team-telnyx/webrtc/issues/299)) ([ae76c98](https://github.com/team-telnyx/webrtc/commit/ae76c984d57c423d8bcac935be680670cfa8614e))

### [2.8.1](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.8.0...webrtc/v2.8.1) (2022-07-07)

## [2.8.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.6...webrtc/v2.8.0) (2022-05-25)

### Features

- **WEBRTC-1798:** add ping request to the server to keep connected ([#287](https://github.com/team-telnyx/webrtc/issues/287)) ([95ce187](https://github.com/team-telnyx/webrtc/commit/95ce187758112edba9f66a4e904c56f9a749dee7))

### [2.7.6](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.5...webrtc/v2.7.6) (2022-04-26)

### [2.7.5](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.4...webrtc/v2.7.5) (2022-04-26)

### [2.7.4](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.3...webrtc/v2.7.4) (2022-04-25)

### Bug Fixes

- change timeout value of 500 to use a random number between 3000 ([#246](https://github.com/team-telnyx/webrtc/issues/246)) ([34a232a](https://github.com/team-telnyx/webrtc/commit/34a232a768683aa8e60c395b658ce9ac44db47a6))
- **WEBRTC-1705:** reverting dependabot updates to fix typedoc generation ([#278](https://github.com/team-telnyx/webrtc/issues/278)) ([5ac667d](https://github.com/team-telnyx/webrtc/commit/5ac667d8d01df418dcbbc814968628121631e4e7))

### [2.7.3](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.2...webrtc/v2.7.3) (2021-12-14)

### Bug Fixes

- change previousGatewayState only if gateWayState exist to avoid send many REGISTER messages ([#244](https://github.com/team-telnyx/webrtc/issues/244)) ([70c10fa](https://github.com/team-telnyx/webrtc/commit/70c10faae274e08e019fdf2187af839dd0ad744c))

### [2.7.2](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.1...webrtc/v2.7.2) (2021-12-13)

### Bug Fixes

- **ENGDESK-12851:** add code to avoid multiples REGED messages on the client side ([#235](https://github.com/team-telnyx/webrtc/issues/235)) ([86b3a0e](https://github.com/team-telnyx/webrtc/commit/86b3a0e98cd7b6f60bc00beb1fb21773cdcb2401))

### [2.7.1](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.7.0...webrtc/v2.7.1) (2021-12-09)

### Bug Fixes

- add stop stream after query it ([#233](https://github.com/team-telnyx/webrtc/issues/233)) ([0e4fba9](https://github.com/team-telnyx/webrtc/commit/0e4fba97cfd98fd464f2076d1c32f7366366e9f2))

## [2.7.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.6.2...webrtc/v2.7.0) (2021-12-08)

### Features

- **WEBRTC-558:** add slack notification ([#219](https://github.com/team-telnyx/webrtc/issues/219)) ([3925a82](https://github.com/team-telnyx/webrtc/commit/3925a822d5c42658a23a7e9fd1df8ff563a723a1))

### Bug Fixes

- **Hotfix:** package.lock update and node upgrade to 14 ([#228](https://github.com/team-telnyx/webrtc/issues/228)) ([29b7c27](https://github.com/team-telnyx/webrtc/commit/29b7c2789dfac30083a0cb62ae4677e943cb5767))
- **WEBRTC-746:** recursive call to getDevices when the browser does not support audiooutput like Safari and Firefox. ([#223](https://github.com/team-telnyx/webrtc/issues/223)) ([bbc2231](https://github.com/team-telnyx/webrtc/commit/bbc2231cc1a62a1bff62bbcb974c7f0231fef06e))

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
## Release: WebRTC SDK V2.22.17
feat: add call initialization metrics

