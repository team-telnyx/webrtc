import BaseMessage from '../BaseMessage';

const tmpMap = {
  id: 'callID',
  destinationNumber: 'destination_number',
  remoteCallerName: 'remote_caller_id_name',
  remoteCallerNumber: 'remote_caller_id_number',
  callerName: 'caller_id_name',
  callerNumber: 'caller_id_number',
  customHeaders: 'custom_headers',
};

export default abstract class BaseRequest extends BaseMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(params: any = {}) {
    super();

    if (params.hasOwnProperty('dialogParams')) {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        remoteSdp,
        localStream,
        remoteStream,
        localElement,
        remoteElement,
        onNotification,
        camId,
        micId,
        speakerId,
        ...dialogParams
      } = params.dialogParams;
      /* eslint-enable @typescript-eslint/no-unused-vars */

      for (const key in tmpMap) {
        if (key && dialogParams.hasOwnProperty(key)) {
          dialogParams[tmpMap[key]] = dialogParams[key];
          delete dialogParams[key];
        }
      }

      params.dialogParams = dialogParams;
    }

    this.buildRequest({ method: this.toString(), params });
  }
}
