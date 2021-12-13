import { getGatewayState } from '../helpers';
import { IRequestRPC, IResponseRPC } from '../interfaces';

describe('getGatewayState', () => {
  it('it should return empty string if server did not send the gateway state in the request', () => {
    const msg: IRequestRPC = {
      id: '',
      method: '',
      params: '',
    };

    const state = getGatewayState(msg);
    expect(state).toBeFalsy();
  });
  it('it should return empty string if server did not send the gateway state in the response', () => {
    const msg: IResponseRPC = {
      id: '',
      result: {
        params: {},
      },
    };

    const state = getGatewayState(msg);
    expect(state).toBeFalsy();
  });

  it('it should return REGED in request', () => {
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

  it('it should return REGED in response', () => {
    const msg: IResponseRPC = {
      id: '',
      result: {
        params: { state: 'REGED' },
      },
    };

    const state = getGatewayState(msg);
    expect(state).toEqual(msg.result.params.state);
  });

  it('it should return TRYING in response', () => {
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
