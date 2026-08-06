Options for the CallRecorder, derived from IClientOptions.

## Table of contents

### Properties

- [enabled](#enabled)
- [endpoint](#endpoint)
- [fetchImpl](#fetchimpl)
- [flushIntervalMs](#flushintervalms)
- [maxBufferBytes](#maxbufferbytes)
- [sampleRate](#samplerate)
- [tracks](#tracks)

## Properties

### enabled

• **enabled**: `boolean`

Whether recording is enabled (mirrors `enableCallRecording`).

---

### endpoint

• `Optional` **endpoint**: `string`

Endpoint path (relative to host) for recording POSTs.

---

### fetchImpl

• `Optional` **fetchImpl**: (`input`: `RequestInfo` \| `URL`, `init?`: `RequestInit`) => `Promise`\<`Response`\>(`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`\<`Response`\>

#### Type declaration

▸ (`input`, `init?`): `Promise`\<`Response`\>

Injectable fetch for tests. Defaults to global fetch.

##### Parameters

| Name    | Type                   |
| :------ | :--------------------- |
| `input` | `RequestInfo` \| `URL` |
| `init?` | `RequestInit`          |

##### Returns

`Promise`\<`Response`\>

▸ (`input`, `init?`): `Promise`\<`Response`\>

Injectable fetch for tests. Defaults to global fetch.

##### Parameters

| Name    | Type          |
| :------ | :------------ |
| `input` | `RequestInfo` |
| `init?` | `RequestInit` |

##### Returns

`Promise`\<`Response`\>

---

### flushIntervalMs

• `Optional` **flushIntervalMs**: `number`

Interval (ms) between intermediate flushes.

---

### maxBufferBytes

• `Optional` **maxBufferBytes**: `number`

Hard cap (bytes) on the in-memory packet buffer.

---

### sampleRate

• `Optional` **sampleRate**: `number`

Sample rate (Hz) advertised in the recording envelope.

---

### tracks

• `Optional` **tracks**: `("local" | "remote")[]`

Which tracks to record.
