## Table of contents

### Enumerations

- [VertoModifyAction](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/enums/VertoModifyAction.md)

### Call Classes

- [Call](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/Call.md)

### Client Classes

- [TelnyxRTC](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TelnyxRTC.md)

### Other Classes

- [PreCallDiagnosis](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/PreCallDiagnosis.md)

### Notification Interfaces

- [INotification](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/INotification.md)

### Other Interfaces

- [ICallEstablishmentTimings](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md)
- [ICallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallOptions.md)
- [IClientOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IClientOptions.md)
- [IICECandidatePair](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IICECandidatePair.md)
- [ILocalAudioSourceStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ILocalAudioSourceStats.md)
- [ILocalAudioTrackSnapshot](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ILocalAudioTrackSnapshot.md)
- [ITransportStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ITransportStats.md)
- [MinMaxAverage](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/MinMaxAverage.md)
- [PreCallDiagnosisOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosisOptions.md)
- [RTCIceCandidateStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RTCIceCandidateStats.md)
- [Report](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/Report.md)
- [TargetParams](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TargetParams.md)
- [TelnyxIDs](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TelnyxIDs.md)

### Functions

- [clearCallMarks](#clearcallmarks)
- [collectCallEstablishmentTimings](#collectcallestablishmenttimings)
- [getConstraintsWithoutDeviceId](#getconstraintswithoutdeviceid)
- [isDeviceNotFoundError](#isdevicenotfounderror)
- [logCallEstablishmentTimings](#logcallestablishmenttimings)

## Functions

### clearCallMarks

▸ **clearCallMarks**(): `void`

Clear all call establishment performance marks.

#### Returns

`void`

---

### collectCallEstablishmentTimings

▸ **collectCallEstablishmentTimings**(`mode`, `direction`): [`ICallEstablishmentTimings`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md)

Collect all call establishment timings from performance marks.
All times are measured from the 'new-call-start' mark.

#### Parameters

| Name        | Type                           | Description                         |
| :---------- | :----------------------------- | :---------------------------------- |
| `mode`      | `"trickle"` \| `"non-trickle"` | 'trickle' or 'non-trickle' ICE mode |
| `direction` | `"inbound"` \| `"outbound"`    | 'outbound' or 'inbound'             |

#### Returns

[`ICallEstablishmentTimings`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md)

---

### getConstraintsWithoutDeviceId

▸ **getConstraintsWithoutDeviceId**(`constraints`): `MediaStreamConstraints`

Remove deviceId constraints from constraints to fallback to default device
Returns null if no deviceId was specified (no fallback possible)

#### Parameters

| Name          | Type                     |
| :------------ | :----------------------- |
| `constraints` | `MediaStreamConstraints` |

#### Returns

`MediaStreamConstraints`

---

### isDeviceNotFoundError

▸ **isDeviceNotFoundError**(`error`): `boolean`

Check if error is related to a specific device being unavailable

#### Parameters

| Name    | Type    |
| :------ | :------ |
| `error` | `Error` |

#### Returns

`boolean`

---

### logCallEstablishmentTimings

▸ **logCallEstablishmentTimings**(`timings`): `void`

Log call establishment timings as a readable table.

#### Parameters

| Name      | Type                                                                                                                                       |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `timings` | [`ICallEstablishmentTimings`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md) |

#### Returns

`void`
