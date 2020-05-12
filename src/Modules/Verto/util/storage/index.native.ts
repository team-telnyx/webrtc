// @ts-ignore
import AsyncStorage from '@react-native-community/async-storage'
import { mutateStorageKey, safeParseJson } from '../helpers'

const getItem = async (key: string): Promise<any> => {
  try {
    const res = await AsyncStorage.getItem(mutateStorageKey(key))
    return safeParseJson(res)
  } catch (error) {
    return null
  }
}

const setItem = (key: string, value: any): Promise<void> => {
  if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return AsyncStorage.setItem(mutateStorageKey(key), value)
}

const removeItem = (key: string): Promise<void> => AsyncStorage.removeItem(mutateStorageKey(key))

export const localStorage = { getItem, setItem, removeItem }
export const sessionStorage = { getItem, setItem, removeItem }
