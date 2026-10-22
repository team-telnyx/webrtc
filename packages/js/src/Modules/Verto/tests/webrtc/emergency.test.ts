import {
  applyEmergencyOptions,
  buildEmergencyHeaders,
  GEOLOCATION_HEADER,
  LATITUDE_HEADER,
  LONGITUDE_HEADER,
} from '../../webrtc/emergency';
import { Invite } from '../../messages/Verto';

describe('emergency call options', () => {
  describe('buildEmergencyHeaders', () => {
    it('maps sipGeolocationId to a Geolocation header', () => {
      expect(
        buildEmergencyHeaders({ sipGeolocationId: 'c1a8e59d00db5b1f' })
      ).toEqual([{ name: GEOLOCATION_HEADER, value: 'c1a8e59d00db5b1f' }]);
    });

    it('maps coordinates to X-Latitude / X-Longitude with 6 decimals', () => {
      expect(
        buildEmergencyHeaders({
          coordinates: { latitude: 41.881, longitude: -87.67412345 },
        })
      ).toEqual([
        { name: LATITUDE_HEADER, value: '41.881000' },
        { name: LONGITUDE_HEADER, value: '-87.674123' },
      ]);
    });

    it('emits both when both are given', () => {
      const headers = buildEmergencyHeaders({
        sipGeolocationId: 'abc',
        coordinates: { latitude: 0, longitude: 0 },
      });
      expect(headers.map((h) => h.name)).toEqual([
        GEOLOCATION_HEADER,
        LATITUDE_HEADER,
        LONGITUDE_HEADER,
      ]);
    });

    it.each([
      [{}, /requires sipGeolocationId and\/or coordinates/],
      [{ sipGeolocationId: '' }, /non-empty string/],
      [{ sipGeolocationId: 'has space' }, /without whitespace/],
      [
        { coordinates: { latitude: 91, longitude: 0 } },
        /latitude must be between/,
      ],
      [
        { coordinates: { latitude: 0, longitude: -181 } },
        /longitude must be between/,
      ],
      [
        { coordinates: { latitude: NaN, longitude: 0 } },
        /latitude must be a finite number/,
      ],
      [{ coordinates: { latitude: 0 } }, /longitude must be a finite number/],
    ])('rejects %j', (input, message) => {
      expect(() =>
        buildEmergencyHeaders(
          input as Parameters<typeof buildEmergencyHeaders>[0]
        )
      ).toThrow(message);
    });
  });

  describe('applyEmergencyOptions', () => {
    it('leaves options without emergency untouched', () => {
      const options = { customHeaders: [{ name: 'X-A', value: '1' }] };
      expect(applyEmergencyOptions(options)).toBe(options);
      expect(options.customHeaders).toEqual([{ name: 'X-A', value: '1' }]);
    });

    it('appends emergency headers to existing custom headers', () => {
      const options = applyEmergencyOptions({
        customHeaders: [{ name: 'X-A', value: '1' }],
        emergency: { sipGeolocationId: 'geo1' },
      });
      expect(options.customHeaders).toEqual([
        { name: 'X-A', value: '1' },
        { name: GEOLOCATION_HEADER, value: 'geo1' },
      ]);
    });

    it('replaces a custom header with the same name, case-insensitively', () => {
      const options = applyEmergencyOptions({
        customHeaders: [
          { name: 'geolocation', value: 'stale' },
          { name: 'x-latitude', value: 'stale' },
        ],
        emergency: {
          sipGeolocationId: 'fresh',
          coordinates: { latitude: 1, longitude: 2 },
        },
      });
      expect(options.customHeaders).toEqual([
        { name: GEOLOCATION_HEADER, value: 'fresh' },
        { name: LATITUDE_HEADER, value: '1.000000' },
        { name: LONGITUDE_HEADER, value: '2.000000' },
      ]);
    });
  });

  describe('Invite message', () => {
    it('sends the mapped headers as custom_headers and drops the emergency key', () => {
      const dialogParams = applyEmergencyOptions({
        destinationNumber: '933',
        callerNumber: '+13125550100',
        emergency: { coordinates: { latitude: 41.881, longitude: -87.674 } },
      });
      const { params } = new Invite({ sessid: 's', sdp: '<SDP>', dialogParams })
        .request;
      expect(params.dialogParams.custom_headers).toEqual([
        { name: LATITUDE_HEADER, value: '41.881000' },
        { name: LONGITUDE_HEADER, value: '-87.674000' },
      ]);
      expect(params.dialogParams.destination_number).toBe('933');
      expect(params.dialogParams.caller_id_number).toBe('+13125550100');
      expect(params.dialogParams).not.toHaveProperty('emergency');
      expect(params.dialogParams).not.toHaveProperty('customHeaders');
    });
  });
});
