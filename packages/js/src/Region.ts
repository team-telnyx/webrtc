/**
 * Supported WebRTC signaling regions.
 *
 * Omit `IClientOptions.region` to use automatic routing.
 */
export const Region = {
  EU: 'eu',
  US_CENTRAL: 'us-central',
  US_EAST: 'us-east',
  US_WEST: 'us-west',
  CA_CENTRAL: 'ca-central',
  APAC: 'apac',
  SOUTH_ASIA: 'south-asia',
} as const;

export type Region = (typeof Region)[keyof typeof Region];
