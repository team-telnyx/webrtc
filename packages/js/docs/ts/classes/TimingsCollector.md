Collects the SDK call-establishment timeline, its requested ICE summaries,
and the total diagnostic duration.

## Table of contents

### Methods

- [build](#build)
- [complete](#complete)

## Methods

### build

▸ **build**(`options?`): `PreCallTimingsReport`

Build a report and snapshot the SDK establishment timeline.

For call-based tests this must run before hangup, because call cleanup may
release the peer and its retained timing data. Missing or throwing SDK
timing data is omitted rather than failing the diagnostic.

#### Parameters

| Name      | Type                                                                                                                           |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `options` | [`TimingsBuildOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TimingsBuildOptions.md) |

#### Returns

`PreCallTimingsReport`

---

### complete

▸ **complete**(`report`): `void`

Set totalMs after all test work, including cleanup, has finished.

#### Parameters

| Name     | Type                   |
| :------- | :--------------------- |
| `report` | `PreCallTimingsReport` |

#### Returns

`void`
