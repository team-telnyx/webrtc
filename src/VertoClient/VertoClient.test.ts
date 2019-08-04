import VertoClient from './VertoClient';

// Create an element for the call
document.body.innerHTML = '<audio id="rtc-container"></audio>';

// Stub missing browser APIs
Object.defineProperty((global as any).navigator, 'mediaDevices', {
  get() {
    return {
      enumerateDevices() {
        return Promise.resolve([]);
      },

      getUserMedia() {
        return Promise.resolve({
          getTracks() {
            return [];
          },
        });
      },
    };
  },
  configurable: true,
});

describe('VertoClient', () => {
  const client = new VertoClient({
    credentials: {
      username: 'username',
      password: 'password',
    },
    remoteElement: '#rtc-container',
    useMic: true,
    useSpeaker: true,
    useCamera: false,
  });

  it('constructs and assigns properties', () => {
    expect(client.credentials.username).toBe('username');
    expect(client.credentials.password).toBe('password');
    expect(client.remoteElement).toBeInstanceOf(HTMLAudioElement);
    expect(client.verto).not.toBeNull();
    expect(client.useMic).toBe(true);
    expect(client.useSpeaker).toBe(true);
    expect(client.useCamera).toBe(false);
  });

  /**
   * Any test that connects over WS needs to disconnect in order to finish running the test.
   */
  it('connects, disconnects, and fires events', (done) => {
    const events = [];
    const fireEvent = () => events.push(true);

    client
      .on('socket.connect', fireEvent)
      .on('unregistered', fireEvent)
      .on('registered', () => {
        fireEvent();
        client.disconnect();
      })
      .on('socket.close', () => {
        fireEvent();
        expect(events.length).toBe(4);
        done();
      });

    client.connect();
  });

  /**
   * @TODO This doesn't establish RTCPeerConnection as it's not available in jsdom.
   * However, it should still initiate a call with verto and call commands.
   */
  it('can make a call', (done) => {
    let didHangUp = false;
    const makeCall = () => {
      client.newCall({
        destination: '18004377950',
        callerName: 'Your Name',
        callerNumber: '12014487079‬',
      });
    };

    client.connect();

    client
      .on('registered', makeCall)
      .on('callUpdate', (call) => {
        if (call.state === 'new' && !didHangUp) {
          call.hangup();
          didHangUp = true;
        }

        if (call.state === 'done') {
          client.disconnect();
        }
      })
      .on('socket.close', done);
  });
});
