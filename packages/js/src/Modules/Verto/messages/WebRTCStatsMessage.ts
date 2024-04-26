import BaseMessage from './BaseMessage';
import { v4 } from 'uuid';
export class WebRTCStatsMessage extends BaseMessage {
  constructor(data: any) {
    super();
    const reportId = v4();
    this.buildRequest({
      type: 'debug_final_report',
      debug_final_report: btoa(JSON.stringify(data)),
      debug_report_id: reportId,
    });
    console.log(`WebRTC Debug Report generated: ${reportId}`);
  }
}
