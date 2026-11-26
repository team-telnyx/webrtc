import { isFunction } from '../util/helpers';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type QueueMap = { [key: string]: Function[] };

const GLOBAL = 'GLOBAL';
const queue: QueueMap = {};
const _buildEventName = (event: string, uniqueId: string) =>
  `${event}|${uniqueId}`;

const isQueued = (event: string, uniqueId: string = GLOBAL) => {
  const eventName = _buildEventName(event, uniqueId);
  return eventName in queue;
};

const queueLength = (event: string, uniqueId: string = GLOBAL): number => {
  const eventName = _buildEventName(event, uniqueId);
  return eventName in queue ? queue[eventName].length : 0;
};

/**
 * Subscribes the callback to the passed event. Use uniqueId to render unique the event.
 */
const register = (
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  callback: Function,
  uniqueId: string = GLOBAL
) => {
  const eventName = _buildEventName(event, uniqueId);
  if (!(eventName in queue)) {
    queue[eventName] = [];
  }
  queue[eventName].push(callback);
};

/**
 * Subscribes the callback to the passed event only once. Use uniqueId to render unique the event.
 */
const registerOnce = (
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  callback: Function,
  uniqueId: string = GLOBAL
) => {
  /* tslint:disable-next-line */
  const cb = function (data) {
    deRegister(event, cb, uniqueId);
    callback(data);
  };
  cb.prototype.targetRef = callback;
  return register(event, cb, uniqueId);
};

/**
 * Remove subscription by callback. If not callback is passed in, all subscription will be removed.
 */
const deRegister = (
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  callback?: Function | null,
  uniqueId: string = GLOBAL
) => {
  if (!isQueued(event, uniqueId)) {
    return false;
  }
  const eventName = _buildEventName(event, uniqueId);
  if (isFunction(callback)) {
    const len = queue[eventName].length;
    for (let i = len - 1; i >= 0; i--) {
      const fn = queue[eventName][i];
      if (
        callback === fn ||
        (fn.prototype && callback === fn.prototype.targetRef)
      ) {
        queue[eventName].splice(i, 1);
      }
    }
  } else {
    queue[eventName] = [];
  }
  if (queue[eventName].length === 0) {
    // Cleanup
    delete queue[eventName];
  }
  return true;
};

type TriggerObserver = (event: string, data: unknown, uniqueId: string) => void;
const observers: TriggerObserver[] = [];

/**
 * Sees every trigger() with a uniqueId before its subscribers (not the global
 * re-trigger), whatever the app registers or removes with on()/off(). For the
 * SDK's own telemetry; an observer must not throw.
 */
const observeTriggers = (observer: TriggerObserver): (() => void) => {
  observers.push(observer);
  return () => {
    const index = observers.indexOf(observer);
    if (index >= 0) observers.splice(index, 1);
  };
};

/**
 * Trigger the event, passing the data to it's subscribers. Use uniqueId to identify unique events.
 */
const trigger = (
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  uniqueId: string = GLOBAL,
  globalPropagation: boolean = true
): boolean => {
  if (uniqueId !== GLOBAL) {
    observers.forEach((observer) => observer(event, data, uniqueId));
  }
  const _propagate: boolean = globalPropagation && uniqueId !== GLOBAL;
  if (!isQueued(event, uniqueId)) {
    if (_propagate) {
      trigger(event, data);
    }
    return false;
  }
  const eventName = _buildEventName(event, uniqueId);
  const len = queue[eventName].length;
  if (!len) {
    if (_propagate) {
      trigger(event, data);
    }
    return false;
  }
  for (let i = len - 1; i >= 0; i--) {
    queue[eventName][i](data);
  }
  if (_propagate) {
    trigger(event, data);
  }
  return true;
};

/**
 * Remove all subscriptions
 */
const deRegisterAll = (event: string) => {
  const eventName = _buildEventName(event, '');
  Object.keys(queue)
    .filter((name) => name.indexOf(eventName) === 0)
    .forEach((event) => delete queue[event]);
};

const clearQueue = () =>
  Object.keys(queue).forEach((event) => delete queue[event]);

export {
  trigger,
  observeTriggers,
  register,
  registerOnce,
  deRegister,
  deRegisterAll,
  isQueued,
  queueLength,
  clearQueue,
};
