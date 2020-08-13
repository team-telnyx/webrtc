import BaseMessage from '../BaseMessage'
import { IBladeConnectRequest } from '../../util/interfaces'

const major = 2
const minor = 1
const revision = 0

let agent: string = null
const setAgentName = (name: string) => {
  agent = name
}

class Connect extends BaseMessage {
  method: string = 'blade.connect'

  constructor(authentication: IBladeConnectRequest['params']['authentication'], sessionid?: string) {
    super()

    const params: IBladeConnectRequest['params'] = {
      version: { major, minor, revision },
      authentication: authentication
    }
    if (sessionid) {
      params.sessionid = sessionid
    }
    if (agent) {
      params.agent = agent
    }
    this.buildRequest({ method: this.method, params })
  }
}

export { Connect, setAgentName }
