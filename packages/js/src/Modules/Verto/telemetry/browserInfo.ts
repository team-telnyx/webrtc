/**
 * Call Report V2: what the browser can tell about the page, the network, the
 * devices and WebRTC itself (owner, 2026-10-06: send everything, filter later).
 *
 * Every reader is defensive: an API the browser lacks gives `undefined`, a
 * reader never throws, and nothing here changes what the page or SDK does.
 */
import type {
  BrowserSupport,
  MediaDeviceEntry,
  PageInfo,
  PeerConfiguration,
  PeerStates,
  PermissionStateName,
  RtpCapabilities,
  RtpCapabilitiesSet,
  RtpCodecInfo,
  RtpEncodingInfo,
  RtpParametersInfo,
} from './payloads';
import { toIceServerInfo } from './sanitize';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

/** Runs a reader; undefined when it throws. */
export function attempt<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

const nav = (): Any =>
  typeof navigator !== 'undefined' ? (navigator as Any) : undefined;
const doc = (): Any =>
  typeof document !== 'undefined' ? (document as Any) : undefined;
const win = (): Any =>
  typeof window !== 'undefined' ? (window as Any) : undefined;

/** navigator.onLine; undefined outside a browser. */
export const onlineNow = (): boolean | undefined =>
  attempt(() => {
    const value = nav()?.onLine;
    return typeof value === 'boolean' ? value : undefined;
  });

/** document.visibilityState; undefined outside a browser. */
export const visibilityNow = (): string | undefined =>
  attempt(() => str(doc()?.visibilityState));

/** document.hasFocus(); undefined outside a browser. */
export const hasFocusNow = (): boolean | undefined =>
  attempt(() => {
    const d = doc();
    return typeof d?.hasFocus === 'function' ? !!d.hasFocus() : undefined;
  });

/** Puts every defined value of `source` on `target`. */
export function assignDefined<T extends object>(
  target: T,
  source: Partial<T>
): T {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) (target as Record<string, unknown>)[key] = value;
  }
  return target;
}

// ── Page ────────────────────────────────────────────────────────────────

export function readPageInfo(): PageInfo {
  const page: PageInfo = {};
  const w = win();
  const d = doc();
  const n = nav();
  const set = <K extends keyof PageInfo>(key: K, read: () => PageInfo[K]) => {
    const value = attempt(read);
    if (value !== undefined && value !== null) page[key] = value;
  };
  set('origin', () => str(w?.location?.origin));
  set('secure_context', () =>
    typeof w?.isSecureContext === 'boolean' ? w.isSecureContext : undefined
  );
  set('cross_origin_isolated', () =>
    typeof w?.crossOriginIsolated === 'boolean'
      ? w.crossOriginIsolated
      : undefined
  );
  set('in_iframe', () => (w ? w.top !== w.self : undefined));
  set('visibility_state', () => str(d?.visibilityState));
  set('has_focus', () =>
    typeof d?.hasFocus === 'function' ? !!d.hasFocus() : undefined
  );
  set('was_discarded', () =>
    typeof d?.wasDiscarded === 'boolean' ? d.wasDiscarded : undefined
  );
  set('prerendering', () =>
    typeof d?.prerendering === 'boolean' ? d.prerendering : undefined
  );
  set('navigation_type', () => {
    const entry =
      typeof performance !== 'undefined' &&
      typeof performance.getEntriesByType === 'function'
        ? (performance.getEntriesByType('navigation')[0] as Any)
        : undefined;
    return str(entry?.type);
  });
  set('page_age_ms', () =>
    typeof performance !== 'undefined' && performance.now
      ? Math.round(performance.now())
      : undefined
  );
  set('language', () => str(n?.language));
  set('languages', () =>
    Array.isArray(n?.languages) ? [...n.languages] : undefined
  );
  set('timezone', () => str(Intl.DateTimeFormat().resolvedOptions().timeZone));
  set('timezone_offset_min', () => new Date().getTimezoneOffset());
  set('screen_width', () => num(w?.screen?.width));
  set('screen_height', () => num(w?.screen?.height));
  set('viewport_width', () => num(w?.innerWidth));
  set('viewport_height', () => num(w?.innerHeight));
  set('device_pixel_ratio', () => num(w?.devicePixelRatio));
  set('color_depth', () => num(w?.screen?.colorDepth));
  set('max_touch_points', () => num(n?.maxTouchPoints));
  set('cookie_enabled', () =>
    typeof n?.cookieEnabled === 'boolean' ? n.cookieEnabled : undefined
  );
  set('webdriver', () =>
    typeof n?.webdriver === 'boolean' ? n.webdriver : undefined
  );
  set('pdf_viewer_enabled', () =>
    typeof n?.pdfViewerEnabled === 'boolean' ? n.pdfViewerEnabled : undefined
  );
  return page;
}

export function readBrowserSupport(): BrowserSupport {
  const w = win() ?? {};
  const n = nav() ?? {};
  const has = (read: () => unknown) => !!attempt(read);
  return {
    rtc_peer_connection: has(() => typeof w.RTCPeerConnection === 'function'),
    get_user_media: has(
      () => typeof n.mediaDevices?.getUserMedia === 'function'
    ),
    get_display_media: has(
      () => typeof n.mediaDevices?.getDisplayMedia === 'function'
    ),
    enumerate_devices: has(
      () => typeof n.mediaDevices?.enumerateDevices === 'function'
    ),
    set_sink_id: has(
      () =>
        typeof w.HTMLMediaElement === 'function' &&
        'setSinkId' in w.HTMLMediaElement.prototype
    ),
    select_audio_output: has(
      () => typeof n.mediaDevices?.selectAudioOutput === 'function'
    ),
    encoded_transform: has(() => typeof w.RTCRtpScriptTransform === 'function'),
    insertable_streams: has(
      () =>
        typeof w.RTCRtpSender === 'function' &&
        'createEncodedStreams' in w.RTCRtpSender.prototype
    ),
    permissions_api: has(() => typeof n.permissions?.query === 'function'),
    web_audio: has(
      () =>
        typeof w.AudioContext === 'function' ||
        typeof w.webkitAudioContext === 'function'
    ),
    network_information: has(() => !!n.connection),
    user_agent_data: has(() => !!n.userAgentData),
  };
}

// ── Devices and permissions ─────────────────────────────────────────────

export function toDeviceEntry(device: Any): MediaDeviceEntry {
  return {
    kind: String(device?.kind ?? ''),
    label: String(device?.label ?? ''),
    device_id: String(device?.deviceId ?? ''),
    group_id: String(device?.groupId ?? ''),
  };
}

/** Every device enumerateDevices() lists; null without the API or on error. */
export async function readDeviceList(): Promise<MediaDeviceEntry[] | null> {
  try {
    const mediaDevices = nav()?.mediaDevices;
    if (typeof mediaDevices?.enumerateDevices !== 'function') return null;
    const devices = await mediaDevices.enumerateDevices();
    return Array.isArray(devices) ? devices.map(toDeviceEntry) : null;
  } catch {
    return null;
  }
}

const PERMISSION_STATES = new Set(['granted', 'denied', 'prompt']);

/** navigator.permissions.query(); undefined where the browser can't say. */
export async function readPermission(
  name: 'microphone' | 'camera'
): Promise<PermissionStateName | undefined> {
  try {
    const permissions = nav()?.permissions;
    if (typeof permissions?.query !== 'function') return undefined;
    const status = await permissions.query({ name });
    return PERMISSION_STATES.has(status?.state)
      ? (status.state as PermissionStateName)
      : undefined;
  } catch {
    return undefined;
  }
}

// ── RTP codecs and parameters ───────────────────────────────────────────

export function toCodecInfo(codec: Any): RtpCodecInfo | undefined {
  const mimeType = str(codec?.mimeType);
  if (!mimeType) return undefined;
  const info: RtpCodecInfo = { mime_type: mimeType };
  assignDefined(info, {
    clock_rate: num(codec.clockRate),
    channels: num(codec.channels),
    payload_type: num(codec.payloadType),
    sdp_fmtp_line: str(codec.sdpFmtpLine),
  });
  return info;
}

const codecList = (codecs: unknown): RtpCodecInfo[] =>
  Array.isArray(codecs)
    ? codecs.map(toCodecInfo).filter((c): c is RtpCodecInfo => !!c)
    : [];

const extensionList = (extensions: unknown): string[] =>
  Array.isArray(extensions)
    ? extensions
        .map((e: Any) => str(e?.uri))
        .filter((uri): uri is string => !!uri)
    : [];

function readCapabilities(
  ctor: Any,
  kind: 'audio' | 'video'
): RtpCapabilities | undefined {
  const caps = attempt(() =>
    typeof ctor?.getCapabilities === 'function'
      ? ctor.getCapabilities(kind)
      : undefined
  );
  if (!caps) return undefined;
  return {
    codecs: codecList(caps.codecs),
    header_extensions: extensionList(caps.headerExtensions),
  };
}

/** RTCRtpSender/RTCRtpReceiver.getCapabilities() for audio and video. */
export function readRtpCapabilities(): RtpCapabilitiesSet | undefined {
  const w = win();
  if (!w) return undefined;
  const set: RtpCapabilitiesSet = {};
  assignDefined(set, {
    audio_send: readCapabilities(w.RTCRtpSender, 'audio'),
    audio_receive: readCapabilities(w.RTCRtpReceiver, 'audio'),
    video_send: readCapabilities(w.RTCRtpSender, 'video'),
    video_receive: readCapabilities(w.RTCRtpReceiver, 'video'),
  });
  return Object.keys(set).length ? set : undefined;
}

function toEncodingInfo(encoding: Any): RtpEncodingInfo {
  const info: RtpEncodingInfo = {};
  assignDefined(info, {
    active: typeof encoding?.active === 'boolean' ? encoding.active : undefined,
    max_bitrate_bps: num(encoding?.maxBitrate),
    priority: str(encoding?.priority),
    network_priority: str(encoding?.networkPriority),
    dtx: str(encoding?.dtx),
    ptime: num(encoding?.ptime),
    rid: str(encoding?.rid),
  });
  return info;
}

/** RTCRtpSender/Receiver.getParameters(), reduced to plain data. */
export function readRtpParameters(
  endpoint: Any
): RtpParametersInfo | undefined {
  const params = attempt(() =>
    typeof endpoint?.getParameters === 'function'
      ? endpoint.getParameters()
      : undefined
  );
  if (!params) return undefined;
  const info: RtpParametersInfo = {};
  const codecs = codecList(params.codecs);
  if (codecs.length) info.codecs = codecs;
  const extensions = extensionList(params.headerExtensions);
  if (extensions.length) info.header_extensions = extensions;
  if (typeof params.rtcp?.reducedSize === 'boolean') {
    info.rtcp_reduced_size = params.rtcp.reducedSize;
  }
  if (Array.isArray(params.encodings) && params.encodings.length) {
    info.encodings = params.encodings.map(toEncodingInfo);
  }
  if (str(params.degradationPreference)) {
    info.degradation_preference = params.degradationPreference;
  }
  return Object.keys(info).length ? info : undefined;
}

// ── Peer connection ─────────────────────────────────────────────────────

export function readPeerStates(pc: Any): PeerStates | undefined {
  if (!pc) return undefined;
  const states: PeerStates = {};
  assignDefined(states, {
    signaling_state: attempt(() => str(pc.signalingState)),
    ice_gathering_state: attempt(() => str(pc.iceGatheringState)),
    ice_connection_state: attempt(() => str(pc.iceConnectionState)),
    connection_state: attempt(() => str(pc.connectionState)),
  });
  return Object.keys(states).length ? states : undefined;
}

/** getConfiguration() without credentials: ICE server URLs only. */
export function readPeerConfiguration(pc: Any): PeerConfiguration | undefined {
  const config = attempt(() =>
    typeof pc?.getConfiguration === 'function'
      ? pc.getConfiguration()
      : undefined
  );
  if (!config) return undefined;
  const info: PeerConfiguration = {};
  if (Array.isArray(config.iceServers)) {
    info.ice_servers = toIceServerInfo(config.iceServers);
  }
  assignDefined(info, {
    ice_transport_policy: str(config.iceTransportPolicy),
    bundle_policy: str(config.bundlePolicy),
    rtcp_mux_policy: str(config.rtcpMuxPolicy),
    ice_candidate_pool_size: num(config.iceCandidatePoolSize),
    sdp_semantics: str(config.sdpSemantics),
  });
  if (Array.isArray(config.certificates) && config.certificates.length) {
    const expires = config.certificates
      .map((c: Any) => num(c?.expires))
      .filter((ms: number | undefined): ms is number => ms !== undefined)
      .map((ms: number) => attempt(() => new Date(ms).toISOString()))
      .filter((iso: string | undefined): iso is string => !!iso);
    if (expires.length) info.certificate_expires = expires;
  }
  return Object.keys(info).length ? info : undefined;
}

/** The media element the app gave: an element or its id (an app function is never called). */
export function resolveMediaElement(tag: unknown): HTMLMediaElement | null {
  try {
    if (!tag) return null;
    if (typeof tag === 'string') {
      const element = doc()?.getElementById?.(tag);
      return element && 'paused' in element ? element : null;
    }
    if (typeof tag === 'object' && 'paused' in (tag as object)) {
      return tag as HTMLMediaElement;
    }
  } catch {
    // ignore
  }
  return null;
}
