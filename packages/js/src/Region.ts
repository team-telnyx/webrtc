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
  /** Silicon Valley alone (US West without Denver and Las Vegas). */
  SV: 'sv',
  CA_CENTRAL: 'ca-central',
  APAC: 'apac',
  /** Asia (Chennai, Singapore, Mumbai). */
  ASIA: 'asia',
  /**
   * @deprecated Use {@link Region.ASIA}. `south-asia` names the same
   * hosts and keeps working, but new code should use `asia`.
   */
  SOUTH_ASIA: 'south-asia',
  /** India (Chennai, Mumbai). */
  IN: 'in',
  /** Australia (Sydney, Melbourne). */
  AU: 'au',
  /** Sydney alone, without the Melbourne hosts. */
  SY: 'sy',
  /** Middle East (Dubai). */
  ME: 'me',
} as const;

export type Region = (typeof Region)[keyof typeof Region];
