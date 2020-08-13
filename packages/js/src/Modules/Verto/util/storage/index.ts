import { mutateStorageKey, safeParseJson } from '../helpers'

const _inNode = () => typeof window === 'undefined' && typeof process !== 'undefined'

const _get = async (storageType: string, key: string): Promise<any> => {
  if (_inNode()) return null

  const res = window[storageType].getItem(mutateStorageKey(key))
  return safeParseJson(res)
}

const _set = async (storageType: string, key: string, value: any): Promise<void> => {
  if (_inNode()) return null

  if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  window[storageType].setItem(mutateStorageKey(key), value)
}

const _remove = async (storageType: string, key: string): Promise<void> => {
  if (_inNode()) return null

  return window[storageType].removeItem(mutateStorageKey(key))
}

export const localStorage = {
  getItem: (key: string): Promise<any> => _get('localStorage', key),
  setItem: (key: string, value: any): Promise<void> => _set('localStorage', key, value),
  removeItem: (key: string): Promise<void> => _remove('localStorage', key),
}

export const sessionStorage = {
  getItem: (key: string): Promise<any> => _get('sessionStorage', key),
  setItem: (key: string, value: any): Promise<void> => _set('sessionStorage', key, value),
  removeItem: (key: string): Promise<void> => _remove('sessionStorage', key),
}
