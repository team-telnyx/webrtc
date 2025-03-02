export function calculateMOS(data: {
  jitter: number;
  rtt: number;
  packetsReceived: number;
  packetsLost: number;
}): number {
  const { packetsLost, packetsReceived, jitter, rtt } = data;

  // Simplified R-factor calculation
  const R0 = 93.2; // Base value for G.711 codec
  const Is = 0; // Assume no simultaneous transmission impairment
  const Id = calculateDelayImpairment({ rtt, jitter }); // Delay impairment
  const Ie = calculateEquipmentImpairment({ packetsLost, packetsReceived }); // Equipment impairment
  const A = 0; // Advantage factor (0 for WebRTC)

  const R = R0 - Is - Id - Ie + A;

  // Convert R-factor to MOS
  const MOS = 1 + 0.035 * R + 0.000007 * R * (R - 60) * (100 - R);
  return Math.min(Math.max(MOS, 1), 5); // Clamp MOS between 1 and 5
}

// Calculate delay impairment (Id) using RTT
function calculateDelayImpairment(data: {
  jitter: number;
  rtt: number;
}): number {
  const { jitter, rtt } = data;
  // Approximate one-way latency as RTT / 2
  const latency = jitter + rtt / 2;

  // Simplified formula for delay impairment
  return 0.024 * latency + 0.11 * (latency - 177.3) * (latency > 177.3 ? 1 : 0);
}

// Calculate equipment impairment (Ie)
function calculateEquipmentImpairment(data: {
  packetsLost: number;
  packetsReceived: number;
}): number {
  // Simplified formula for equipment impairment
  const { packetsLost, packetsReceived } = data;
  const packetLossPercentage =
    (packetsLost / (packetsReceived + packetsLost)) * 100;

  return 20 * Math.log(1 + packetLossPercentage);
}

export type Quality = 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
export function getQuality(mos: number): Quality {
  if (mos > 4.2) {
    return 'excellent';
  } else if (mos >= 4.1 && mos <= 4.2) {
    return 'good';
  } else if (mos >= 3.7 && mos <= 4) {
    return 'fair';
  } else if (mos >= 3.1 && mos <= 3.6) {
    return 'poor';
  } else {
    return 'bad';
  }
}
