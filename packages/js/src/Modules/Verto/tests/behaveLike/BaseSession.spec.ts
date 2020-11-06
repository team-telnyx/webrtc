import { isQueued } from '../../services/Handler';
import BaseSession from '../../BaseSession';
const Connection = require('../../services/Connection');

describe('BaseSession', () => {
  it('should be true', () => {
    expect(true).toEqual(true);
  });
});
export default (instance: any) => {
  describe('Inherit BaseClass', () => {
    beforeEach(() => {
      instance._idle = false;
      instance._executeQueue = [];
      instance.subscriptions = {};
      Connection.mockSend.mockClear();
      Connection.mockSendRawText.mockClear();
    });

    describe('public methods', () => {
      describe('execute', () => {
        const payload = { request: { fake: 'data' } };

        it('should send the message through the socket if the connection is live', async (done) => {
          const response = await instance.execute(payload);
          expect(Connection.mockSend).toHaveBeenLastCalledWith(payload);
          expect(response).toEqual({ message: 'fake' });
          done();
        });

        it('should queue the message if the connection went down', async (done) => {
          await instance.disconnect();
          instance.execute(payload).then((response) => {
            expect(instance.connected).toEqual(true);
            expect(response).toEqual({ message: 'fake' });
            done();
          });
          expect(Connection.mockSend).not.toHaveBeenCalled();
          expect(instance._executeQueue).toHaveLength(1);
          await instance.connect();
          instance._idle = false;
          instance._emptyExecuteQueues();
        });

        it('should queue the message if the connection is idle', async (done) => {
          instance._idle = true;
          instance.execute(payload).then((response) => {
            expect(response).toEqual({ message: 'fake' });
            done();
          });
          expect(Connection.mockSend).not.toHaveBeenCalled();
          expect(instance._executeQueue).toHaveLength(1);
          /** Reproduce/Mock a reconnection to validate the execute Promise */
          await instance.connect();
          instance._idle = false;
          instance._emptyExecuteQueues();
        });
      });

      describe('executeRaw', () => {
        const payload = '#TEST';
        it('should send the message through the socket if the connection is live', async (done) => {
          await instance.connect();
          instance.executeRaw(payload);
          expect(Connection.mockSendRawText).toHaveBeenLastCalledWith(payload);
          done();
        });

        it('should NOT send the message through the socket if the connection is idle', () => {
          instance._idle = true;
          instance.executeRaw(payload);
          expect(Connection.mockSendRawText).not.toHaveBeenCalled();
          expect(instance._executeQueue).toHaveLength(1);
          expect(instance._executeQueue[0].msg).toEqual(payload);
        });
      });

      describe('on', () => {});
      describe('off', () => {});
      describe('subscribe', () => {});
      describe('unsubscribe', () => {});
      describe('broadcast', () => {});

      describe('.disconnect()', () => {
        it('should close the connection', async (done) => {
          await instance.disconnect();
          expect(Connection.mockClose).toHaveBeenCalled();
          expect(instance.calls || {}).toMatchObject({});
          expect(instance.subscriptions).toMatchObject({});
          expect(instance.contexts).toMatchObject([]);
          done();
        });
      });
    });

    describe('protected methods', () => {
      const _assignSubscriptions = () => {
        beforeEach(() => {
          instance.subscriptions = { proto1: { channel1: {}, channel2: {} } };
        });
      };
      describe('_removeSubscription()', () => {
        _assignSubscriptions.call(this);

        it('should remove a subscription by protocol', () => {
          instance._removeSubscription('proto1');
          expect(instance.subscriptions).toEqual({});
        });

        it('should remove a subscription by protocol and channel', () => {
          instance._removeSubscription('proto1', 'channel1');
          expect(instance.subscriptions).toEqual({ proto1: { channel2: {} } });
        });

        it('should do nothing if no subscriptions exists for that protocol-channel', () => {
          instance._removeSubscription('proto3');
          instance._removeSubscription('proto4', 'channel-fake');
          expect(instance.subscriptions).toEqual({
            proto1: { channel1: {}, channel2: {} },
          });
        });
      });

      describe('_addSubscription()', () => {
        it('should add a subscription by protocol and channel', () => {
          instance._addSubscription('proto1', null, 'channel1');
          expect(instance.subscriptions).toEqual({ proto1: { channel1: {} } });
        });

        it('should do nothing if subscription already exists for that protocol-channel', () => {
          instance.subscriptions = { proto1: { channel1: { fake: 'data' } } };
          instance._addSubscription('proto1', null, 'channel1');
          expect(instance.subscriptions['proto1']['channel1']).toEqual({
            fake: 'data',
          });
        });
      });

      describe('_existsSubscription()', () => {
        _assignSubscriptions.call(this);
        it('should check just by protocol', () => {
          expect(instance._existsSubscription('proto1')).toEqual(true);
          expect(instance._existsSubscription('proto2')).toEqual(false);
        });

        it('should check by protocol and channel', () => {
          expect(instance._existsSubscription('proto1', 'channel1')).toEqual(
            true
          );
          expect(instance._existsSubscription('proto1', 'channel3')).toEqual(
            false
          );
        });
      });

      describe('_onSocketOpen()', () => {});
      describe('_onSocketClose()', () => {});
      describe('_onSocketError()', () => {});
      describe('_onSocketMessage()', () => {});
    });

    describe('private methods', () => {
      // TODO: implement all these specs
      describe('_attachListeners()', () => {});
      describe('_detachListeners()', () => {});

      describe('_emptyExecuteQueues()', () => {});
    });

    describe('static methods', () => {
      const mockFn = jest.fn();

      it('.on() should add a listener into the internal queue', () => {
        BaseSession.on('event', mockFn);
        expect(isQueued('event')).toEqual(true);
      });

      it('.off() should remove a listener from the internal queue', () => {
        BaseSession.off('event');
        expect(isQueued('event')).toEqual(false);
      });
    });
  });
};
