## Table of contents

### Call Classes

- [Call](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/Call.md)

### Client Classes

- [TelnyxRTC](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TelnyxRTC.md)

### Other Classes

- [PreCallDiagnosis](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/PreCallDiagnosis.md)

### Notification Interfaces

- [INotification](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/INotification.md)

### Other Interfaces

- [ICallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallOptions.md)
- [IClientOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IClientOptions.md)
- [MinMaxAverage](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/MinMaxAverage.md)
- [PreCallDiagnosisOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosisOptions.md)
- [RTCIceCandidateStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RTCIceCandidateStats.md)
- [Report](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/Report.md)
- [TelnyxIDs](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TelnyxIDs.md)

### Functions

- [getConstraintsWithoutDeviceId](#getconstraintswithoutdeviceid)
- [isDeviceNotFoundError](#isdevicenotfounderror)

## Functions

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
