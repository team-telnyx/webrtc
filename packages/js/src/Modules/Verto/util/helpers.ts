import { IMessageRPC, IVertoOptions } from './interfaces';
import logger from './logger';
import { STORAGE_PREFIX } from './constants';
import { GatewayStateType } from '../webrtc/constants';

// hack to remove undefined values from the object
export const deepCopy = (obj: Object) => JSON.parse(JSON.stringify(obj));

export const objEmpty = (obj: Object) => Object.keys(obj).length === 0;

export const mutateStorageKey = (key: string) => `${STORAGE_PREFIX}${key}`;

export const mutateLiveArrayData = (data: any) => {
  const [
    participantId,
    participantNumber,
    participantName,
    codec,
    mediaJson,
    participantData,
  ] = data;
  let media = {};
  try {
    media = JSON.parse(mediaJson.replace(/ID"/g, 'Id"'));
  } catch (error) {
    logger.warn('Verto LA invalid media JSON string:', mediaJson);
  }
  return {
    participantId: Number(participantId),
    participantNumber,
    participantName,
    codec,
    media,
    participantData,
  };
};

export const safeParseJson = (value: string): string | Object => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

export const isDefined = (variable: any): boolean =>
  typeof variable !== 'undefined';

export const isFunction = (variable: any): boolean =>
  variable instanceof Function || typeof variable === 'function';

/**
 * `instanceof HTMLMediaElement` alone is false for elements owned by another
 * window (iframe, popout, Document Picture-in-Picture), so also check against
 * the element's own realm.
 */
export const isMediaElement = (
  element: unknown
): element is HTMLMediaElement => {
  if (
    typeof HTMLMediaElement !== 'undefined' &&
    element instanceof HTMLMediaElement
  ) {
    return true;
  }
  const ownerWindow = isNode(element)
    ? element.ownerDocument?.defaultView
    : null;
  if (
    ownerWindow?.HTMLMediaElement &&
    element instanceof ownerWindow.HTMLMediaElement
  ) {
    logger.info(
      'Using a media element owned by another window (iframe, popout or Picture-in-Picture)'
    );
    return true;
  }
  return false;
};

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && 'ownerDocument' in value;

export const findElementByType = (
  tag: HTMLMediaElement | string | Function
): HTMLMediaElement => {
  if (typeof document !== 'object' || !('getElementById' in document)) {
    return null;
  }
  if (typeof tag === 'string') {
    return <HTMLMediaElement>document.getElementById(tag) || null;
  } else if (typeof tag === 'function') {
    return tag();
  } else if (isMediaElement(tag)) {
    return tag;
  }
  return null;
};

const PROTOCOL_PATTERN = /^(ws|wss):\/\//;
export const checkWebSocketHost = (host: string): string => {
  const protocol = PROTOCOL_PATTERN.test(host) ? '' : 'wss://';
  return `${protocol}${host}`;
};

/**
 * From the socket we can get:
 * - JSON-RPC msg with 1 level of 'result' or 'error'
 * - JSON-RPC msg with 2 nested 'result' and 'code' property to identify error
 * - JSON-RPC msg with 3 nested 'result' where the third level is the Verto JSON-RPC flat msg.
 *
 * @returns Object with error | result key to identify success or fail
 */
export const destructResponse = (
  response: any,
  nodeId: string = null
): { [key: string]: any } => {
  const { result = {}, error } = response;
  if (error) {
    return { error };
  }
  const { result: nestedResult = null } = result;
  if (nestedResult === null) {
    if (nodeId !== null) {
      result.node_id = nodeId;
    }
    return { result };
  }
  const {
    code = null,
    node_id = null,
    result: vertoResult = null,
  } = nestedResult;
  if (code && code !== '200') {
    return { error: nestedResult };
  }
  if (vertoResult) {
    return destructResponse(vertoResult, node_id);
  }
  return { result: nestedResult };
};

export const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Validates the options passed in.
 * TelnyxRTC requires (login and password) OR (login_token)
 * Verto requires host, login, passwd OR password
 * @return boolean
 */
export const isValidLoginOptions = ({
  login,
  passwd,
  password,
  login_token,
}: IVertoOptions) => {
  const isLogin = login && (passwd || password);
  const isToken = login_token;
  return Boolean(isLogin || isToken);
};

export const isValidAnonymousLoginOptions = ({
  anonymous_login,
}: IVertoOptions) => {
  return (
    Boolean(anonymous_login) &&
    Boolean(anonymous_login.target_id) &&
    Boolean(anonymous_login.target_type)
  );
};

export const getGatewayState = (msg: IMessageRPC): GatewayStateType | '' => {
  let stateResult: GatewayStateType | '' = '';
  let stateParam: GatewayStateType | '' = '';

  if (msg?.result?.params?.state) {
    stateResult = msg?.result?.params?.state;
  }

  if (msg?.params?.state) {
    stateParam = msg?.params?.state;
  }

  const gateWayState = stateResult || stateParam;

  return gateWayState;
};

export type DeferredPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

type DeferredPromiseOptions = {
  debounceTime?: number;
};

export function deferredPromise<T>({
  debounceTime,
}: DeferredPromiseOptions): DeferredPromise<T> {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = debounceTime ? debounce(res, debounceTime) : res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const debounce = (func: Function, wait: number) => {
  let timeout: number;
  return (...args: any) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      func(...args);
    }, wait);
  };
};
