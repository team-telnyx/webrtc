import { register } from './Modules/Verto/services/Handler';
import { SwEvent } from './Modules/Verto/util/constants';
import { deferredPromise } from './Modules/Verto/util/helpers';
import TelnyxRTC from './TelnyxRTC';

type Quality = 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
/**
 * Interface representing the Telnyx identifiers.
 * @inline
 */
export interface TelnyxIDs {
  /**
   * The Telnyx call control identifier.
   */
  telnyxCallControlId?: string;
  /**
   * The Telnyx session identifier.
   */
  telnyxSessionId?: string;
  /**
   * The Telnyx leg identifier.
   */
  telnyxLegId?: string;
}

/**
 * Interface representing the statistics of an RTC ICE candidate.
 * @inline
 */
export interface RTCIceCandidateStats {
  /**
   * The address of the ICE candidate.
   */
  address: RTCIceCandidate['address'];
  /**
   * The type of the ICE candidate.
   */
  candidateType: RTCIceCandidate['type'];
  /**
   * Indicates whether the ICE candidate has been deleted.
   */
  deleted: boolean;
  /**
   * The unique identifier for the ICE candidate.
   */
  id: string;
  /**
   * The port number of the ICE candidate.
   */
  port: RTCIceCandidate['port'];
  /**
   * The priority of the ICE candidate.
   */
  priority: RTCIceCandidate['priority'];
  /**
   * The protocol used by the ICE candidate.
   */
  protocol: RTCIceCandidate['protocol'];
  /**
   * The relay protocol used by the ICE candidate, if applicable.
   */
  relayProtocol?: 'tcp' | 'udp' | 'tls';
  /**
   * The timestamp when the ICE candidate was generated.
   */
  timestamp: DOMHighResTimeStamp;
  /**
   * The transport identifier for the ICE candidate.
   */
  transportId: string;
  /**
   * The type of the ICE candidate, either local or remote.
   */
  type: string;
  /**
   * The URL of the ICE candidate.
   */
  url: string;
}
/**
 * Interface representing the minimum, maximum, and average values.
 * @inline
 */
export interface MinMaxAverage {
  /**
   * The minimum value.
   */
  min: number;
  /**
   * The maximum value.
   */
  max: number;
  /**
   * The average value.
   */
  average: number;
}

/**
 * Interface representing the pre-call diagnosis report.
 * @inline
 */
export interface Report {
  /**
   * The statistics of the ICE candidates.
   * {@link RTCIceCandidateStats}
   */
  iceCandidateStats: RTCIceCandidateStats[];
  /**
   * The statistics of the selected ICE candidate pair.
   */
  iceCandidatePairStats: RTCIceCandidatePairStats;
  /**
   * The summary statistics of the pre-call diagnosis.
   */
  summaryStats: {
    /**
     * The jitter in milliseconds.
     */
    jitter: MinMaxAverage;
    /**
     * The round-trip time (RTT) in milliseconds.
     */
    rtt: MinMaxAverage;

    /**
     * The mean opinion score (MOS) of the call quality.
     */
    mos: number;
    /**
     * The quality of the call.
     */
    quality: Quality;
  };

  /**
   * The session statistics of the pre-call diagnosis.
   */
  sessionStats: {
    /**
     * The number of packets received.
     */
    packetsReceived: number;
    /**
     * The number of packets lost.
     */
    packetsLost: number;
    /**
     * The number of packets sent.
     */
    packetsSent: number;
    /**
     * The number of bytes sent.
     */
    bytesSent: number;
    /**
     * The number of bytes received.
     */
    bytesReceived: number;
  };
}
/**
 * Interface representing the options for the pre-call diagnosis.
 * @inline
 */
export interface PreCallDiagnosisOptions {
  /**
   * The application number for the TexML service.
   */
  texMLApplicationNumber: string;
  /**
   * The credentials for authentication.
   * Can include either login and password or a login token.
   */
  credentials: {
    /**
     * The login username.
     */
    login?: string;
    /**
     * The login password.
     */
    password?: string;
    /**
     * The login token.
     */
    loginToken?: string;
  };
}

/**
 * Class representing the pre-call diagnosis.
 * The pre-call diagnosis is used to diagnose the call quality before the call is established.
 * It can be used to detect potential issues that may affect the call quality.
 *
 */
export class PreCallDiagnosis {
  /**
   * Executes the pre-call diagnosis and returns a report.
   * @param options {@type PreCallDiagnosisOptions} - The options to use for the diagnosis.
   * @returns A promise that resolves with the report.
   */
  static async run(options: PreCallDiagnosisOptions): Promise<Report> {
    const _clientReadyPromise = deferredPromise<void>({});
    const _reportPromise = deferredPromise<Report>({});

    const client = new TelnyxRTC(options.credentials);

    await client.connect();

    client.on(SwEvent.Ready, _clientReadyPromise.resolve);
    client.on(SwEvent.Error, _clientReadyPromise.reject);
    client.on(SwEvent.MediaError, _clientReadyPromise.reject);
    client.on(SwEvent.MediaError, _clientReadyPromise.reject);

    client.on(SwEvent.Notification, (notification) => {
      if (notification.call && notification.call.sipCode >= 400) {
        _reportPromise.reject(new Error(notification.call.sipReason));
      }
    });

    register(SwEvent.StatsReport, (data) => {
      _reportPromise.resolve(PreCallDiagnosis.mapReport(data));
    });

    await _clientReadyPromise.promise;

    await client.newCall({
      destinationNumber: options.texMLApplicationNumber,
      debug: true,
    });

    return _reportPromise.promise;
  }

  private static mapReport(report: any): Report {
    const iceCandidates = [];
    const stats = [];

    for (const item of report) {
      switch (item.event) {
        case 'onicecandidate': {
          if (item.data) iceCandidates.push(item.data);
          break;
        }
        case 'stats': {
          stats.push(item.data);
          break;
        }
      }
    }

    let count = 0;
    let minJitter = Infinity;
    let maxJitter = -Infinity;
    let totalJitter = 0;

    let minRtt = Infinity;
    let maxRtt = -Infinity;
    let totalRtt = 0;

    stats.forEach((stat) => {
      if (!stat.remote.audio.inbound?.[0]) return;

      count += 1;
      const jitter = stat.remote.audio.inbound[0].jitter ?? 0;
      const rtt = stat.remote.audio.inbound[0].roundTripTime ?? 0;

      totalJitter += jitter;
      totalRtt += rtt;

      maxJitter = Math.max(maxJitter, jitter);
      minJitter = Math.min(minJitter, jitter);
      maxRtt = Math.max(maxRtt, rtt);
      minRtt = Math.min(minRtt, rtt);
    });

    const averageRtt = totalRtt / count;
    const averageJitter = totalJitter / count;
    const lastFrame = stats[stats.length - 1];

    const mos = PreCallDiagnosis.calculateMOS({
      jitter: averageJitter * 1000, // in ms,
      rtt: averageRtt * 1000, // in ms,
      packetsReceived: lastFrame.audio.inbound?.[0]?.packetsReceived ?? 0,
      packetsLost: lastFrame.audio.inbound?.[0]?.packetsLost ?? 0,
    });
    return {
      iceCandidatePairStats: stats[stats.length - 1].connection,
      summaryStats: {
        mos,
        jitter: {
          average: averageJitter,
          max: maxJitter,
          min: minJitter,
        },

        rtt: {
          average: averageRtt,
          max: maxRtt,
          min: minRtt,
        },

        quality: PreCallDiagnosis.getQuality(mos),
      },
      sessionStats: {
        packetsSent: lastFrame.connection.packetsSent ?? 0,
        bytesSent: lastFrame.connection.bytesSent ?? 0,
        bytesReceived: lastFrame.connection.bytesReceived ?? 0,
        packetsLost: lastFrame.remote.audio.inbound?.[0]?.packetsLost ?? 0,
        packetsReceived: lastFrame.connection.packetsReceived ?? 0,
      },
      iceCandidateStats: iceCandidates,
    };
  }

  private static calculateMOS(data: {
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

  private static getQuality(mos: number): Quality {
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
  /**
   * Gets the Telnyx identifiers for the pre-call diagnosis.
   * @returns {@type TelnyxIDs} The Telnyx identifiers for the pre-call diagnosis.
   */
  public getTelnyxIds(): TelnyxIDs {
    return {
      telnyxCallControlId: '',
      telnyxSessionId: '',
      telnyxLegId: '',
    };
  }
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
