import { getDeviceString, checkAllowedModules } from './helpers';

describe("helpers", () => {
    describe("getDeviceString", () => {
        it("should return any when input is boolean", () => {
            expect(getDeviceString(true)).toBe('any');
        })
        it("should return value when input is passed", () => {
            expect(getDeviceString("iphone")).toBe('iphone');
        })
    })

    describe("checkAllowedModules", () => {
        it("should return true when is an allowed module verto | telnyx_rtc", () => {
            expect(checkAllowedModules("verto")).toBeTruthy();
            expect(checkAllowedModules("telnyx_rtc")).toBeTruthy();
        })

        it("should return false when is NOT an allowed module", () => {
            expect(checkAllowedModules("verto")).toBeTruthy();
            expect(checkAllowedModules("telnyx_rtc")).toBeTruthy();
        })
    })
})
