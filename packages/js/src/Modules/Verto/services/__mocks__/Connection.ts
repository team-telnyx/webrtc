import { destructResponse } from '../../util/helpers';

export const mockResponse = jest.fn((): { result: object; error?: string } => ({
  result: { message: 'fake' },
}));

export const mockSendRawText = jest.fn();
export const mockSend = jest.fn(
  (bladeObj: { request: Record<string, unknown> }) => {
    const { request } = bladeObj;
    return new Promise((resolve, reject) => {
      if (!request.hasOwnProperty('result')) {
        const response = mockResponse();
        const { result, error } = destructResponse(response);
        return error ? reject(error) : resolve(result);
      } else {
        resolve('');
      }
    });
  }
);

export const mockClose = jest.fn();
export const mockConnect = jest.fn();
export const mockSetRegion = jest.fn();

export const connected = jest.fn().mockReturnValue(true);
export const isAlive = jest.fn().mockReturnValue(true);

let mockHostValue = 'wss://rtc.telnyx.com';
export const mockHost = jest.fn().mockImplementation(() => mockHostValue);
export const setMockHost = (h: string) => {
  mockHostValue = h;
};

const mock = jest.fn().mockImplementation(() => {
  const mocked = {
    sendRawText: mockSendRawText,
    send: mockSend,
    close: mockClose,
    connect: mockConnect,
    setRegion: mockSetRegion,
  };
  Object.defineProperty(mocked, 'connected', {
    get: () => connected(),
  });
  Object.defineProperty(mocked, 'isAlive', {
    get: () => isAlive(),
  });
  Object.defineProperty(mocked, 'host', {
    get: () => mockHost(),
    set: (val: string) => {
      mockHostValue = val;
    },
    configurable: true,
  });
  return mocked;
});

export default mock;
