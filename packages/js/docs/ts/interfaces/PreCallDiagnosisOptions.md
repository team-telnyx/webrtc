Interface representing the options for the pre-call diagnosis.

**`Inline`**

## Table of contents

### Properties

- [credentials](/development/webrtc/js-sdk/interfaces/PreCallDiagnosisOptions.md#credentials)
- [texMLApplicationNumber](/development/webrtc/js-sdk/interfaces/PreCallDiagnosisOptions.md#texmlapplicationnumber)

## Properties

### credentials

• **credentials**: `Object`

The credentials for authentication.
Can include either login and password or a login token.

#### Type declaration

| Name          | Type     | Description         |
| :------------ | :------- | :------------------ |
| `login?`      | `string` | The login username. |
| `loginToken?` | `string` | The login token.    |
| `password?`   | `string` | The login password. |

---

### texMLApplicationNumber

• **texMLApplicationNumber**: `string`

The application number for the TexML service.
