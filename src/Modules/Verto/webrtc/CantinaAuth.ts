import { ICantinaAuthParams, ICantinaUser } from './interfaces'
import logger from '../util/logger'

type RefreshResponse = { project: string, jwt_token: string }
type CheckInviteTokenResponse = { valid: boolean, name: string, config: object }

const FETCH_OPTIONS: RequestInit = {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
}

class CantinaAuth {
  public baseUrl = 'https://cantina-backend.signalwire.com' // TODO: change me
  public hostname: string

  constructor(private params: ICantinaAuthParams = {}) {
    const { hostname = location.hostname } = params
    this.hostname = hostname
  }

  private _fetch = (url: RequestInfo, options: RequestInit) => {
    return fetch(url, options).then(async (response: Response) => {
      const payload = await response.json()
      if (response.status >= 200 && response.status < 300) {
        return payload
      } else {
        const errorMessage = `HTTP Request failed with status ${response.status}`
        const error = new Error(errorMessage)
        // @ts-ignore
        error.payload = payload
        return Promise.reject(error)
      }
    })
  }

  async userLogin(username: string, password: string): Promise<ICantinaUser> {
    const response = await this._fetch(`${this.baseUrl}/login/user`, {
      ...FETCH_OPTIONS,
      body: JSON.stringify({ username, password, hostname: this.hostname })
    })
    logger.info('userLogin response', response)
    return response
  }

  async guestLogin(name: string, email: string, token: string): Promise<ICantinaUser> {
    const response = await this._fetch(`${this.baseUrl}/login/guest`, {
      ...FETCH_OPTIONS,
      body: JSON.stringify({ name, email, token, hostname: this.hostname })
    })
    logger.info('guestLogin response', response)
    return response
  }

  async refresh(): Promise<RefreshResponse> {
    const response = await this._fetch(`${this.baseUrl}/refresh`, {
      ...FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify({ hostname: this.hostname })
    })
    logger.info('refresh response', response)
    return response
  }

  async checkInviteToken(token: string): Promise<CheckInviteTokenResponse> {
    const response = await this._fetch(`${this.baseUrl}/check-token`, {
      ...FETCH_OPTIONS,
      body: JSON.stringify({ token, hostname: this.hostname })
    })
    logger.info('checkInviteToken response', response)
    return response
  }
}

export default CantinaAuth
