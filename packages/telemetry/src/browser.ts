/**
 * What the browser tells about itself, the page, devices and WebRTC (owner,
 * 2026-10-06: send everything). Every reader is defensive and never throws;
 * an API the browser lacks gives undefined.
 */
import type { ClientInfo } from './contract';
import {
  attempt,
  bool,
  defined,
  num,
  str,
  toIceServerInfo,
  type Any,
  type Flat,
} from './sanitize';

const nav = (): Any =>
  typeof navigator !== 'undefined' ? navigator : undefined;
const doc = (): Any => (typeof document !== 'undefined' ? document : undefined);
const win = (): Any => (typeof window !== 'undefined' ? window : undefined);
const nonEmpty = (info: Flat) => (Object.keys(info).length ? info : undefined);

export const onlineNow = () => attempt(() => bool(nav()?.onLine));
export const visibilityNow = () => attempt(() => str(doc()?.visibilityState));
export const hasFocusNow = (): boolean | undefined =>
  attempt(() =>
    typeof doc()?.hasFocus === 'function' ? !!doc().hasFocus() : undefined
  );

/** Runs each reader; one that throws or gives undefined/null leaves its key out. */
function readAll(readers: Record<string, () => unknown>): Flat {
  const result: Flat = {};
  for (const [key, read] of Object.entries(readers)) {
    const value = attempt(read);
    if (value !== undefined && value !== null) result[key] = value;
  }
  return result;
}

export function readPageInfo(): Flat {
  const [w, d, n] = [win(), doc(), nav()];
  return readAll({
    origin: () => str(w?.location?.origin),
    secure_context: () => bool(w?.isSecureContext),
    cross_origin_isolated: () => bool(w?.crossOriginIsolated),
    in_iframe: () => (w ? w.top !== w.self : undefined),
    visibility_state: () => str(d?.visibilityState),
    has_focus: hasFocusNow,
    was_discarded: () => bool(d?.wasDiscarded),
    prerendering: () => bool(d?.prerendering),
    navigation_type: () =>
      str((performance.getEntriesByType?.('navigation')[0] as Any)?.type),
    page_age_ms: () =>
      performance.now ? Math.round(performance.now()) : undefined,
    language: () => str(n?.language),
    languages: () =>
      Array.isArray(n?.languages) ? [...n.languages] : undefined,
    timezone: () => str(Intl.DateTimeFormat().resolvedOptions().timeZone),
    timezone_offset_min: () => new Date().getTimezoneOffset(),
    screen_width: () => num(w?.screen?.width),
    screen_height: () => num(w?.screen?.height),
    viewport_width: () => num(w?.innerWidth),
    viewport_height: () => num(w?.innerHeight),
    device_pixel_ratio: () => num(w?.devicePixelRatio),
    color_depth: () => num(w?.screen?.colorDepth),
    max_touch_points: () => num(n?.maxTouchPoints),
    cookie_enabled: () => bool(n?.cookieEnabled),
    webdriver: () => bool(n?.webdriver),
    pdf_viewer_enabled: () => bool(n?.pdfViewerEnabled),
  });
}

/** Feature detection: true = the API exists. */
export function readBrowserSupport(): Record<string, boolean> {
  const w = win() ?? {};
  const n = nav() ?? {};
  const fn = (value: unknown) => typeof value === 'function';
  const has = (owner: Any, method: string) =>
    fn(owner) && method in owner.prototype;
  const checks: Record<string, () => unknown> = {
    rtc_peer_connection: () => fn(w.RTCPeerConnection),
    get_user_media: () => fn(n.mediaDevices?.getUserMedia),
    get_display_media: () => fn(n.mediaDevices?.getDisplayMedia),
    enumerate_devices: () => fn(n.mediaDevices?.enumerateDevices),
    set_sink_id: () => has(w.HTMLMediaElement, 'setSinkId'),
    select_audio_output: () => fn(n.mediaDevices?.selectAudioOutput),
    encoded_transform: () => fn(w.RTCRtpScriptTransform),
    insertable_streams: () => has(w.RTCRtpSender, 'createEncodedStreams'),
    permissions_api: () => fn(n.permissions?.query),
    web_audio: () => fn(w.AudioContext) || fn(w.webkitAudioContext),
    network_information: () => !!n.connection,
    user_agent_data: () => !!n.userAgentData,
  };
  const support: Record<string, boolean> = {};
  for (const [key, check] of Object.entries(checks))
    support[key] = !!attempt(check);
  return support;
}

export type DeviceEntry = {
  kind: string;
  label: string;
  device_id: string;
  group_id: string;
};

/** Every device enumerateDevices() lists; null without the API or on error. */
export async function readDeviceList(): Promise<DeviceEntry[] | null> {
  try {
    const devices = await nav().mediaDevices.enumerateDevices();
    return Array.isArray(devices)
      ? devices.map((d: Any) => ({
          kind: String(d?.kind ?? ''),
          label: String(d?.label ?? ''),
          device_id: String(d?.deviceId ?? ''),
          group_id: String(d?.groupId ?? ''),
        }))
      : null;
  } catch {
    return null;
  }
}

export async function readPermission(
  name: 'microphone' | 'camera'
): Promise<string | undefined> {
  try {
    const { state } = await nav().permissions.query({ name });
    return ['granted', 'denied', 'prompt'].includes(state) ? state : undefined;
  } catch {
    return undefined;
  }
}

const codecList = (codecs: unknown): Flat[] =>
  (Array.isArray(codecs) ? codecs : [])
    .filter((codec) => str(codec?.mimeType))
    .map((codec) => ({
      mime_type: codec.mimeType,
      ...defined({
        clock_rate: num(codec.clockRate),
        channels: num(codec.channels),
        payload_type: num(codec.payloadType),
        sdp_fmtp_line: str(codec.sdpFmtpLine),
      }),
    }));

const extensionList = (extensions: unknown): string[] =>
  (Array.isArray(extensions) ? extensions : [])
    .map((e) => str(e?.uri))
    .filter(Boolean);

/** RTCRtpSender/RTCRtpReceiver.getCapabilities() for audio and video. */
export function readRtpCapabilities(): Flat | undefined {
  const w = win();
  if (!w) return undefined;
  const read = (ctor: Any, kind: string) => {
    const caps = attempt(() => ctor?.getCapabilities?.(kind));
    return caps
      ? {
          codecs: codecList(caps.codecs),
          header_extensions: extensionList(caps.headerExtensions),
        }
      : undefined;
  };
  return nonEmpty(
    defined({
      audio_send: read(w.RTCRtpSender, 'audio'),
      audio_receive: read(w.RTCRtpReceiver, 'audio'),
      video_send: read(w.RTCRtpSender, 'video'),
      video_receive: read(w.RTCRtpReceiver, 'video'),
    })
  );
}

const nonEmptyList = <T>(list: T[]) => (list.length ? list : undefined);

/** RTCRtpSender/Receiver.getParameters(), as plain data. */
export function readRtpParameters(endpoint: Any): Flat | undefined {
  const params = attempt(() => endpoint?.getParameters?.());
  if (!params) return undefined;
  const encodings: Any[] = Array.isArray(params.encodings)
    ? params.encodings
    : [];
  return nonEmpty(
    defined({
      codecs: nonEmptyList(codecList(params.codecs)),
      header_extensions: nonEmptyList(extensionList(params.headerExtensions)),
      rtcp_reduced_size: bool(params.rtcp?.reducedSize),
      encodings: nonEmptyList(
        encodings.map((e) =>
          defined({
            active: bool(e?.active),
            max_bitrate_bps: num(e?.maxBitrate),
            priority: str(e?.priority),
            network_priority: str(e?.networkPriority),
            dtx: str(e?.dtx),
            ptime: num(e?.ptime),
            rid: str(e?.rid),
          })
        )
      ),
      degradation_preference: str(params.degradationPreference),
    })
  );
}

export const readPeerStates = (pc: Any): Flat | undefined =>
  pc
    ? nonEmpty(
        defined({
          signaling_state: attempt(() => str(pc.signalingState)),
          ice_gathering_state: attempt(() => str(pc.iceGatheringState)),
          ice_connection_state: attempt(() => str(pc.iceConnectionState)),
          connection_state: attempt(() => str(pc.connectionState)),
        })
      )
    : undefined;

/** getConfiguration() without credentials. */
export function readPeerConfiguration(pc: Any): Flat | undefined {
  const config = attempt(() => pc?.getConfiguration?.());
  if (!config) return undefined;
  const certificates: Any[] = Array.isArray(config.certificates)
    ? config.certificates
    : [];
  return nonEmpty(
    defined({
      ice_servers: Array.isArray(config.iceServers)
        ? toIceServerInfo(config.iceServers)
        : undefined,
      ice_transport_policy: str(config.iceTransportPolicy),
      bundle_policy: str(config.bundlePolicy),
      rtcp_mux_policy: str(config.rtcpMuxPolicy),
      ice_candidate_pool_size: num(config.iceCandidatePoolSize),
      sdp_semantics: str(config.sdpSemantics),
      certificate_expires: nonEmptyList(
        certificates
          .map((c) => num(c?.expires))
          .filter((ms) => ms !== undefined)
          .map((ms) => attempt(() => new Date(ms).toISOString()))
          .filter(Boolean)
      ),
    })
  );
}

/** The app's media element, or its id. */
export function resolveMediaElement(tag: unknown): HTMLMediaElement | null {
  const element: Any =
    typeof tag === 'string' ? attempt(() => doc()?.getElementById?.(tag)) : tag;
  return element && typeof element === 'object' && 'paused' in element
    ? element
    : null;
}

// ── Client info: the OS and browser, with Client Hints (Chromium) ─────────

type Brand = { brand: string; version: string };

/**
 * The OS from the user agent. Frozen values (macOS 10.15, "Windows NT 10.0",
 * "Android 10; K") are left out: Client Hints give the real one.
 */
export function detectOs(
  userAgent: string
): Pick<ClientInfo, 'os' | 'os_version'> {
  const ua = userAgent || '';
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Android\s([\d.]+)(;\s*K\))?/))) {
    return m[2] ? { os: 'android' } : { os: 'android', os_version: m[1] };
  }
  if ((m = ua.match(/(?:iPhone|iPad|iPod).*?OS\s([\d_]+)/))) {
    return { os: 'ios', os_version: m[1].replace(/_/g, '.') };
  }
  if (/CrOS/.test(ua)) return { os: 'chromeos' };
  if ((m = ua.match(/Windows NT\s([\d.]+)/))) {
    return m[1] === '10.0'
      ? { os: 'windows' }
      : { os: 'windows', os_version: m[1] };
  }
  if ((m = ua.match(/Mac OS X\s([\d_.]+)/))) {
    const version = m[1].replace(/_/g, '.');
    return version.startsWith('10.15')
      ? { os: 'macos' }
      : { os: 'macos', os_version: version };
  }
  return { os: /Linux/.test(ua) ? 'linux' : 'unknown' };
}

/** The real OS version from Client Hints' platformVersion. */
export function osVersionFromHints(
  os: ClientInfo['os'],
  platformVersion: string | undefined
): string | undefined {
  const major = Number((platformVersion || '').split('.')[0]);
  if (!platformVersion || !Number.isFinite(major)) return undefined;
  if (os === 'windows')
    return major >= 13 ? '11' : major >= 1 ? '10' : undefined;
  if (os === 'android') return String(major);
  if (os === 'macos')
    return platformVersion.replace(/(\.0)+$/, '') || undefined;
  return os === 'chromeos' || os === 'linux' ? platformVersion : undefined;
}

const BRANDS: Array<[RegExp, string]> = [
  [/^Microsoft Edge$/, 'edge'],
  [/^Opera/, 'opera'],
  [/^Brave/, 'brave'],
  [/^Samsung Internet$/, 'samsung'],
  [/^(Google Chrome|HeadlessChrome)$/, 'chrome'],
  [/^Chromium$/, 'chromium'],
];

const UA_BROWSERS: Array<[RegExp, string]> = [
  [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'edge'],
  [/OPR\/([\d.]+)/, 'opera'],
  [/SamsungBrowser\/([\d.]+)/, 'samsung'],
  [/(?:Firefox|FxiOS)\/([\d.]+)/, 'firefox'],
  [/(?:Chrome|CriOS|HeadlessChrome)\/([\d.]+)/, 'chrome'],
  [/Version\/([\d.]+).*Safari\//, 'safari'],
];

/** The browser from Client Hints' brands; GREASE brands are skipped. */
export function browserFromBrands(brands: Brand[] | undefined): Flat {
  for (const [pattern, browser] of BRANDS) {
    const found = brands?.find((entry) => pattern.test(entry.brand));
    if (found) return { browser, browser_version: found.version };
  }
  return {};
}

/** The browser from the user agent; a reduced "148.0.0.0" is kept as "148". */
export function browserFromUserAgent(userAgent: string): Flat {
  for (const [pattern, browser] of UA_BROWSERS) {
    const match = (userAgent || '').match(pattern);
    if (match)
      return {
        browser,
        browser_version: match[1].replace(/^(\d+)(\.0)+$/, '$1'),
      };
  }
  return userAgent ? { browser: 'other' } : {};
}

/** "arm" + "64" -> "arm64", "x86" + "64" -> "x86_64". */
export function cpuArchFromHints(
  architecture?: string,
  bitness?: string
): string | undefined {
  if (architecture !== 'x86' && architecture !== 'arm')
    return architecture || undefined;
  if (bitness !== '64') return architecture;
  return architecture === 'x86' ? 'x86_64' : 'arm64';
}

/** Asked once per page; every client shares the answer. */
let highEntropyValues: Promise<Any> | null = null;

function requestHighEntropyValues(): Promise<Any> {
  const data = nav()?.userAgentData;
  if (!data?.getHighEntropyValues) return Promise.resolve(null);
  const hints =
    'platformVersion architecture bitness model fullVersionList formFactors wow64';
  highEntropyValues ??= data
    .getHighEntropyValues(hints.split(' '))
    .catch((): null => null);
  return highEntropyValues;
}

/** Tests only: forget the page's Client Hints answer. */
export const resetClientHints = (): void => {
  highEntropyValues = null;
};

/** Every Client Hint the browser gives; null where it has none (Firefox, Safari). */
export const readClientHints = (): Promise<Flat | null> =>
  requestHighEntropyValues().then((v) =>
    v
      ? defined({
          brands: v.brands,
          full_version_list: v.fullVersionList,
          mobile: bool(v.mobile),
          platform: v.platform,
          platform_version: v.platformVersion,
          architecture: v.architecture,
          bitness: v.bitness,
          model: v.model,
          form_factors: v.formFactors,
          wow64: bool(v.wow64),
        })
      : null
  );

/**
 * The envelope's client (structured fields only) and every detail the SDK has
 * (sdk_creation_started's extra.client_details). Client Hints fill both in a
 * few ms later; events are serialized when sent, so they carry the answer.
 */
export function buildClientInfo(
  sdkVersion: string,
  env?: string
): { client: ClientInfo; details: Flat } {
  const n = nav();
  const ua: string = n?.userAgent || '';
  const { os, os_version } = detectOs(ua);
  const client: ClientInfo = {
    environment: env === 'development' ? 'development' : 'production',
    sdk: 'js',
    sdk_version: sdkVersion,
    os,
    os_version,
    user_agent: ua,
  };
  const formFactor = /iPad|Tablet/.test(ua)
    ? 'tablet'
    : n?.userAgentData?.mobile === true || /Mobi|iPhone|Android/.test(ua)
      ? 'mobile'
      : ua
        ? 'desktop'
        : undefined;
  const details: Flat = {
    ...defined(client),
    ...browserFromUserAgent(ua),
    ...defined({
      cpu_cores: num(n?.hardwareConcurrency),
      device_memory_gb: num(n?.deviceMemory),
      form_factor: formFactor,
    }),
  };
  void requestHighEntropyValues().then((v) => {
    if (!v) return;
    const osVersion = osVersionFromHints(os, v.platformVersion);
    if (osVersion) client.os_version = details.os_version = osVersion;
    Object.assign(details, browserFromBrands(v.fullVersionList));
    const cpuArch = cpuArchFromHints(v.architecture, v.bitness);
    if (cpuArch) details.cpu_arch = cpuArch;
    if (v.model) details.device_model = v.model;
    if (v.formFactors?.[0])
      details.form_factor = v.formFactors[0].toLowerCase();
  });
  return { client, details };
}
