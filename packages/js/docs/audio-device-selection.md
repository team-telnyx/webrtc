# Audio device selection and best practices

This guide explains how to select microphones and speakers with `@telnyx/webrtc`, what your application must manage, and how to diagnose device-related audio problems.

**Source scope:** the SDK behavior below was checked against `main` at revision `dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26`. This is not a release announcement: the package version at that revision remains `2.27.10`, which does not establish that a published npm package includes these changes. Verify that your installed build contains the changes before adopting the examples. Browser behavior still depends on the user's browser, OS, permissions, and hardware; this guide does not claim real-hardware validation.

## Recent behavior changes

- [#793 — microphone-switch fallback](https://github.com/team-telnyx/webrtc/pull/793): active input switching now uses the same capture fallback helper as call setup.
- [#794 — answer-time device options](https://github.com/team-telnyx/webrtc/pull/794): `answer()` can apply per-call input/output selection and audio/video constraints before media initialization, without changing client defaults or other calls.
- [#795 — disconnected-device recovery](https://github.com/team-telnyx/webrtc/pull/795): calls now attempt default-device recovery after a proven removal of the microphone or SDK-managed output actually in use. Successful input switches record the acquired device ID, and speaker setters commit the choice only after routing succeeds. Recovery is best effort, not a guarantee of uninterrupted audio or automatic switching back on reconnect.

## Contents

- [Recommended approach](#recommended-approach)
- [Integration options](#choose-the-integration-that-fits-your-application)
- [Browser prerequisites and permissions](#browser-prerequisites-and-permissions)
- [Device discovery](#discover-devices-without-surprising-the-user)
- [Defaults and saved preferences](#default-devices-explicit-devices-and-saved-preferences)
- [Future calls and outbound calls](#configure-future-calls-and-outbound-calls)
- [Inbound calls and recovery](#inbound-calls-and-recovery)
- [Active microphone switching](#switch-microphones-during-an-active-call)
- [Speakers and playback](#select-speakers-and-manage-playback)
- [Device removal and Bluetooth](#device-removal-bluetooth-and-lifecycle-changes)
- [Errors and call reports](#error-handling-and-troubleshooting)
- [Verification checklist](#integration-verification-checklist)
- [References](#reference-material)

## Recommended approach

For most calling applications:

1. Provide an explicit **Audio settings** step before calling or becoming available for inbound calls. Request microphone access there, list available devices, and let the user test the microphone and speaker.
2. Offer **System default** and explicit device choices. Remember the user's preference, but validate it against the current inventory rather than assuming a saved ID is still valid.
3. Configure the SDK's defaults before calls are created; use per-call options on `newCall()` or `answer()` for the latest selection. Prefer normal SDK capture unless you need custom media, and review the automatic-fallback limitations before promising strict device privacy.
4. Give each concurrent call its own remote audio element. Use one owner for output routing and one owner for microphone changes.
5. Allow deliberate mid-call switching, serialize the operations, preserve mute intent, and verify the result. The SDK already attempts recovery for proven device removal; do not add a competing switch on every device-change notification.
6. Combine structured SDK events with browser-operation results and call-state updates. A connected call or fulfilled Promise alone does not prove that the right microphone is transmitting or that the user can hear the speaker.

Prefer pre-call selection over unnecessary mid-call replacement. A failed **manual** microphone switch can end the local call; it is not a guaranteed rollback-to-the-old-microphone operation. Errors from the SDK's automatic disconnect recovery are exempt from that automatic hangup, but can still leave audio unavailable.

## Choose the integration that fits your application

| Need                                                    | Available option                                                                         | Important limitation                                                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Use the browser/OS microphone choice                    | Leave microphone selection unset; use `audio: true` for a new outbound call              | Acquisition chooses a default; an existing track is not guaranteed to follow later OS changes                 |
| Remember a microphone for future calls                  | `await client.setAudioSettings({ micId })`                                               | Configures future call objects, not an already ringing or active call; can perform device enumeration/capture |
| Remember a speaker for future calls                     | `client.speaker = deviceId`                                                              | Stores a preference; does not validate or immediately route audio                                             |
| Override an outbound call                               | `client.newCall({ micId, speakerId, remoteElement, ... })`                               | SDK capture may fall back to another microphone                                                               |
| Select devices while answering                          | `call.answer({ micId, speakerId, audio, remoteElement, ... })`                           | Applies before media initialization; no `localStream` override; SDK capture may fall back                     |
| Require a particular microphone at outbound acquisition | Native `getUserMedia()` with an exact ID, then `newCall({ localStream, ... })`           | Advanced stream ownership; not an `answer()` override and not a persistent guarantee after recovery           |
| Change an active call's microphone                      | `await call.setAudioInDevice(deviceId)`                                                  | Can skip, fall back, or handle a failure without rejecting; observe events and actual media                   |
| Change an active call's speaker                         | `await call.setAudioOutDevice(deviceId)`                                                 | Check its boolean result; requires an SDK-managed remote element and browser output-routing support           |
| Own output permission/error handling                    | Native `selectAudioOutput()` where available, then `setSinkId()` on the playback element | An SDK `remoteElement` still participates in automatic output recovery                                        |
| Own all remote playback                                 | Read `call.remoteStream` and attach it yourself                                          | Your application owns stream readiness/replacement, autoplay, output routing, and cleanup                     |

Do not mix direct `RTCRtpSender.replaceTrack()` calls with SDK microphone switching. The SDK also manages local streams, mute state, cleanup, and recovery; replacing only the sender track can leave those states inconsistent.

## Browser prerequisites and permissions

Run the calling page over HTTPS. Detect capabilities in the browser rather than enabling controls from a browser-name check:

```js
function audioCapabilities(remoteAudio) {
  const media = navigator.mediaDevices;
  return {
    secureContext: window.isSecureContext,
    capture: typeof media?.getUserMedia === 'function',
    enumerate: typeof media?.enumerateDevices === 'function',
    outputPicker: typeof media?.selectAudioOutput === 'function',
    outputRouting: typeof remoteAudio?.setSinkId === 'function',
    deviceChange: !!media && 'ondevicechange' in media,
  };
}
```

API presence does not grant permission. Treat these as separate gates:

- **Microphone capture:** browser site permission, OS privacy controls, and any embedding policy must allow it.
- **Speaker selection:** non-default outputs may require separate permission. A microphone grant does not authorize arbitrary speakers.
- **Playback:** autoplay restrictions can still prevent sound after microphone access and speaker routing succeed.

If the application is embedded, the parent must permit the required features. For example:

```html
<iframe
  src="https://calls.example"
  allow="microphone; speaker-selection; autoplay"
></iframe>
```

A restrictive ancestor `Permissions-Policy` cannot be overridden by this attribute. These declarations do not grant user consent or guarantee autoplay. Sandboxing must also permit the application's scripts and preserve a usable origin.

Call `selectAudioOutput()` directly from a click/tap handler; it requires transient user activation. Permission queries through `navigator.permissions` are optional diagnostics: unsupported permission names can throw and must not be interpreted as a denial.

On mobile browsers and embedded webviews, expose only the controls supported in that environment. Do not promise that a web page can force the earpiece, loudspeaker, or a particular Bluetooth route. When output routing is unavailable, tell the user to select the output using browser or OS controls.

## Discover devices without surprising the user

### Browser-managed enumeration

The browser can return an incomplete list or blank labels before access is granted. `enumerateDevices()` is also subject to document visibility and permissions policy. An empty list is not proof that the OS has no devices.

The following helper requests microphone access for a settings screen, enumerates while the temporary stream is open, and then releases that stream. Call it from an explicit user action, before starting a call; it is not a live-call polling helper.

```js
async function requestAudioSetup() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access requires a supported secure context.');
  }

  const preview = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      microphones: devices.filter((device) => device.kind === 'audioinput'),
      speakers: devices.filter((device) => device.kind === 'audiooutput'),
    };
  } finally {
    preview.getTracks().forEach((track) => track.stop());
  }
}
```

Catch rejection in the UI and provide permission/device troubleshooting. A permission prompt can remain unanswered indefinitely. Show a waiting state and allow the user to leave the setup flow. An application timeout does not cancel `getUserMedia()`; if an abandoned request later succeeds, stop its tracks and do not apply its result.

For a microphone level test, keep the temporary stream only for the duration of the test, then release it. Do not play local microphone audio back through speakers by default; it can cause feedback. A test tone should use the intended output, and the user should confirm hearing it.

### SDK enumeration helpers

The SDK provides `client.getAudioInDevices()` and `client.getAudioOutDevices()`. In the reviewed source, both acquire and stop a temporary **microphone** stream before enumerating. `client.getDevices()` requests both audio and video, so avoid it for an audio-only settings screen.

Other differences from native enumeration:

- Capture/permission failures can result in an empty array rather than a rejected Promise.
- Results deduplicate devices sharing the same kind and nonempty `groupId`, so the list can differ from native enumeration, including default aliases.
- Repeated calls may reopen capture. Use native `enumerateDevices()` for inventory refresh after permission is available, especially during a call.

Never assume a second list entry exists or choose devices by array position. Display labels when available, keep the associated `deviceId`, and let the user choose.

## Default devices, explicit devices, and saved preferences

Store the user's **intent** separately from the browser's current IDs. For example:

```js
const preference = {
  input: { mode: 'default' },
  output: { mode: 'device', deviceId: 'ID_RETURNED_BY_THIS_BROWSER' },
};
```

This is an application data model, not an SDK option object. Use the following rules when resolving it:

- `deviceId` is origin-scoped, not a hardware serial number. Site-data clearing, privacy settings, a different origin/browser profile, or private browsing can invalidate it.
- Re-enumerate and validate a remembered ID after permissions are available. Do not match solely by a device label: labels can repeat or change.
- For application choices, do not hard-code `default` or `communications` as universal browser IDs. Use aliases exposed by the browser. The SDK's own disconnect recovery attempts `'default'`, but that route is still subject to browser support and can fail.
- If an explicit device is missing, explain that to the user. Offer another device or System default before the call. During a call, the SDK can automatically recover to defaults without another confirmation; do not promise a confirmation-only fallback policy with the standard integration.
- Keep a requested device separate from the **actual** acquired microphone and applied output. Persist a successful choice, not merely the last button click.
- For output-picker restoration, pass a remembered ID to `selectAudioOutput({ deviceId })` when appropriate and use its returned ID. The returned ID may differ from the saved one.

### Input constraints: preference versus requirement

Native browser constraints have different strengths:

| Constraint passed to native `getUserMedia()` | Meaning                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `audio: true`                                | Browser-selected audio input                      |
| `audio: { deviceId: { ideal: id } }`         | Prefer this input, but allow another              |
| `audio: { deviceId: { exact: id } }`         | Require this input for this acquisition or reject |

**The SDK adds fallback behavior on top of the browser.** Its capture helper can retry once without device-ID constraints after `NotReadableError`, `NotFoundError`, or `OverconstrainedError`, but not `NotAllowedError` (permission denial). This applies to SDK-managed call setup, including `answer()`, and `setAudioInDevice()`. An exact constraint inside SDK options therefore does not guarantee “this microphone or no capture.” A missing `micId` lookup can also leave capture unconstrained.

For SDK-managed capture, inspect the local audio track's `getSettings().deviceId` where exposed, handling missing settings or exceptions. At setup, `call.options.micId` is a requested setting; after a successful input switch, the SDK updates it to the acquired track's device ID or `'default'` when unavailable. That fallback value is not proof of physical identity. Keep user preference and actual media separate.

If allowing an unintended input would violate your product's privacy requirement, do not rely on a post-capture check as prevention. Native exact acquisition below controls only the initial outbound stream. **There is no public opt-out for automatic input disconnect recovery in the reviewed source**, including when an initial stream was supplied by the application. Agree on a supported end-to-end solution with Telnyx before promising “this microphone or no capture” throughout a call.

## Configure future calls and outbound calls

The snippets below assume an existing `client`, device IDs chosen from current browser results, and a mounted `<audio>` element. They are integration examples, not a full authentication or call-controller implementation. Register call-state/error listeners before connecting or placing calls.

### Client defaults

Run this setup before calling `client.connect()` or otherwise allowing incoming calls to be created:

```js
async function configureFutureCalls(client, microphoneId, speakerId) {
  // An empty settings object clears the stored mic ID/label and constraints.
  await client.setAudioSettings(microphoneId ? { micId: microphoneId } : {});
  client.speaker = speakerId || '';
}
```

`setAudioSettings()` replaces the stored audio constraints rather than patching them. Include all constraints you intend to retain on each update. It does not change an existing call's microphone, and `client.speaker` does not change an existing call's output. Clearing the speaker preference does not reset a reused element that already has a non-default native `sinkId`; reset that element explicitly or create a new per-call element.

Do not set both a conflicting `micId` and `audio.deviceId`: a successfully resolved `micId` takes precedence during SDK capture. When overriding an inherited microphone ID, also pass `micLabel: ''` to clear its old label. Device lookup uses the first ID-or-label match, so a stale label can select the old microphone before the requested ID is reached. The same rule applies to `camId`/`camLabel`; prefer current IDs over labels.

### Per-call outbound selection

```js
function startOutboundCall(
  client,
  destinationNumber,
  microphoneId,
  speakerId,
  remoteAudio
) {
  return client.newCall({
    destinationNumber,
    audio: true,
    video: false,
    micId: microphoneId || '',
    micLabel: '',
    speakerId: speakerId || '',
    remoteElement: remoteAudio,
  });
}
```

Here, an empty `micId` overrides an inherited microphone ID and `audio: true` requests browser-default input. An empty `speakerId` suppresses initial SDK sink selection, so use a fresh or explicitly reset audio element for default output. It does not disable automatic output recovery once the call is active.

`newCall()` returns a call object synchronously. Catch synchronous validation errors, but use `telnyx.notification` call updates and `telnyx.error` to observe asynchronous setup. Do not treat the returned object as proof that capture succeeded.

For outgoing calls that need processing constraints, use `audio: { echoCancellation: true, noiseSuppression: true, ... }` instead of `audio: true`. Feature support and effective settings vary; inspect the track's `getSettings()`. Do not assume these preferences carry through the active-switch API.

### Advanced: strict outbound acquisition or a custom stream

If the application must obtain a particular microphone before creating the outbound call, acquire it through the **native browser API**, validate it, and pass the stream to the SDK:

```js
async function startWithExactMicrophone(
  client,
  destinationNumber,
  microphoneId,
  remoteAudio
) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: microphoneId } },
    video: false,
  });

  try {
    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState !== 'live') {
      throw new Error('The selected microphone did not provide a live track.');
    }
    return client.newCall({
      destinationNumber,
      audio: true,
      video: false,
      localStream: stream,
      remoteElement: remoteAudio,
    });
  } catch (error) {
    // Covers validation/synchronous newCall failures before handoff.
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}
```

Do not retry this native acquisition with `audio: true` unless fallback is explicitly allowed. Manage pending/abandoned requests as described in the setup section, and observe SDK events for asynchronous failures after `newCall()` returns.

A supplied `localStream` bypasses SDK acquisition constraints. Treat its tracks as dedicated to this call: the SDK can mute them, stop old audio tracks during switching, and stop tracks during call cleanup. Do not hand the same tracks to another call or a preview that must outlive this call. A custom processed stream also needs application cleanup for its source tracks and audio graph, which the SDK may not own.

This approach controls **initial outbound acquisition only**. It does not opt out of automatic input disconnect recovery: if the SDK can identify the supplied stream's sending device and prove its removal, it can replace that audio with a default microphone. Custom/processed tracks without usable device identity may not be recoverable; do not depend on that uncertainty as a privacy control. Neither manual switching, inbound answering, nor reattached call objects gains a strict-input guarantee from this example.

## Inbound calls and recovery

Inbound calls inherit client device defaults when their call objects are constructed, before your application receives the ringing notification. Configure sensible defaults before becoming available for calls, then pass the latest per-call selection to `answer()` if it changed while ringing.

```js
async function answerIncomingCall(call, microphoneId, speakerId, remoteAudio) {
  await call.answer({
    micId: microphoneId, // undefined retains this call's inherited choice.
    micLabel: microphoneId === undefined ? undefined : '',
    speakerId: speakerId,
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false,
    remoteElement: remoteAudio,
  });
  // Observe call updates and errors; fulfillment alone is not media readiness.
}
```

In the reviewed source:

- Supported answer options are `micId`, `micLabel`, `speakerId`, `camId`, `camLabel`, `audio`, `video`, `localElement`, `remoteElement`, and `customHeaders`. Device/media overrides are applied before peer initialization and capture. They are call-local; they do not mutate session defaults or another call's constraints.
- Omitted or explicitly `undefined` overrides retain that call's existing options. Explicit `audio: false` and `video: false` remain disabled for SDK acquisition even with inherited device IDs. Constraint objects replace the corresponding call option; include all constraints you need rather than assuming a deep merge.
- Updating client defaults while a call is already ringing still does not update that call object. Use answer-time overrides, not private-field mutation or a needless post-answer switch. Answer only once; `answer()` is not an active-call device setter.
- Inbound construction still sets `audio: true`. A client `micId` participates in selection, but client audio-processing constraints do not automatically carry into that path. Supply `audio` explicitly to `answer()` when you need those preferences, as above.
- `localStream` is **not** an `AnswerParams` field. A valid stream already present on the call is reused without recapture; new device/constraint options do not replace that existing stream. Camera/video options use existing negotiation and do not add video to an audio-only offer.
- SDK answer-time capture uses the same device lookup and fallback path as outbound setup. Resolving `micId` can open and stop a temporary default microphone stream for permission/discovery before acquiring the call stream, and call capture can fall back to another microphone. For a default input instead of an inherited ID, pass `micId: ''` with `audio: true`; `speakerId: ''` suppresses initial SDK sink selection but does not reset a reused element's sink or disable automatic recovery.

**Signaling reattachment is separate from device-disconnect recovery.** It can create a replacement call object. Do not assume per-call microphone, speaker, custom constraints, or a supplied stream survive unchanged. Keep application preferences, follow the current call object, and reconcile actual media after recovery.

Do not recreate the entire `TelnyxRTC` client simply to switch devices. Client recreation can interfere with call ownership and signaling recovery.

## Switch microphones during an active call

Use `call.setAudioInDevice(deviceId)` only after the call has established local audio media. Disable the selector while a manual switch is pending and while the call is ending or reattaching. Serialize manual device changes through one controller; use SDK mute/unmute methods to maintain mute intent.

Omitting the second argument preserves the **latest** SDK desired mute state, including changes made while capture or `replaceTrack()` is pending. An explicit boolean commits that requested mute state only after capture and replacement succeed. `call.isAudioMuted` is a boolean getter, not a method. Do not pass `false` unconditionally: that requests an unmuted replacement track even if the user muted while the switch was pending.

The following helper detects some failed/skipped operations; the application still needs call-state/error handling and a single-operation guard:

```js
async function switchActiveMicrophone(call, deviceId) {
  const previous = call.localStream?.getAudioTracks()[0];
  if (call.state !== 'active' || previous?.readyState !== 'live') {
    throw new Error(
      'Wait for active local audio before switching microphones.'
    );
  }

  await call.setAudioInDevice(deviceId);

  const current = call.localStream?.getAudioTracks()[0];
  if (
    call.state !== 'active' ||
    !current ||
    current === previous ||
    current.readyState !== 'live'
  ) {
    throw new Error(
      'Microphone replacement was not confirmed. Check call events.'
    );
  }

  let actualDeviceId;
  try {
    actualDeviceId = current.getSettings?.()?.deviceId;
  } catch {
    // Metadata can be unavailable even after a successful replacement.
  }
  return {
    requestedDeviceId: deviceId,
    actualDeviceId,
    desiredMuted: call.isAudioMuted,
    enabled: current.enabled,
  };
}
```

Only update the UI's applied selection after checking the returned actual device where available and processing any accompanying error/state updates. A different ID can indicate SDK fallback; browser default aliases may also resolve to a physical ID. If identity cannot be confirmed, show that uncertainty rather than claiming the exact device is selected.

Current limitations to account for:

- The return type is `Promise<void>`, not a success boolean. A missing peer connection, terminating call, or missing audio sender can cause a skipped operation. For a missing sender, diagnostic warning `33009` (`AUDIO_INPUT_DEVICE_CHANGE_SKIPPED`) is emitted at call scope; do not make a session-level `client.on('telnyx.warning')` listener your only confirmation path.
- Final capture failure (including a failed fallback) or `replaceTrack()` failure in a **manual** switch is handled through `telnyx.error` without necessarily rejecting this Promise, and initiates local call teardown. Do not assume the old microphone/call will remain usable. Automatic disconnect recovery has a narrower non-hangup exception, described below.
- On success, `call.options.micId` becomes the acquired track's device ID or `'default'` if unavailable. If reading settings throws, diagnostic `42004` (`UNABLE_READ_AUDIO_INPUT_ON_DEVICE_CHANGE`) is nonfatal and written through `logger.warn` only, not `telnyx.error` or `telnyx.warning`. The replacement remains applied.
- The method requests the new device without merging the previous custom audio-processing constraints. Verify effective settings again after switching.
- Concurrent manual switches can race; an explicit mute argument can also override a newer mute choice. Do not launch multiple operations from rapidly changing dropdowns or add competing recovery switches on every device notification.
- Switching may cause a short interruption. Automatic recovery after a proven removal is best effort; do not promise gapless audio or successful recovery on all hardware.

## Select speakers and manage playback

### SDK-managed output routing

Pass a real, mounted remote element through `newCall()` or `answer()`. For overlapping calls, use a distinct element per call, including calls on hold or recovering.

```js
async function switchCallSpeaker(call, deviceId) {
  const applied = await call.setAudioOutDevice(deviceId);
  if (!applied) {
    throw new Error(
      'Speaker routing was not applied. Check support, permission, and the playback element.'
    );
  }
}
```

Use this with a nonempty ID obtained from the browser. The method updates `call.options.speakerId` only after routing succeeds; failure leaves that option unchanged. A construction/answer-time preference or a stored option alone is still not proof of current routing or audibility: check the result and the element's actual `sinkId` where available. Unsupported routing, missing elements, terminating calls, and native sink errors can return `false` without emitting a structured SDK error.

A nonempty stored `speakerId` is applied asynchronously on transitions to active, including initial activation and unhold, and that routing result is not returned to the caller. For UI confirmation, explicitly await `setAudioOutDevice()` when the element/call is ready and check the boolean.

**Reset-to-default caveat:** native `remoteAudio.setSinkId('')` requests default output, but `call.setAudioOutDevice('')` returns `false` without performing that reset in the reviewed SDK. Do not present these operations as equivalent. If the browser exposes a nonempty default alias, it can be passed to the SDK; otherwise use an application-owned native routing policy for default/reset support.

### Application-owned sink routing

Use native routing when you need the browser output picker, the underlying error details, or native reset-to-default semantics. **Calling native `setSinkId()` on an element also configured as the SDK's `remoteElement` does not give exclusive routing control.** A nonempty stored SDK `speakerId` can overwrite the native choice on a later transition to active, such as unhold, even without device removal. The SDK also observes that element's actual `sinkId`, even without a nonempty SDK speaker preference, and may route it to `'default'` after a proven removal.

To own output recovery completely, attach `call.remoteStream` to an application-owned element that is **not exposed as the call's SDK `remoteElement`**. Ensure no inherited client/call `remoteElement` remains configured; merely omitting an answer override retains the inherited value. Own stream attachment, autoplay, routing, and cleanup, and apply that policy to every new/reattached call. Do not concurrently use SDK sink setters for the same playback path.

This helper must be invoked directly by the user's output-selection click handler, with its rejection caught by the UI:

```js
async function chooseOutput(remoteAudio) {
  if (typeof remoteAudio.setSinkId !== 'function') {
    throw new Error('Choose the speaker in your browser or OS audio settings.');
  }
  if (typeof navigator.mediaDevices?.selectAudioOutput !== 'function') {
    throw new Error(
      'The browser output picker is unavailable. Use the permitted device list or OS settings.'
    );
  }

  const device = await navigator.mediaDevices.selectAudioOutput();
  await remoteAudio.setSinkId(device.deviceId);
  return device; // Save/display only after routing succeeds.
}

async function useDefaultOutput(remoteAudio) {
  if (typeof remoteAudio.setSinkId !== 'function') {
    throw new Error('Use browser or OS settings to select the default output.');
  }
  await remoteAudio.setSinkId('');
}
```

`selectAudioOutput()` grants/selects an output; it does not route the element by itself. When `setSinkId()` exists but the picker does not, your application can present currently enumerated/permitted outputs and try `setSinkId(chosenId)`, catching rejection. Do not require the picker merely to use a permitted output.

Sink changes apply to that element only. Route ringtone, ringback, preview/test audio, and each call separately if your application requires them to use the same device. Do not assume changing call output changes every audio source.

### Autoplay and application-owned streams

Regardless of routing, handle playback failure and offer an **Enable audio** button that calls `remoteAudio.play()` from a user gesture. Catch the rejected Promise. Inspect the element's `paused`, `muted`, and `volume` state as well as the OS output/volume.

If you attach `call.remoteStream` yourself, ensure SDK-managed attachment is not configured for that call, including through inherited defaults. Wait until the live call exposes a stream, update the element when that stream is replaced, and call `play()` with error handling. A stream might not exist at the first call notification. On teardown, clear only the stream owned by that call; do not clear another call's element or stop SDK-owned remote tracks indiscriminately.

An element can remain in a playing state after its selected speaker disappears while producing no audible output. Successful sink selection or `paused === false` does not prove audibility.

## Device removal, Bluetooth, and lifecycle changes

### What the SDK now recovers

When a call first becomes active, the SDK starts a call-local device-change listener. The same listener remains through hold/unhold and is removed during teardown. It compares usable inventories with the **actual audio sender track settings** and the **actual `sinkId` of the SDK `remoteElement`**, not simply requested `micId`/`speakerId` options.

- **Removed microphone:** it attempts an internal replacement using the default microphone, preserving the latest desired mute state and existing video tracks. This uses the shared capture fallback helper.
- **Removed speaker:** it attempts `call.setAudioOutDevice('default')`. Output recovery does not recapture the microphone or video. It requires a discoverable SDK remote element and supported browser sink routing; the nonempty `'default'` route can still fail.
- **Conservative detection:** empty, redacted, alias-only, or missing-entire-kind inventories are not treated as proof of removal for that kind. For default/communications aliases, the SDK uses `groupId` to identify a unique physical device; ambiguous identity is left alone. Unavailable/throwing track settings can prevent input recovery.
- **No preference chasing:** unrelated additions/removals, OS default changes without removal of the bound device, and reconnecting a headset do not trigger switching to a new preference or switching back. The browser/OS may independently change its own route.
- **Bounded attempts:** bursts of `devicechange` are coalesced and stale scans discarded. A failed recovery is not retried on every event for the same track/sink binding; a new actual binding can establish a new recovery candidate.

Input recovery errors still reach `telnyx.error`, but errors originating specifically from this internal hot-plug replacement do **not** trigger the SDK's normal media-error hangup. Their existing error codes may still carry `fatal: true`; do not equate that flag alone with an already-ended call. Unrelated media errors and failed manual switches retain normal teardown behavior. Output recovery failures are logged and may return `false` without a structured error. In all cases, surviving signaling does not prove recovered audio.

### What the application still owns

1. Listen for `devicechange` to **refresh the UI inventory**, not to launch a competing fallback. Also refresh when settings opens or the page becomes visible, debounce bursts, and retain a manual Refresh control.
2. Display the confirmed input/output separately from the saved preference. If recovery selects a default, explain the change; do not silently overwrite the user's preferred headset or automatically switch back when it reconnects.
3. If audio remains unavailable or identity cannot be determined, show a prompt such as “Your headset is unavailable. Check the current audio devices or choose another device.” Do not treat a limited enumeration result as proof of unplugging.
4. Account for privacy **before** enabling this integration: automatic defaults can capture an unexpected microphone or move private audio to speakers without confirmation. The reviewed SDK exposes no public disconnect-recovery opt-out. Native exact initial input does not disable input recovery; native sink changes on an SDK remote element do not disable output recovery. Use application-owned playback for output-policy control and agree on a supported solution for strict input/custom-stream requirements.
5. Verify the current track, mute intent, actual sink, playback, and audio in both directions after a change. Do not retry failed manual switches in a loop or restart a call without user intent.

Recovery is **best effort**: it depends on browser device-change delivery, usable device identity/inventories, capture permissions, and output-routing support. It is not hardware-guaranteed failover. Keep browser/OS routing instructions and user-driven troubleshooting available.

For Bluetooth, test the headset with its microphone active. Some systems switch to a bidirectional Bluetooth audio mode with lower playback quality; a music-only speaker test does not reproduce that condition. Headset input and output can appear as separate devices, and device IDs are not interchangeable between them.

Also test unplug/replug, Bluetooth reconnect, OS default changes, browser background/foreground transitions, and recovery on real target hardware. Treat track `enabled` (application transmission control), `muted` (source temporarily unable to provide media), and `readyState` (`live`/`ended`) as different signals. None alone proves that speech is reaching the far end.

## Error handling and troubleshooting

Use the [structured error-handling guide](https://developers.telnyx.com/docs/development/webrtc/js-sdk/how-to/error-handling) for the event contract. Register listeners before starting operations and remove application listeners when their controller is disposed.

For `telnyx.error`, inspect `event.error`, not an assumed top-level `code`. Check `isMediaRecoveryErrorEvent(event)` first: when configured with `mediaPermissionsRecovery.enabled`, the inbound-answer permission recovery flow provides `resume()`, `reject()`, and a deadline. Present a retry/cancel UI and use those callbacks; do not repeatedly call `answer()` or assume this flow covers outbound setup or mid-call switching. This permission flow is separate from automatic device-disconnect recovery. Otherwise use the error code, operation context, and the call's state together: `event.error.fatal` can remain true for an internal disconnect-recovery error that does not automatically hang up.

| Symptom or result                                           | Check                                                                            | Recommended response                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `42001` / native `NotAllowedError`                          | Site permission, OS privacy, HTTPS and iframe policy                             | Explain the blocked access; retry only after the user resolves it                                                              |
| `42002` / native `NotFoundError` or `OverconstrainedError`  | Current inventory and the failed constraint, if provided                         | Ask for an available device or relax the specific constraint under the chosen fallback policy                                  |
| `42003` / other capture error, including `NotReadableError` | Underlying browser exception, OS/device availability and possible contention     | Show a capture failure; avoid assuming this is always permission denial                                                        |
| `42004` in SDK logs after input replacement                 | Reading the new track's settings failed                                          | Nonfatal metadata diagnostic, not an error/warning event; show unknown device identity rather than assuming replacement failed |
| Microphone switch resolves but nothing changes              | Local track identity/settings, call state and errors                             | Do not mark it successful; it may have skipped or failed                                                                       |
| Speaker switch returns `false`                              | Actual remote element, API support, output permission, current device ID         | Keep the last confirmed UI state, explain failure, and offer OS routing when needed                                            |
| `play()` rejects with `NotAllowedError`                     | Autoplay policy and user activation                                              | Show an Enable audio button; do not re-register or recreate the call                                                           |
| Far end cannot hear the user                                | Desired mute, current microphone track/settings and level, outbound RTP progress | Separate capture problems from transmission/network problems                                                                   |
| User cannot hear the far end                                | Inbound RTP progress, remote stream attachment, playback and selected output     | Separate missing remote media from local speaker/playback problems                                                             |

Warnings are not all terminal failures. `telnyx.ready` means signaling is ready, not that devices were tested. Use `telnyx.notification` with `type: 'callUpdate'` to follow the current call object and terminal states, including failures that an individual method handled internally.

### Call reports and a useful support bundle

Use the [Voice SDK call-report API](https://developers.telnyx.com/api-reference/voice-sdk-stats/retrieve-voice-sdk-call-reports-by-call-id) from your backend:

```http
GET https://api.telnyx.com/v2/voice_sdk_call_reports/{call_id}
Authorization: Bearer <SERVER_SIDE_TELNYX_API_KEY>
```

Use the SDK WebRTC call ID (`call.id`), not a phone number, SIP Call-ID, or call-control identifier. Authentication determines the owning user; there is no user-ID request parameter. Keep the Telnyx API key out of browser code and enforce your application's authorization before exposing reports.

The endpoint returns an array of raw report payloads. Preserve multiple reports/segments and their session/timestamp provenance; fields vary by SDK/platform, and `stats`/`logs` can have compatibility shapes. A `404` means no report was found for that authenticated user and call ID, not that no call occurred. Device failures before call creation may have no call ID/report, so retain sanitized application-side setup errors too.

For a device issue, collect:

- UTC timestamp, call ID and available session IDs, SDK version, browser/OS version, and whether the page is embedded.
- The user's action and whether the device choice was default or explicit; requested versus actual input and the output-routing result.
- Structured error/warning codes, relevant SDK logs (including logger-only diagnostics), and the native exception name/failed constraint, when available.
- Track state, SDK mute intent, element playback state, and the device-change timeline.
- The call report and directional RTP progress around the symptom, if available.

A microphone level proves local activity, not remote receipt. Outbound packets do not prove that the remote user heard speech, and inbound packets do not prove that the local speaker played them. Keep capture, transport, and playback evidence separate.

Device IDs/labels, network details, logs, and reports can contain sensitive information. Collect only what support needs, use access-controlled channels, and do not include credentials or recordings by default.

## Integration verification checklist

Test the exact SDK/browser/OS combinations you intend to support:

- First visit, granted/denied/revoked permission, an unanswered prompt, and an embedded page with/without the required policy.
- Default and explicit input/output, one-device and no-device lists, blank labels, stale saved IDs, and a cleared browser profile.
- Outbound setup and inbound answering separately, including answer-time device/processing overrides while ringing, omitted/`undefined` options retaining call defaults, explicit `false`, and isolation from client defaults/other calls. Verify reuse of a valid existing stream rather than assuming `answer()` accepts `localStream`.
- A successful mid-call microphone switch both muted and unmuted; mute/unmute during pending capture and replacement; explicit mute arguments; rapid repeated clicks; final acquisition/replacement failures and manual-switch teardown.
- SDK fallback after `NotFoundError`, `NotReadableError`, or `OverconstrainedError`; no fallback after `NotAllowedError`; actual-device bookkeeping and missing/throwing settings (`42004` in logs only). Native exact outbound acquisition must reject a missing device, but does not prevent later automatic default-input recovery.
- Speaker routing returning `false`, native routing rejection, default-output reset, unavailable picker/routing APIs, and blocked autoplay.
- Removal of the actual input, actual output, and both headset devices; muted recovery; no input recapture for output-only loss; failed automatic recovery without SDK hangup or endless retries. Verify sound, not just call state.
- Default/communications aliases with clear and ambiguous identity; empty/redacted/alias-only inventories and a missing entire device kind; unrelated additions/removals; event bursts; and teardown during pending recovery.
- Headset unplug/replug with no SDK switch-back, Bluetooth mode changes with the microphone active, OS default changes without removal, and background/foreground transitions.
- Native routing on an SDK `remoteElement` still participating in recovery versus fully application-owned playback; privacy behavior when a default is selected; custom input streams and their recovery limitations.
- Overlapping calls/held calls with separate elements, one listener across hold/unhold, reattached call objects, and cleanup without affecting another call or preview.
- User-confirmed audio in both directions, with call IDs and timestamps for report correlation.

Do not interpret a passing signaling test, mocked `replaceTrack()`, or a populated settings dropdown as hardware validation.

## Reference material

### SDK source for the reviewed behavior

These links pin the implementation used for this guide rather than tracking a moving branch:

- [Client defaults and enumeration APIs](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/BrowserSession.ts).
- [Capture fallback, enumeration, and constraint resolution](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/webrtc/helpers.ts).
- [Call construction, answering, input switching, mute state, and media errors](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/webrtc/BaseCall.ts).
- [Supported answer options](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/webrtc/interfaces.ts) and [automatic device-disconnect detection and recovery](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/webrtc/MediaDeviceCollector.ts).
- [Speaker-switch return value](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/webrtc/Call.ts) and [native sink wrapper](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/util/webrtc/index.ts).
- [Inbound and recovered call construction](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/webrtc/VertoHandler.ts) and [supplied local-stream handling](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/webrtc/Peer.ts).
- Regression tests for [answer-time options](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/tests/webrtc/AnswerMediaOptions.test.ts), [input-switch fallback](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/tests/webrtc/AudioInputDeviceFallback.test.ts), and [disconnect recovery](https://github.com/team-telnyx/webrtc/blob/dbdd73e5f676c6a2abeaf7b8b53d0d0a44085f26/packages/js/src/Modules/Verto/tests/webrtc/AudioDeviceDisconnect.test.ts). These use mocked browser/media boundaries, not physical headsets.

### Browser API contracts

- MDN: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [enumerateDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices), and [device IDs](https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo/deviceId).
- MDN: [selectAudioOutput](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/selectAudioOutput), [setSinkId](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId), and [speaker-selection policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/speaker-selection).
- MDN: [devicechange](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/devicechange_event), [replaceTrack](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack), and [autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- W3C: [behavior when a selected sink becomes unavailable](https://w3c.github.io/mediacapture-output/#algorithms-sink-unavailable).
- Apple: [Bluetooth headphone sound quality when the microphone is active](https://support.apple.com/en-us/102217).
