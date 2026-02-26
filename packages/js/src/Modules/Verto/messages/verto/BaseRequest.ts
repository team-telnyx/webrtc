import BaseMessage from '../BaseMessage';

const tmpMap: Record<string, string> = {
  id: 'callID',
  destinationNumber: 'destination_number',
  remoteCallerName: 'remote_caller_id_name',
  remoteCallerNumber: 'remote_caller_id_number',
  callerName: 'caller_id_name',
  callerNumber: 'caller_id_number',
  customHeaders: 'custom_headers',
};

/**
 * Serialize an HTMLElement to a JSON-safe summary for logging.
 * Captures tag, id, classes, media attributes and dimensions
 * so voice-sdk-proxy can log useful element info without circular refs.
 */
function serializeElement(el: unknown): Record<string, unknown> | undefined {
  if (!el || typeof el !== 'object') return undefined;
  const e = el as HTMLElement;
  if (typeof e.tagName !== 'string') return undefined;
  const summary: Record<string, unknown> = {
    tag: e.tagName.toLowerCase(),
  };
  if (e.id) summary.id = e.id;
  if (e.className) summary.class = e.className;
  // Media-specific attributes (audio/video elements)
  const m = e as unknown as HTMLMediaElement;
  if (typeof m.autoplay === 'boolean') summary.autoplay = m.autoplay;
  if (typeof m.muted === 'boolean') summary.muted = m.muted;
  if ('playsInline' in m)
    summary.playsInline = (m as HTMLVideoElement).playsInline;
  if (m.srcObject) summary.hasSrcObject = true;
  if (e.offsetWidth || e.offsetHeight) {
    summary.dimensions = `${e.offsetWidth}x${e.offsetHeight}`;
  }
  return summary;
}

/** Properties to strip from dialogParams before serialization. */
const NON_SERIALIZABLE_KEYS = [
  'remoteSdp',
  'localStream',
  'remoteStream',
  'onNotification',
  'camId',
  'micId',
  'speakerId',
];

/**
 * Strip non-serializable properties from dialogParams.
 * DOM elements are replaced with JSON-safe summaries; streams, callbacks,
 * and device IDs are discarded (not needed server-side).
 */
function sanitizeDialogParams(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const dialogParams = { ...raw };

  for (const key of NON_SERIALIZABLE_KEYS) {
    delete dialogParams[key];
  }

  // Replace DOM elements with JSON-safe summaries for server-side logging
  const localSummary = serializeElement(dialogParams.localElement);
  const remoteSummary = serializeElement(dialogParams.remoteElement);
  if (localSummary) {
    dialogParams.localElement = localSummary;
  } else {
    delete dialogParams.localElement;
  }
  if (remoteSummary) {
    dialogParams.remoteElement = remoteSummary;
  } else {
    delete dialogParams.remoteElement;
  }

  return dialogParams;
}

export default abstract class BaseRequest extends BaseMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(params: any = {}) {
    super();

    if (params.hasOwnProperty('dialogParams')) {
      const dialogParams = sanitizeDialogParams(params.dialogParams);

      for (const key in tmpMap) {
        if (key && dialogParams.hasOwnProperty(key)) {
          dialogParams[tmpMap[key]] = dialogParams[key];
          delete dialogParams[key];
        }
      }

      params.dialogParams = dialogParams;
    }

    this.buildRequest({ method: this.toString(), params });
  }
}
