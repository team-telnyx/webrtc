import CantinaAuth from '../../src/Modules/Verto/webrtc/CantinaAuth'

declare var global: any;

const mockFetchSuccess = (data: object) => {
  return jest.fn().mockImplementationOnce(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => data
  }))
}

const mockFetchFailure = (error: object) => {
  return jest.fn().mockImplementationOnce(() => Promise.resolve({
    ok: false,
    status: 422,
    json: () => error
  }))
}

const DEFAULT_FETCH_OPTIONS = {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
}

describe('CantinaAuth', () => {
  const hostname = 'jest.relay.com'
  const errorResponse = {
    errors: [{ detail: 'Unauthorized', code: '401' }]
  }

  let auth: CantinaAuth = null
  beforeEach(() => {
    auth = new CantinaAuth({ hostname })
  })

  it('should default the hostname from global location if not provided', () => {
    const authDef = new CantinaAuth()
    expect(authDef.hostname).toEqual('localhost')

    const authCustom = new CantinaAuth({ hostname })
    expect(authCustom.hostname).toEqual(hostname)

  })

  describe('userLogin', () => {
    it('should expose userLogin to get jwt for a user', async () => {
      global.fetch = mockFetchSuccess({ jwt_token: 'user-jwt', scopes: ['scope1', 'scope2'] })
      const response = await auth.userLogin('username', 'password')

      expect(response.jwt_token).toEqual('user-jwt')
      expect(response.scopes).toEqual(['scope1', 'scope2'])
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(`${auth.baseUrl}/login/user`, {
        ...DEFAULT_FETCH_OPTIONS,
        body: '{"username":"username","password":"password","hostname":"jest.relay.com"}'
      })
    })

    it('should return the error if fetch failed', async () => {
      global.fetch = mockFetchFailure(errorResponse)

      expect.assertions(2)
      await expect(auth.userLogin('username', 'password')).rejects.toEqual(expect.any(Error))
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('guestLogin', () => {
    it('should expose guestLogin to get jwt for a guest', async () => {
      global.fetch = mockFetchSuccess({ jwt_token: 'guest-jwt', scopes: ['scope3'] })

      const response = await auth.guestLogin('name', 'email', 'uuid')
      expect(response.jwt_token).toEqual('guest-jwt')
      expect(response.scopes).toEqual(['scope3'])
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(`${auth.baseUrl}/login/guest`, {
        ...DEFAULT_FETCH_OPTIONS,
        body: '{"name":"name","email":"email","token":"uuid","hostname":"jest.relay.com"}'
      })
    })

    it('should return the error if fetch failed', async () => {
      global.fetch = mockFetchFailure(errorResponse)

      expect.assertions(2)
      await expect(auth.guestLogin('name', 'email', 'uuid')).rejects.toEqual(expect.any(Error))
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('refresh', () => {
    it('should request to refresh the JWT', async () => {
      global.fetch = mockFetchSuccess({ project: 'project', jwt_token: 'new-jwt' })

      const response = await auth.refresh()

      expect(response.project).toEqual('project')
      expect(response.jwt_token).toEqual('new-jwt')
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(`${auth.baseUrl}/refresh`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'PUT',
        body: '{"hostname":"jest.relay.com"}'
      })
    })

    it('should return the error if fetch failed', async () => {
      global.fetch = mockFetchFailure(errorResponse)

      expect.assertions(2)
      await expect(auth.refresh()).rejects.toEqual(expect.any(Error))
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('checkInviteToken', () => {
    it('should expose checkInviteToken to validate an invite-token from URL', async () => {
      global.fetch = mockFetchSuccess({ valid: true, name: 'room name', config: {} })

      const response = await auth.checkInviteToken('uuid')

      expect(response.valid).toEqual(true)
      expect(response.name).toEqual('room name')
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(`${auth.baseUrl}/check-token`, {
        ...DEFAULT_FETCH_OPTIONS,
        body: '{"token":"uuid","hostname":"jest.relay.com"}'
      })
    })

    it('should return the error if fetch failed', async () => {
      global.fetch = mockFetchFailure(errorResponse)

      expect.assertions(2)
      await expect(auth.checkInviteToken('uuid')).rejects.toEqual(expect.any(Error))
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
