import BaseMessage from '../BaseMessage'

class Reauthenticate extends BaseMessage {
  method: string = 'blade.reauthenticate'

  constructor(project: string, jwt_token: string, sessionid: string) {
    super()

    const params = { sessionid, authentication: { project, jwt_token } }
    this.buildRequest({ method: this.method, params })
  }
}

export { Reauthenticate }
