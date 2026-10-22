import { IEmergencyCallOptions, IVertoCallOptions } from './interfaces';

/** SIP header that carries a provisioned dynamic emergency location id. */
export const GEOLOCATION_HEADER = 'Geolocation';
/** SIP headers that carry WGS 84 coordinates. */
export const LATITUDE_HEADER = 'X-Latitude';
export const LONGITUDE_HEADER = 'X-Longitude';

/** Decimal places kept for coordinates (the platform accepts 6 to 8). */
const COORDINATE_PRECISION = 6;

type SipHeader = { name: string; value: string };

function assertFiniteNumber(
  value: unknown,
  label: string
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(
      `emergency.coordinates.${label} must be a finite number`
    );
  }
}

/**
 * Builds the SIP headers that describe the caller's location on an
 * emergency call from `IEmergencyCallOptions`.
 *
 * - `sipGeolocationId` becomes a `Geolocation` header.
 * - `coordinates` become `X-Latitude` / `X-Longitude` headers.
 *
 * Throws on values the platform would reject, so a misconfigured
 * emergency call fails in the application instead of on the wire.
 */
export function buildEmergencyHeaders(
  emergency: IEmergencyCallOptions
): SipHeader[] {
  if (!emergency || typeof emergency !== 'object') {
    throw new TypeError('emergency must be an object');
  }
  const { sipGeolocationId, coordinates } = emergency;
  const headers: SipHeader[] = [];

  if (sipGeolocationId !== undefined) {
    if (
      typeof sipGeolocationId !== 'string' ||
      !/^\S+$/.test(sipGeolocationId)
    ) {
      throw new TypeError(
        'emergency.sipGeolocationId must be a non-empty string without whitespace'
      );
    }
    headers.push({ name: GEOLOCATION_HEADER, value: sipGeolocationId });
  }

  if (coordinates !== undefined) {
    const { latitude, longitude } = coordinates ?? {};
    assertFiniteNumber(latitude, 'latitude');
    assertFiniteNumber(longitude, 'longitude');
    if (latitude < -90 || latitude > 90) {
      throw new RangeError(
        'emergency.coordinates.latitude must be between -90 and 90'
      );
    }
    if (longitude < -180 || longitude > 180) {
      throw new RangeError(
        'emergency.coordinates.longitude must be between -180 and 180'
      );
    }
    headers.push(
      { name: LATITUDE_HEADER, value: latitude.toFixed(COORDINATE_PRECISION) },
      { name: LONGITUDE_HEADER, value: longitude.toFixed(COORDINATE_PRECISION) }
    );
  }

  if (headers.length === 0) {
    throw new TypeError(
      'emergency requires sipGeolocationId and/or coordinates'
    );
  }
  return headers;
}

/**
 * Merges the headers derived from `options.emergency` into
 * `options.customHeaders`. A custom header with the same name (case
 * insensitive) is replaced, so the structured option always wins.
 * Returns the same options object.
 */
export function applyEmergencyOptions<T extends IVertoCallOptions>(
  options: T
): T {
  if (!options?.emergency) {
    return options;
  }
  const emergencyHeaders = buildEmergencyHeaders(options.emergency);
  const names = new Set(emergencyHeaders.map((h) => h.name.toLowerCase()));
  const kept = (options.customHeaders ?? []).filter(
    (h) => !names.has(String(h?.name ?? '').toLowerCase())
  );
  options.customHeaders = [...kept, ...emergencyHeaders];
  return options;
}
