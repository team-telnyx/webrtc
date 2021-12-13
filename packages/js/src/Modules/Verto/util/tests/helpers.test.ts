import { getGatewayState } from '../helpers';
import { IRequestRPC, IResponseRPC } from '../interfaces';

describe('getGatewayState', () => {
  describe('request', () => {
    it('it should return empty string if server did not send the gateway state', () => {
      const msg: IRequestRPC = {
        id: '',
        method: '',
        params: '',
      };

      const state = getGatewayState(msg);
      expect(state).toBeFalsy();
    });

    it('it should return REGED', () => {
      const msg: IRequestRPC = {
        id: '',
        method: 'telnyx_rtc.gatewayState',
        params: {
          state: 'REGED',
        },
      };

      const state = getGatewayState(msg);
      expect(state).toEqual(msg.params.state);
    });
  });

  describe('response', () => {
    it('it should return empty string if server did not send the gateway state', () => {
      const msg: IResponseRPC = {
        id: '',
        result: {
          params: {},
        },
      };

      const state = getGatewayState(msg);
      expect(state).toBeFalsy();
    });

    it('it should return REGED', () => {
      const msg: IResponseRPC = {
        id: '',
        result: {
          params: { state: 'REGED' },
        },
      };

      const state = getGatewayState(msg);
      expect(state).toEqual(msg.result.params.state);
    });

    it('it should return TRYING', () => {
      const msg: IResponseRPC = {
        id: '',
        result: {
          params: { state: 'TRYING' },
        },
      };

      const state = getGatewayState(msg);
      expect(state).toEqual(msg.result.params.state);
    });
  });
});
