import { destructResponse } from '../../util/helpers'

export const mockResponse = jest.fn((): { result: {}, error?: string } => ({ result: { message: 'fake' } }))

export const mockSendRawText = jest.fn((str: string) => {})

export const mockSend = jest.fn((bladeObj: any) => {
  const { request } = bladeObj
  return new Promise((resolve, reject) => {
    if (!request.hasOwnProperty('result')) {
      const response = mockResponse()
      const { result, error } = destructResponse(response)
      return error ? reject(error) : resolve(result)
    } else {
      resolve()
    }
  })
})

export const mockClose = jest.fn()
export const mockConnect = jest.fn()

export const connected = jest.fn().mockReturnValue(true)
export const isAlive = jest.fn().mockReturnValue(true)

const mock = jest.fn().mockImplementation(() => {
  const mocked = {
    sendRawText: mockSendRawText,
    send: mockSend,
    close: mockClose,
    connect: mockConnect,
  }
  Object.defineProperty(mocked, 'connected', {
    get: () => connected()
  })
  Object.defineProperty(mocked, 'isAlive', {
    get: () => isAlive()
  })
  return mocked
})

export default mock
