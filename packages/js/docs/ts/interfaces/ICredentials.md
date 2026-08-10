SIP Connection credentials for authenticating with the Telnyx backend.

Used when authenticating with a SIP Connection `username` and `password`
instead of a JWT (`login_token`).

## Hierarchy

- **`ICredentials`**

## Table of contents

### Properties

- [password](#password)
- [token](#token)
- [username](#username)

## Properties

### password

• `Optional` **password**: `string`

The `password` to authenticate with your SIP Connection.

---

### token

• `Optional` **token**: `string`

A JWT token for authentication. Alternative to `username`/`password`.

---

### username

• `Optional` **username**: `string`

The `username` to authenticate with your SIP Connection.
