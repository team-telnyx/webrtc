## [3.0.0](https://github.com/team-telnyx/webrtc/compare/4cf5f41bf8beeee69479ee3806b0cde3156e1026...react-client/v3.0.0) (2026-11-04)

Version 2.0.0 was published and withdrawn in 2021, so this release follows 1.0.2 as 3.0.0. The README describes the new lifecycle.

### ⚠ BREAKING CHANGES

- **React 19 required** (#792): the `react` and `react-dom` peers are now `^19.0.0` (previously `>=16.8`). Applications on React 16–18 must upgrade React and React DOM, and for TypeScript `@types/react` and `@types/react-dom`, before updating.
- **`@telnyx/webrtc` 2.27.10 or later required** (#792): the peer range is now `>=2.27.10 <3` (previously `>=2.9.0`).
- **the client is created after mount** (#792): `useTelnyxRTC` returns `undefined` on the first render, and `TelnyxRTCContext` holds `null` until the client exists. Guard client access and subscribe to client events in `useEffect`.
- **unmounting disconnects the client** (#792): unmounting the provider or the hook, or changing the token, login, password or authentication mode, now calls the SDK's `disconnect()` and ends active calls. Previously the old client stayed connected. Keep the provider mounted for as long as calls should stay up.
- **credentials take precedence over `options`** (#792): `login_token`, `login` and `password` from the `credential` argument now override the same fields in `options`; previously `options` won. Other options are read once at mount and reused when credentials change; remount to apply new values.

### Features

- **typed `options`** (#792): `TelnyxRTCProvider` now types `options` as `Partial<IClientOptions>` instead of `any`, and the package uses the SDK's own type declarations instead of a handwritten copy. Fixes #499.
- **`onWarning` in `useCallbacks`** (#792): forwards `telnyx.warning` events, with the SDK's `ITelnyxWarningEvent` type.

### Bug Fixes

- **errors no longer disconnect the client** (#792): `telnyx.error` and `telnyx.socket.error` used to call `disconnect()`, which stopped the SDK's own reconnection and hung up active calls. Errors are now only forwarded to the application, and the SDK handles recovery.
- **`useCallbacks` removes its handlers** (#792): handlers are removed when the component unmounts or a callback changes, so the latest callbacks are always used and earlier ones no longer fire. Each hook removes only its own handlers.
- **startup errors reach subscribers** (#792): the client connects after it is published, so `useCallbacks` and effect subscribers receive errors raised while connecting.
- **StrictMode and aborted renders no longer leak clients** (#792): the client is created in an effect instead of during render, and a disposed client is never reused.

## 1.0.2 (2023-11-17)

### Features

### Upgrade SDK to work with React 18

## [1.0.0](https://github.com/team-telnyx/webrtc/compare/webrtc/v2.2.5...react-client/vnull) (2021-01-06)

### Features

- Generate API docs from TS ([#115](https://github.com/team-telnyx/webrtc/issues/115)) ([66882d2](https://github.com/team-telnyx/webrtc/commit/66882d28f41ec458d6f28d4f54d218e21a780cfd))

## [1.0.0](https://github.com/team-telnyx/webrtc/compare/react-client/v1.0.0...react-client/v1.0.0) (2020-12-11)

### First release features :tada:

- `TelnyxRTCContext` context
- `useCallbacks` and `useTelnyxRTC` hooks
- `Audio` and `Video` components
