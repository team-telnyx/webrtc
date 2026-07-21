Information about a single audio input device, from enumerateDevices.

Includes the device label, deviceId, and kind so callers can display
the full list of microphones to the user.

## Table of contents

### Properties

- [deviceId](#deviceid)
- [kind](#kind)
- [label](#label)

## Properties

### deviceId

• **deviceId**: `string`

Device ID from the browser. May be empty when permission not granted.

---

### kind

• **kind**: `"audioinput"`

Device kind (always 'audioinput' for this module).

---

### label

• **label**: `string`

Device label (human-readable name). May be empty when permission not granted.
