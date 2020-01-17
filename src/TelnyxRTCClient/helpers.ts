import { Module } from "../utils/types";

export const getDeviceString = (input: string | Boolean): string => {
    if (typeof input === 'boolean') {
      return input ? 'any' : 'none';
    } else if (typeof input === 'string') {
      return input;
    }
  
    return 'none';
  };

export const checkAllowedModules = (module: Module) => {
  if(module === "verto" || module === "telnyx_rtc") {
    return true;
  }

  return false;
}